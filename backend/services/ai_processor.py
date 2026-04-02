from google import genai
from config import GEMINI_API_KEY
import json
import re
import time
import os

def wait_until_active(file_name: str, timeout=60):
	start = time.time()

	while True:
		file_obj = client.files.get(name=file_name)

		if file_obj.state.name == "ACTIVE":
			return file_obj

		if time.time() - start > timeout:
			raise RuntimeError("Video processing timed out")

		time.sleep(1)


client = genai.Client(api_key=GEMINI_API_KEY)

def analyze_with_ai(transcript: str, caption: str, video_path=None, instructions="") -> dict:
	try:
		prompt = f"""
		You are a cooking assistant that extracts recipes from video content.

		Extract a recipe from the following:

		TRANSCRIPT: {transcript}
		DESCRIPTION: {caption}
		CUSTOM INSTRUCTIONS: {instructions}

		Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
		{{
			"title": "Recipe name by @CreatorName",
			"ingredients": ["ingredient 1", "ingredient 2"],
			"steps": ["step 1", "step 2"],
			"prep_time": minutes as number,
			"cook_time": minutes as number,
			"servings": number,
			"nutrition_per_serving":
			{{
				"calories": 450,
				"protein_g": 25,
				"carbs_g": 35,
				"fat_g": 20
			}}
		}}

		IMPORTANT:
		- Extract creator's name from DESCRIPTION (after "By:" or @username)
		- Format title as: "Recipe Name by @CreatorName"
		- If creator not found, just use recipe name
		- If information is missing, use reasonable defaults

		CRITICAL: If the video/text is NOT about cooking/recipes OR contains inappropriate content,
		respond with EXACTLY this text: NOT_A_RECIPE
		"""

		contents = [prompt]

		if video_path and os.path.exists(video_path):
			video_file = client.files.upload(file=video_path)

			start = time.time()
			while video_file.state.name != "ACTIVE":
				if time.time() - start > 60:
					raise RuntimeError("Video processing timed out")
				video_file = client.files.get(name=video_file.name)
				time.sleep(1)

			contents.append(video_file)
			response = client.models.generate_content(model='gemini-3.1-flash-lite-preview', contents=contents)
			text = response.text.strip()

			if text == "NOT_A_RECIPE" or "NOT_A_RECIPE" in text:
				return None

			text = re.sub(r'^```json\s*', '', text)
			text = re.sub(r'\s*```$', '', text)
			text = text.strip()

		return json.loads(text)
	except json.JSONDecodeError as e:
		raise ValueError(f"Invalid JSON returned by model: {text}") from e
	except Exception as e:
		print("FULL ERROR:", repr(e))
		raise

def build_ai_recipe(instructions : str, ingredients : list[str]) -> dict:
	try:
		prompt = f"""
		You are a cooking assistant that builds recipes from random ingredients in the house.

		Create a recipe using the following:

		INGREDIENTS: {ingredients}
		CUSTOM INSTRUCTIONS: {instructions}

		Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
		{{
			"title": "Recipe name",
			"ingredients": ["ingredient 1", "ingredient 2"],
			"steps": ["step 1", "step 2"],
			"prep_time": minutes as number,
			"cook_time": minutes as number,
			"servings": number,
			"nutrition_per_serving":
			{{
				"calories": 450,
				"protein_g": 25,
				"carbs_g": 35,
				"fat_g": 20
			}}
		}}

		CRITICAL: If the text is NOT about cooking/recipes OR contains inappropriate content,
		respond with EXACTLY this text: NOT_A_RECIPE
		"""
		contents = [prompt]

		response = client.models.generate_content(model='gemini-3.1-flash-lite-preview', contents=contents)
		text = response.text.strip()

		if text == "NOT_A_RECIPE" or "NOT_A_RECIPE" in text:
			return None

		text = re.sub(r'^```json\s*', '', text)
		text = re.sub(r'\s*```$', '', text)
		text = text.strip()

		return json.loads(text)
	except json.JSONDecodeError as e:
		raise ValueError(f"Invalid JSON returned by model: {text}") from e
	except Exception as e:
		print("FULL ERROR:", repr(e))
		raise