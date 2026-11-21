from sqlalchemy import Integer, DateTime, Column, String
from datetime import datetime
from utils.database import Base


class EmailRateLimit(Base):
	__tablename__ = "email_rate_limits"
	email = Column(String, nullable=False, primary_key=True)
	last_code_date = Column(DateTime, default=datetime.now, nullable=False)
	sent_emails = Column(Integer, nullable=False, default=0)
