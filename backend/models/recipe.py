from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from utils.database import Base

class Recipe(Base):
	__tablename__ = "recipes"

	id = Column(Integer, primary_key=True)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	video_url = Column(String, nullable=False)
	title = Column(String, nullable=False)
	ingredients = Column(Text, nullable=False)
	steps = Column(Text, nullable=False)
	prep_time = Column(Integer, nullable=True)
	cook_time = Column(Integer, nullable=True)
	servings = Column(Integer, nullable=True)
	serving_size = Column(String, nullable=True)
	nutrition = Column(Text)
	created_at = Column(DateTime, default=datetime.now)
	is_public = Column(Boolean, nullable = False, default = False)
	owner = relationship("User", back_populates="recipes")
