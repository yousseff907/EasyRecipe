from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from utils.database import Base


class Verification(Base):
	__tablename__ = "verifications"

	id = Column(Integer, primary_key=True)
	email = Column(String, index=True, nullable=False)
	code = Column(String, nullable=False)
	expires_at = Column(DateTime, nullable=False)
	created_at = Column(DateTime, default=datetime.now)
	attempts = Column(Integer, nullable=False, default=0)
	used = Column(Boolean, default=False)
