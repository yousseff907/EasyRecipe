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
# Optional: comma-separated origins allowed to call the API from another domain.
# Leave empty when the frontend is served by the bundled nginx (same origin).
CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', '').split(',') if o.strip()]
# Optional: set to 1 to log every SQL query (debugging only; logs contain user data).
SQL_ECHO = os.getenv('SQL_ECHO', '') == '1'
