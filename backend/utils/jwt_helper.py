import jwt
from config import JWT_SECRET_KEY
from datetime import datetime, timedelta


def create_jwt_token(user_id: int, email: str) -> str:
	payload = {"uid": user_id, "email": email, "exp": datetime.now() + timedelta(90)}
	token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
	return token


def verify_jwt_token(token: str) -> dict:
	try:
		payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
		return payload
	except jwt.ExpiredSignatureError:
		return None
	except jwt.InvalidTokenError:
		return None
