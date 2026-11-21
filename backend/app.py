from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from services.video_audio_downloader import *
from services.audio_extractor import extract_transcript
import os
import re
import secrets
from utils.validators import *
from utils.database import *
from datetime import datetime, date
from services.ai_processor import analyze_video_with_ai, build_ai_recipe, analyze_slideshow_with_ai
from services.email_service import send_email
from services.auth_service import create_authentificator
from utils import jwt_helper
import json
from utils.auth import get_current_user
from services.moderation_service import moderate_content
from fastapi.middleware.cors import CORSMiddleware  # ← ADD THIS
import httpx
from config import TURNSTILE_SECRET_KEY, GOOGLE_CLIENT_ID
from fastapi.templating import Jinja2Templates
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from weasyprint import HTML

# Usernames end up in URLs and HTML, so only allow a safe set of characters.
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.]{3,30}$")

def generate_username(db, email: str) -> str:
	base = re.sub(r"[^A-Za-z0-9_.]", "", email.split('@')[0])[:20]
	if len(base) < 3:
		base = "user"
	username = base
	while db.query(User).filter(User.username == username).first():
		username = base + str(secrets.randbelow(100000))
	return username

def	delete_file(path: str):
	try:
		os.remove(path)
	except FileNotFoundError:
		pass

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

class VideoRequest(BaseModel):
	url: str
	instructions: str = Field(default="", max_length=300)

class VerificationCode(BaseModel):
	otp: str
	email: str

@app.post("/api/extract")
def	extract_recipe(request: VideoRequest, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	try:
		url = request.url
		instructions = request.instructions
		validate_video_url(url)
		url = resolve_short_link(url)
		try:
			caption = get_caption(url)
		except:
			caption = ""
		recipe_dictionary = dict()
		if '/photo/' in url:
			slideshow_data = get_slideshow_data(url)
			photo_paths = download_slideshow_images(slideshow_data.get("images"))
			recipe_dictionary = analyze_slideshow_with_ai(f"caption: {slideshow_data.get('caption')}, by: {slideshow_data.get('author')}", photo_paths, instructions)
			for photo_path in photo_paths:
				if os.path.exists(photo_path):
					os.remove(photo_path)
		else:
			video_path = download_video(url)
			transcript = extract_transcript(video_path)
			recipe_dictionary = analyze_video_with_ai(transcript, caption, video_path, instructions)

			if os.path.exists(video_path):
				os.remove(video_path)

		if recipe_dictionary == None:
			raise HTTPException(status_code=400, detail="Video content is not a recipe or is inappropriate")

		unsafe_content = moderate_content(title=recipe_dictionary.get("title"),
										ingredients = recipe_dictionary.get("ingredients", []),
										steps = recipe_dictionary.get("steps", []))
		if unsafe_content == True:
			raise HTTPException(status_code=400, detail=(f"Recipe content violates our community guidelines. "
								f"Please review and remove inappropriate content"))

		recipe = Recipe(user_id = current_user.id,
						video_url = url,
						title = recipe_dictionary.get("title"), ingredients = json.dumps(recipe_dictionary.get("ingredients")),
						steps = json.dumps(recipe_dictionary.get("steps")),
						prep_time = recipe_dictionary.get("prep_time"),
						cook_time = recipe_dictionary.get("cook_time"),
						servings = recipe_dictionary.get("servings"),
						serving_size = recipe_dictionary.get("serving size"),
						nutrition = json.dumps(recipe_dictionary.get("nutrition_per_serving")))
		db.add(recipe)
		db.commit()
		db.refresh(recipe)
		print(recipe_dictionary)
		return {"status": "success",
				"recipe": recipe_dictionary,
				"recipe_id": recipe.id}

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.get("/api/recipes/{recipe_id}/download-video")
def download_video_endpoint(recipe_id : int, background_task: BackgroundTasks, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	video_path = None
	recipe = db.query(Recipe).filter(Recipe.id == recipe_id, or_(Recipe.user_id == current_user.id, Recipe.is_public == True)).first()
	if not recipe:
		raise HTTPException(status_code=404, detail="Recipe not found")
	else:
		url = recipe.video_url
		if '/photo/' in url or not url:
			raise HTTPException(status_code=400, detail="Video download not available for photo slideshows")
	try:
		# Re-check stored URLs: older rows were saved under a weaker check.
		validate_video_url(url)
		url = resolve_short_link(url)
		video_path = download_video(url)
		background_task.add_task(delete_file, video_path)

		return FileResponse(path=video_path, media_type="video/mp4", filename="recipe_video.mp4", background=background_task)

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


class LoginRequest(BaseModel):
	email: str
	turnstile_token : str

@app.post("/api/auth/request-code")
async def	login(body: LoginRequest, request : Request, db : Session = Depends(get_db)):
	user_ip = request.headers.get("CF-Connecting-IP")
	async with httpx.AsyncClient() as client:
		response = await client.post(
					'https://challenges.cloudflare.com/turnstile/v0/siteverify',
					data={'secret' : TURNSTILE_SECRET_KEY,
					'response' : body.turnstile_token,
					'remoteip' : user_ip
						}
					)
	result = response.json()
	if not result.get('success'):
		raise HTTPException(status_code=400, detail="CAPTCHA verification failed")
	try:
		rate_limit = db.query(EmailRateLimit).filter(EmailRateLimit.email == body.email).first()
		if rate_limit is None:
			rate_limit = EmailRateLimit(email = body.email)
			db.add(rate_limit)
			db.commit()
			db.refresh(rate_limit)
		old_verification = db.query(Verification).filter(Verification.email == body.email, Verification.used == False, Verification.expires_at > datetime.now()).first()
		if old_verification != None and old_verification.attempts >= 5:
			return {"message" : "Too many attempts. Please wait for your code to expire and request a new one."}
		elif old_verification != None and old_verification.attempts < 5:
			return {"message" : "A code was already sent to your email. Please check your inbox."}
		if rate_limit.last_code_date.date() != date.today():
			rate_limit.sent_emails = 0
		if rate_limit.sent_emails >= 3:
			return {"message" : "You have reached the daily limit of 3 codes. Please try again tomorrow."}
		rate_limit.sent_emails += 1
		rate_limit.last_code_date = datetime.now()
		db.commit()
		db.refresh(rate_limit)
		code = str(secrets.randbelow(1000000)).zfill(6)
		verification = create_authentificator(db, code, body.email)
		send_email(body.email, code)
		return {"message": "Code sent"}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/auth/submit-code")
def	verify(request: VerificationCode, db : Session = Depends(get_db)):
	try:

		db.query(Verification).filter(Verification.email == request.email, Verification.expires_at < datetime.now()).delete()
		db.commit()

		active_code = db.query(Verification).filter(Verification.email == request.email, Verification.used == False).first()
		if active_code is None:
			raise HTTPException(status_code=400, detail="No active code found. Please request a new one.")
		if active_code.attempts >= 5:
			return {"message" : "Too many attempts. Please wait for your code to expire and request a new one."}
		otp = request.otp
		verification = db.query(Verification).filter(
			Verification.email == request.email,
			Verification.code == otp,
			Verification.used == False
		).first()

		if not verification:
			active_code.attempts += 1
			db.commit()
			db.refresh(active_code)
			raise HTTPException(status_code=400, detail="Invalid code")
		if verification.expires_at < datetime.now():
			db.delete(verification)
			db.commit()
			raise HTTPException(status_code=400, detail="Code expired")

		else:
			verification.used = True
			db.commit()
			db.refresh(verification)
			user = db.query(User).filter(User.email == request.email).first()
			if not user:
				user = User(email = request.email, username = generate_username(db, request.email))
				db.add(user)
				db.commit()
				db.refresh(user)
			token = jwt_helper.create_jwt_token(user.id, user.email)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
	return {"status" : "success", "token" : token}

@app.get("/api/recipes")
def get_recipes(current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.user_id == current_user.id).order_by(Recipe.created_at.desc()).all()
	recipe_list = []
	for r in recipe:
		recipe_list.append({"id" : r.id, "title" : r.title, "is_public" : r.is_public, "created_at": r.created_at, "owner_username": current_user.username})
	return {"recipes" : recipe_list}

@app.get("/api/recipes/favorites")
def get_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
	recipe_list = []
	result = db.query(Recipe, User).join(UserFavorites, UserFavorites.recipe_id == Recipe.id).join(User, User.id == Recipe.user_id).filter(UserFavorites.user_id == current_user.id).order_by(UserFavorites.saved_at.desc()).all()
	for r, owner in result:
		recipe_list.append({"id": r.id, "title": r.title, "is_public": r.is_public, "created_at": r.created_at, "owner_username": owner.username})
	return {"recipes": recipe_list}

@app.get("/api/recipes/{id}")
def get_single_recipe(id : int, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == id, or_(Recipe.is_public == True, Recipe.user_id == current_user.id)).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	is_favorited = db.query(UserFavorites).filter(UserFavorites.user_id == current_user.id, UserFavorites.recipe_id == id).first() is not None
	owner = db.query(User).filter(User.id == recipe.user_id).first()
	return {
		"id": recipe.id,
		"title": recipe.title,
		"ingredients": json.loads(recipe.ingredients),
		"steps": json.loads(recipe.steps),
		"prep_time": recipe.prep_time,
		"cook_time": recipe.cook_time,
		"servings": recipe.servings,
		"nutrition_per_serving": json.loads(recipe.nutrition) if recipe.nutrition else None,
		"video_url": recipe.video_url,
		"created_at": recipe.created_at,
		"is_public" : recipe.is_public,
		"owner_id" : recipe.user_id,
		"current_user_id" : current_user.id,
		"is_favorited" : is_favorited,
		"serving_size": recipe.serving_size,
		"owner_username": owner.username if owner else "unknown"
		}

@app.delete("/api/recipes/{id}")
def delete_recipe(id : int, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == id).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	if recipe.user_id != current_user.id:
		raise HTTPException(status_code=403, detail="You do not have permissions")
	db.delete(recipe)
	db.commit()
	return {"message": "Recipe deleted successfully"}


class NutritionInput(BaseModel):
	calories: int
	protein_g: int | None = None
	carbs_g: int | None = None
	fat_g: int | None = None

class SelfMadeRecipe(BaseModel):
	title : str
	ingredients : list[str] = Field(max_length=100)
	steps : list[str] = Field(max_length=50)
	prep_time : int | None = None
	cook_time : int | None = None
	servings : int | None = None
	serving_size : str | None = None
	nutrition : NutritionInput | None = None

@app.post("/api/make_your_own")
def make_your_own(self_made : SelfMadeRecipe, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	try:
		unsafe_content = moderate_content(title=self_made.title,
										ingredients = self_made.ingredients,
										steps = self_made.steps)
		if unsafe_content == True:
			raise HTTPException(status_code=400, detail=(f"Recipe content violates our community guidelines. "
								f"Please review and remove inappropriate content"))
		recipe = Recipe(user_id = current_user.id,
						video_url = "",
						title = self_made.title,
						ingredients = json.dumps(self_made.ingredients),
						steps = json.dumps(self_made.steps),
						prep_time = self_made.prep_time,
						cook_time = self_made.cook_time,
						servings = self_made.servings,
						serving_size = self_made.serving_size,
						nutrition=json.dumps(self_made.nutrition.model_dump()) if self_made.nutrition else None
						)
		db.add(recipe)
		db.commit()
		db.refresh(recipe)
		return {"status": "success", "recipe_id": recipe.id}
	except Exception as e:
		db.rollback()
		raise HTTPException(status_code=500, detail=f"Failed to create recipe: {str(e)}")


class AIRecipe(BaseModel):
	ingredients : list[str] = Field(max_length=100)
	instructions : str

@app.post("/api/make_your_own_with_ai")
def make_your_own_with_ai(request : AIRecipe, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	try:
		recipe_dictionary = build_ai_recipe(request.instructions, request.ingredients)
		if recipe_dictionary == None:
			raise HTTPException(status_code=400, detail="Video content is not a recipe or is inappropriate")

		unsafe_content = moderate_content(title=recipe_dictionary.get("title"),
										ingredients = recipe_dictionary.get("ingredients", []),
										steps = recipe_dictionary.get("steps", []))
		if unsafe_content == True:
			raise HTTPException(status_code=400, detail=(f"Recipe content violates our community guidelines. "
								f"Please review and remove inappropriate content"))

		recipe = Recipe(user_id = current_user.id,
						video_url = "",
						title = recipe_dictionary.get("title"),
						ingredients = json.dumps(recipe_dictionary.get("ingredients")),
						steps = json.dumps(recipe_dictionary.get("steps")),
						prep_time = recipe_dictionary.get("prep_time"),
						cook_time = recipe_dictionary.get("cook_time"),
						servings = recipe_dictionary.get("servings"),
						serving_size = recipe_dictionary.get("serving size"),
						nutrition = json.dumps(recipe_dictionary.get("nutrition_per_serving")))
		db.add(recipe)
		db.commit()
		db.refresh(recipe)
		print(recipe_dictionary)
		return {"status": "success",
				"recipe": recipe_dictionary,
				"recipe_id": recipe.id}

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


class Feedback(BaseModel):
	feedback : str = Field(max_length=500)

@app.delete("/api/delete_account")
def delete_account(request : Feedback, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	try:
		unsafe_feedback = moderate_content(addon=request.feedback)
		if unsafe_feedback == True:
			raise HTTPException(status_code=400, detail=(f"Feedback content violates our community guidelines. "
								f"Please review and remove inappropriate content"))

		with open("feedback.txt", '+a') as f:
			f.write(request.feedback+'\n')
		db.query(Recipe).filter(Recipe.user_id == current_user.id).delete()
		db.query(UserFavorites).filter(UserFavorites.user_id == current_user.id).delete()
		db.delete(current_user)
		db.commit()
		return {"message": "Account deleted successfully"}
	except Exception as e:
		raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/user/me")
def get_current_user_info(current_user: User = Depends(get_current_user), db : Session = Depends(get_db)):
	return {
		"id": current_user.id,
		"email": current_user.email,
		"username": current_user.username,
		"bio": current_user.bio,
		"public_recipe_count" : db.query(Recipe).filter(Recipe.user_id == current_user.id, Recipe.is_public == True).count()
	}


class Username(BaseModel):
	string : str = Field(max_length=30)

@app.post("/api/change_username")
def change_username(request : Username, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	if not USERNAME_PATTERN.fullmatch(request.string):
		raise HTTPException(status_code=400, detail="Username must be 3-30 characters: letters, numbers, underscores and dots only")
	unsafe_username = moderate_content(addon=request.string)
	if unsafe_username == True:
		raise HTTPException(status_code=400, detail=(f"Username content violates our community guidelines. "
										f"Please review and remove inappropriate content"))
	existing = db.query(User).filter(User.username == request.string).first()
	if existing:
		raise HTTPException(status_code=400, detail="Username already taken")
	current_user.username = request.string
	db.commit()
	db.refresh(current_user)
	return {"message": "success"}


class Bio(BaseModel):
	string : str = Field(max_length=200, default="")

@app.post("/api/change_bio")
def change_bio(request : Bio, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	unsafe_bio = moderate_content(addon=request.string)
	if unsafe_bio == True:
		raise HTTPException(status_code=400, detail=(f"Bio content violates our community guidelines. "
										f"Please review and remove inappropriate content"))
	current_user.bio = request.string
	db.commit()
	db.refresh(current_user)
	return {"message": "success"}

@app.patch("/api/recipes/{id}")
def change_recipe_status(id : int, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == id, current_user.id == Recipe.user_id).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	recipe.is_public = not recipe.is_public
	db.commit()
	db.refresh(recipe)
	return {"is_public" : recipe.is_public}

@app.post("/api/recipes/{id}/favorite")
def save_recipe_as_favorite(id : int, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	existing = db.query(UserFavorites).filter(UserFavorites.user_id == current_user.id, UserFavorites.recipe_id == id).first()
	if existing:
		raise HTTPException(status_code=400, detail="Recipe already saved")
	recipe = db.query(Recipe).filter(Recipe.id == id, or_(Recipe.user_id == current_user.id, Recipe.is_public == True)).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	user_favorite = UserFavorites(user_id = current_user.id, recipe_id = id)
	db.add(user_favorite)
	db.commit()
	db.refresh(user_favorite)
	return {"status": "success", "saved_at" : user_favorite.saved_at}

@app.delete("/api/recipes/{id}/favorite")
def unsave_recipe_from_favorite(id : int, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	user_favorite = db.query(UserFavorites).filter(UserFavorites.recipe_id == id, UserFavorites.user_id == current_user.id).first()
	if user_favorite is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	db.delete(user_favorite)
	db.commit()
	return {"message" : "Recipe removed from favorites"}

@app.get("/api/search")
def search(query: str, type: str, db : Session = Depends(get_db), _: User = Depends(get_current_user)):
	if type == "recipes":
		result = db.query(Recipe, User).join(User, User.id == Recipe.user_id).filter(Recipe.title.like(f"%{query}%"), Recipe.is_public == True).order_by(Recipe.created_at.desc()).all()
		if not result:
			return {"message" : "No matches were found."}
		recipe_list = []
		for r, owner in result:
			recipe_list.append({"id" : r.id, "title" : r.title, "is_public" : r.is_public, "created_at": r.created_at, "owner_username": owner.username if owner else "unknown"})
		return {"recipes" : recipe_list}
	
	if type == "users":
		users = db.query(User).filter(User.username.like(f"%{query}%")).all()
		if not users:
			return {"message" : "No matches were found."}
		user_list = []
		for u in users:
			user_list.append({"username" : u.username})
		return {"users" : user_list}

@app.get("/api/user/{username}")
def get_user_info(username : str, db : Session = Depends(get_db), _: User = Depends(get_current_user)):
	user = db.query(User).filter(User.username == username).first()
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	return {"id" : user.id,
			"username" : username,
			"bio" : user.bio,
			"public_recipe_count" : db.query(Recipe).filter(Recipe.user_id == user.id, Recipe.is_public == True).count()
			}

@app.get("/api/user/{username}/recipes")
def get_user_recipes(username : str, db : Session = Depends(get_db), _: User = Depends(get_current_user)):
	user = db.query(User).filter(User.username == username).first()
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	recipes = db.query(Recipe).filter(Recipe.user_id == user.id, Recipe.is_public == True).order_by(Recipe.created_at.desc()).all()
	recipe_list = []
	for r in recipes:
		recipe_list.append({"id" : r.id, "title" : r.title, "is_public" : r.is_public, "created_at": r.created_at, "owner_username": user.username})
	return {"recipes" : recipe_list}

@app.get("/api/user/{username}/recipes/{recipe_id}")
def get_user_recipe(username : str, recipe_id : int, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == recipe_id, or_(Recipe.is_public == True, Recipe.user_id == current_user.id)).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
	is_favorited = db.query(UserFavorites).filter(UserFavorites.user_id == current_user.id, UserFavorites.recipe_id == recipe_id).first() is not None
	return {
		"id": recipe.id,
		"title": recipe.title,
		"ingredients": json.loads(recipe.ingredients),
		"steps": json.loads(recipe.steps),
		"prep_time": recipe.prep_time,
		"cook_time": recipe.cook_time,
		"servings": recipe.servings,
		"nutrition_per_serving": json.loads(recipe.nutrition) if recipe.nutrition else None,
		"video_url": recipe.video_url,
		"created_at": recipe.created_at,
		"is_public" : recipe.is_public,
		"owner_id" : recipe.user_id,
		"current_user_id" : current_user.id,
		"is_favorited" : is_favorited,
		"serving_size": recipe.serving_size,
		"owner_username": username
		}


templates = Jinja2Templates(directory="templates")

@app.get("/r/{id}")
def get_public_recipe(rq : Request, id : int, db : Session = Depends(get_db)):
	try:
		recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.is_public == True).first()
		if recipe is None:
			raise HTTPException(status_code=404, detail="Recipe Not Found")
		owner = db.query(User).filter(User.id == recipe.user_id).first()
		if owner is None:
				raise HTTPException(status_code=404, detail="Recipe Not Found")
		nutrition = json.loads(recipe.nutrition) if recipe.nutrition else None
		return templates.TemplateResponse(name="recipe_public.html", request=rq, context={
			"title": recipe.title,
			"recipe_id": recipe.id,
			"owner_username": owner.username,
			"prep_time": recipe.prep_time,
			"cook_time": recipe.cook_time,
			"servings": recipe.servings,
			"serving_size": recipe.serving_size,
			"ingredients": json.loads(recipe.ingredients),
			"steps": json.loads(recipe.steps),
			"nutrition": nutrition
		})
	except HTTPException:
		raise
	except Exception:
		raise

class RecipeEdit(BaseModel):
	title: str
	ingredients: list[str]
	steps: list[str]
	prep_time: int | None = None
	cook_time: int | None = None
	servings: int | None = None
	serving_size: str | None = None
	nutrition: NutritionInput | None = None

@app.patch("/api/recipes/{id}/edit")
def edit_recipe(request : RecipeEdit, id : int, db : Session = Depends(get_db), current_user : User = Depends(get_current_user)):
	try:
		recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.user_id == current_user.id).first()
		if recipe is None:
			raise HTTPException(status_code=404, detail="Recipe Not Found")
		unsafe_content = moderate_content(title=request.title,
										ingredients = request.ingredients,
										steps = request.steps)
		if unsafe_content == True:
			raise HTTPException(status_code=400, detail=(f"Recipe content violates our community guidelines. "
								f"Please review and remove inappropriate content"))
		recipe.title = request.title
		recipe.ingredients = json.dumps(request.ingredients)
		recipe.steps = json.dumps(request.steps)
		recipe.prep_time = request.prep_time
		recipe.cook_time = request.cook_time
		recipe.servings = request.servings
		recipe.serving_size = request.serving_size
		recipe.nutrition = json.dumps(request.nutrition.model_dump()) if request.nutrition else None
		db.commit()
		db.refresh(recipe)
		return {"status" : "success"}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500)
	
@app.get("/api/feed")
def get_feed(db : Session = Depends(get_db)):
	result = db.query(Recipe, User).join(User, User.id == Recipe.user_id).filter(Recipe.is_public == True).order_by(Recipe.created_at.desc()).limit(3).all()
	recipe_list = []
	for r, owner in result:
			recipe_list.append({
				"id": r.id,
				"title": r.title,
				"prep_time": r.prep_time,
				"owner_username": owner.username
			})
	return {"recipes": recipe_list}

@app.get("/api/public/recipes")
def get_all_public_recipes(db : Session = Depends(get_db)):
	recipes = db.query(Recipe).filter(Recipe.is_public == True).all()
	recipe_list = []
	for r in recipes:
		recipe_list.append({"id" : r.id, "title" : r.title, "is_public" : r.is_public, "created_at": r.created_at, "owner_username": r.owner.username})
	return {"recipes" : recipe_list}

class GoogleAuth(BaseModel):
	token : str

@app.post("/api/auth/google")
def login_with_google(body : GoogleAuth, db : Session = Depends(get_db)):
	try:
		idinfo = id_token.verify_oauth2_token(body.token, google_requests.Request(), GOOGLE_CLIENT_ID)
		email = idinfo['email']
		user = db.query(User).filter(User.email == email).first()
		if not user:
			user = User(email = email, username = generate_username(db, email))
			db.add(user)
			db.commit()
			db.refresh(user)
		token = jwt_helper.create_jwt_token(user.id, user.email)
		return {"status": "success", "token": token}
	except Exception as e:
		raise HTTPException(status_code=400, detail="Invalid Google token")





def block_all_urls(url):
	# User text ends up in the PDF; never let WeasyPrint load files or URLs
	# (file:// could leak server files such as /proc/self/environ).
	raise ValueError(f"External resources are disabled in PDFs: {url}")

@app.get("/api/recipes/{recipe_id}/pdf")
def download_pdf(recipe_id : int, db : Session = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.is_public == True).first()
	if not recipe:
		raise HTTPException(status_code=404, detail="Recipe not found")
	owner = db.query(User).filter(User.id == recipe.user_id).first()

	html_content = templates.get_template("recipe_pdf.html").render(
		title=recipe.title,
		owner_username=owner.username if owner else "unknown",
		prep_time=recipe.prep_time,
		cook_time=recipe.cook_time,
		servings=recipe.servings,
		serving_size=recipe.serving_size,
		ingredients=json.loads(recipe.ingredients),
		steps=json.loads(recipe.steps),
		nutrition=json.loads(recipe.nutrition) if recipe.nutrition else None,
	)

	pdf = HTML(string=html_content, url_fetcher=block_all_urls).write_pdf()

	return Response(content=pdf, media_type="application/pdf", headers={
		"Content-Disposition": "attachment; filename=recipe.pdf"
	})
