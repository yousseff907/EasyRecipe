from models.verification import Verification
from datetime import timedelta, datetime

def create_authentificator(db, new_code: str, mail: str):
	verification = Verification(email=mail, code=new_code, used=False, expires_at= datetime.now() + timedelta(minutes=20))
	db.add(verification)
	db.commit()
	db.refresh(verification)

	return (verification)