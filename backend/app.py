from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from services.video_audio_downloader import *
from services.audio_extractor import extract_transcript
import os
import secrets
from utils.validators import *
from utils.database import *
from datetime import datetime
from services.ai_processor import analyze_with_ai
from services.email_service import send_email
from services.auth_service import create_authentificator

def	delete_file(path: str):
	try:
		os.remove(path)
	except FileNotFoundError:
		pass

app = FastAPI()

class VideoRequest(BaseModel):
	url: str

class LoginRequest(BaseModel):
	email: str

class VerificationCode(BaseModel):
	otp: str
	email: str

@app.post("/api/extract")
def	extract_recipe(request: VideoRequest):
	try:
		url = request.url
		validate_video_url(url)
		audio_path = download_audio(url)
		caption = get_caption(url)
		transcript = extract_transcript(audio_path)
		video_path = download_video(url)
		recipe_dictionary = analyze_with_ai(transcript, caption, video_path)
		if os.path.exists(audio_path):
			os.remove(audio_path)
		if os.path.exists(video_path):
			os.remove(video_path)

		print(recipe_dictionary)
		return {"status": "success",
				"recipe": recipe_dictionary}

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/api/download-video")
def download_video_endpoint(request: VideoRequest, background_task: BackgroundTasks):
	video_path = None
	url = request.url
	try:
		video_path = download_video(url)
		background_task.add_task(delete_file, video_path)

		return FileResponse(path=video_path, media_type="video/mp4", filename="recipe_video.mp4", background=background_task)

	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))

	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/auth/request-code")
def	login(request: LoginRequest):
	try:
		db = SessionLocal()
		email = request.email
		code = str(secrets.randbelow(1000000)).zfill(6)
		verification = create_authentificator(db, code, email)
		send_email(email, code)
		return {"message": "Code sent"}
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/auth/submit-code")
def	verify(request: VerificationCode):
	db = SessionLocal()
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