from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from utils.database import Base

class AccountFeedback(Base):
	# Optional feedback left when a user deletes their account.
	# Deliberately not linked to the user: the account and its data are gone.
	__tablename__ = "account_feedback"

	id = Column(Integer, primary_key=True)
	feedback = Column(String(500), nullable=False)
	created_at = Column(DateTime, default=datetime.now)
