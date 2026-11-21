from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def moderate_content(title: str = "", ingredients: list = (), steps: list = (), addon: str = "") -> bool:
	try:
		recipe = f"{title} {' '.join(ingredients)} {' '.join(steps)} {addon}"
		response = client.moderations.create(model="omni-moderation-latest", input=recipe)
		return response.results[0].flagged
	except Exception as e:
		print("API ENDPOINT FAILURE", {e})
		return False
