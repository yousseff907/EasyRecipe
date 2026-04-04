import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
RESEND_API_KEY = os.getenv('RESEND_API_KEY')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')