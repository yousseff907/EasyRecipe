from fastapi import Header, HTTPException
from jwt_helper import verify_jwt_token
from database import SessionLocal
from models.user import User

def get_current_user(authorization: str = Header(None)) -> User:
	if not authorization:
		raise HTTPException(status_code=401, detail="Not authenticated")
	token = authorization.replace("Bearer ", "")
	payload = verify_jwt_token(token)
	if not payload:
		raise HTTPException(status_code=401, detail="Not authenticated")
	db = SessionLocal()
	user = db.query(User).filter(User.id == payload["uid"]).first()
	if not user:
		raise HTTPException(status_code=401, detail="Not authenticated")
	return user