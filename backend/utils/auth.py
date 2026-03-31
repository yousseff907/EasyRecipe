from fastapi import Header, HTTPException, Depends
from utils.jwt_helper import verify_jwt_token
from utils.database import SessionLocal, get_db
from models.user import User
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db = Depends(get_db)) -> User:
	token = credentials.credentials
	payload = verify_jwt_token(token)
	if not payload:
		raise HTTPException(status_code=401, detail="Not authenticated")
	user = db.query(User).filter(User.id == payload["uid"]).first()
	if not user:
		raise HTTPException(status_code=401, detail="Not authenticated")
	return user