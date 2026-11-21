from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from utils.database import Base


class User(Base):
	__tablename__ = "users"

	email = Column(String, unique=True, index=True, nullable=False)
	username = Column(String, nullable=False, unique=True)
	id = Column(Integer, primary_key=True)
	created_at = Column(DateTime, default=datetime.now)
	bio = Column(String, nullable=False, default="")
	recipes = relationship("Recipe", back_populates="owner")
	favorites = relationship("Recipe", secondary="user_favorites", lazy="dynamic")
