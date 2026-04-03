from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from utils.database import Base

class User(Base):
	__tablename__ = "users"

	email = Column(String, unique=True, index=True, nullable=False)
	username = Column(String, nullable=True, unique=True)
	id = Column(Integer, primary_key=True)
	created_at = Column(DateTime, default=datetime.now)
	recipes = relationship("Recipe", back_populates="owner")
