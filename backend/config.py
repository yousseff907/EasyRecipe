import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
RESEND_API_KEY = os.getenv('RESEND_API_KEY')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
TURNSTILE_SECRET_KEY = os.getenv('TURNSTILE_SECRET_KEY')
GOOGLE_CLIENT_ID=os.getenv('GOOGLE_CLIENT_ID')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite-preview')
CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', '').split(',') if o.strip()]
SQL_ECHO = os.getenv('SQL_ECHO', '') == '1'
SITE_DOMAIN = os.getenv('SITE_DOMAIN', 'localhost')
SITE_URL = f"https://{SITE_DOMAIN}"
EMAIL_FROM = os.getenv('EMAIL_FROM') or f"EasyRecipe <noreply@{SITE_DOMAIN}>"
