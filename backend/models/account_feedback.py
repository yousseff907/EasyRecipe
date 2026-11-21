from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from utils.database import Base


class AccountFeedback(Base):
	__tablename__ = "account_feedback"

	id = Column(Integer, primary_key=True)
	feedback = Column(String(500), nullable=False)
	created_at = Column(DateTime, default=datetime.now)
