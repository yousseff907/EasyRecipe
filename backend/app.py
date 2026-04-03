from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from services.video_audio_downloader import *
from services.audio_extractor import extract_transcript
import os
import secrets
from utils.validators import *
from utils.database import *
from datetime import datetime
from services.ai_processor import analyze_with_ai, build_ai_recipe
from services.email_service import send_email
from services.auth_service import create_authentificator
from utils import jwt_helper
import json
from utils.auth import get_current_user

from fastapi.middleware.cors import CORSMiddleware  # ← ADD THIS

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

class LoginRequest(BaseModel):
	email: str

class VerificationCode(BaseModel):
	otp: str
	email: str

@app.post("/api/extract")
def	extract_recipe(request: VideoRequest, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	try:
		url = request.url
		instructions = request.instructions
		validate_video_url(url)
		audio_path = download_audio(url)
		try:
			caption = get_caption(url)
		except:
			caption = ""
		transcript = extract_transcript(audio_path)
		video_path = download_video(url)
		recipe_dictionary = analyze_with_ai(transcript, caption, video_path, instructions)
		if os.path.exists(audio_path):
			os.remove(audio_path)
		if os.path.exists(video_path):
			os.remove(video_path)

		if recipe_dictionary == None:
			raise HTTPException(status_code=400, detail="Video content is not a recipe or is inappropriate")

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
				"recipe": recipe_dictionary}

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.get("/api/recipes/{recipe_id}/download-video")
def download_video_endpoint(recipe_id : int, background_task: BackgroundTasks, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	video_path = None
	recipe = db.query(Recipe).filter(Recipe.user_id == current_user.id, Recipe.id == recipe_id).first()
	if not recipe:
		raise HTTPException(status_code=404, detail="Recipe not found")
	else:
		url = recipe.video_url
	try:
		video_path = download_video(url)
		background_task.add_task(delete_file, video_path)

		return FileResponse(path=video_path, media_type="video/mp4", filename="recipe_video.mp4", background=background_task)

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/auth/request-code")
def	login(request: LoginRequest, db = Depends(get_db)):
	try:
		email = request.email
		code = str(secrets.randbelow(1000000)).zfill(6)
		verification = create_authentificator(db, code, email)
		send_email(email, code)
		return {"message": "Code sent"}
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/auth/submit-code")
def	verify(request: VerificationCode, db = Depends(get_db)):
	try:
		db.query(Verification).filter(Verification.email == request.email, Verification.expires_at < datetime.now()).delete()
		db.commit()
		otp = request.otp
		verification = db.query(Verification).filter(
			Verification.email == request.email,
			Verification.code == otp,
			Verification.used == False
		).first()

		if not verification:
			raise HTTPException(status_code=400, detail="Invalid code")
		if verification.expires_at < datetime.now():
			raise HTTPException(status_code=400, detail="Code expired")

		else:
			verification.used = True
			db.commit()
			db.refresh(verification)
			user = db.query(User).filter(User.email == request.email).first()
			if not user:
				user = User(email = request.email)
				db.add(user)
				db.commit()
				db.refresh(user)
			token = jwt_helper.create_jwt_token(user.id, user.email)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
	return {"status" : "success", "token" : token}

@app.get("/api/recipes")
def get_recipes(current_user : User = Depends(get_current_user), db = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.user_id == current_user.id).all()
	if not recipe:
		raise HTTPException(status_code=404, detail="Recipe not found")
	recipe_list = []
	for r in recipe:
		recipe_list.append({"id" : r.id, "title" : r.title})
	return {"recipes" : recipe_list}

@app.get("/api/recipes/{id}")
def get_single_recipe(id : int, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.user_id == current_user.id).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
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
		"created_at": recipe.created_at
		}

@app.delete("/api/recipes/{id}")
def delete_recipe(id : int, current_user : User = Depends(get_current_user), db = Depends(get_db)):
	recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.user_id == current_user.id).first()
	if recipe is None:
		raise HTTPException(status_code=404, detail="Recipe not found")
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
	serving_size : int | None = None
	nutrition : NutritionInput | None = None

@app.post("/api/make_your_own")
def make_your_own(self_made : SelfMadeRecipe, current_user : User = Depends(get_current_user), db : Session = Depends(get_db)):
	try:
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
				"recipe": recipe_dictionary}

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")