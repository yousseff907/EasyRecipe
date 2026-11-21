from google import genai
from config import GEMINI_API_KEY, GEMINI_MODEL
import json
import re
import time
import os

client = genai.Client(api_key=GEMINI_API_KEY)

RECIPE_PROMPT = """
You are a cooking assistant that {role}.

IMPORTANT INSTRUCTIONS:
- Use METRIC units (grams, ml, liters) as the primary measurement system
- For common cooking measurements, also include volume measures (cups, tablespoons, teaspoons)
- For serving_size, use grams (g) for solid foods and milliliters (ml) for liquids
- Ingredients should use the most practical unit (e.g., "200g flour", "2 cups milk", "1 tsp salt")

{task}

{inputs}

Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{{
	"title": "{title_format}",
	"ingredients": ["ingredient 1", "ingredient 2"],
	"steps": ["step 1", "step 2"],
	"prep_time": minutes as number,
	"cook_time": minutes as number,
	"servings": number,
	"serving size": number,
	"nutrition_per_serving":
	{{
		"calories": amount as number,
		"protein_g": amount as number,
		"carbs_g": amount as number,
		"fat_g": amount as number
	}}
}}

Rules:
- Use grams (g) and milliliters (ml) for precise measurements
- Use cups, tablespoons (tbsp), teaspoons (tsp) for common cooking measures
- serving_size should be a string like "250g" or "300ml" or "1 cup"
- If units aren't clear from transcript, estimate based on typical recipes
- nutrition values are per serving in grams
- All numbers should be integers (no decimals)
{creator_rules}
CRITICAL: If the {source} is NOT about cooking/recipes OR contains inappropriate content,
respond with EXACTLY this text: NOT_A_RECIPE
"""

CREATOR_RULES = """
IMPORTANT:
- Extract creator's name from DESCRIPTION (after "By:" or @username)
- Format title as: "Recipe Name by @CreatorName"
- If creator not found, just use recipe name
- If information is missing, use reasonable defaults
"""


def build_prompt(role, task, inputs, credit_creator, source):
	return RECIPE_PROMPT.format(
		role=role,
		task=task,
		inputs="\n".join(f"{label}: {value}" for label, value in inputs.items()),
		title_format="Recipe name by @CreatorName" if credit_creator else "Recipe name",
		creator_rules=CREATOR_RULES if credit_creator else "",
		source=source,
	)


def upload_and_wait(path, timeout):
	uploaded = client.files.upload(file=path)
	start = time.time()
	while uploaded.state.name != "ACTIVE":
		if time.time() - start > timeout:
			raise RuntimeError("Video processing timed out")
		time.sleep(1)
		uploaded = client.files.get(name=uploaded.name)
	return uploaded


def generate_recipe(prompt, file_paths=(), upload_timeout=60):
	uploaded = []
	try:
		contents = [prompt]
		for path in file_paths:
			if path and os.path.exists(path):
				file = upload_and_wait(path, upload_timeout)
				uploaded.append(file)
				contents.append(file)

		response = client.models.generate_content(model=GEMINI_MODEL, contents=contents)
		text = response.text.strip()

		if "NOT_A_RECIPE" in text:
			return None

		text = re.sub(r'^```json\s*', '', text)
		text = re.sub(r'\s*```$', '', text)
		return json.loads(text.strip())
	except json.JSONDecodeError as e:
		print("Invalid JSON returned by model:", repr(e.doc[:1000]))
		raise ValueError("The AI returned an invalid recipe. Please try again.") from e
	except Exception as e:
		print("FULL ERROR:", repr(e))
		raise
	finally:
		for file in uploaded:
			try:
				client.files.delete(name=file.name)
			except Exception as e:
				print("Failed to delete uploaded file:", file.name, repr(e))


def analyze_video_with_ai(transcript: str, caption: str, video_path=None, instructions="") -> dict:
	prompt = build_prompt(
		role="extracts recipes from video content",
		task="Extract a recipe from the following:",
		inputs={"TRANSCRIPT": transcript, "DESCRIPTION": caption, "CUSTOM INSTRUCTIONS": instructions},
		credit_creator=True,
		source="video/text",
	)
	return generate_recipe(prompt, [video_path], upload_timeout=60)


def build_ai_recipe(instructions: str, ingredients: list[str]) -> dict:
	prompt = build_prompt(
		role="builds recipes from random ingredients in the house",
		task="Create a recipe using the following:",
		inputs={"INGREDIENTS": ingredients, "CUSTOM INSTRUCTIONS": instructions},
		credit_creator=False,
		source="text",
	)
	return generate_recipe(prompt)


def analyze_slideshow_with_ai(caption: str, photo_paths=None, instructions="") -> dict:
	prompt = build_prompt(
		role="extracts recipes from video content",
		task="Extract a recipe from the following:",
		inputs={"DESCRIPTION": caption, "CUSTOM INSTRUCTIONS": instructions},
		credit_creator=True,
		source="video/text",
	)
	return generate_recipe(prompt, photo_paths or [], upload_timeout=10)
