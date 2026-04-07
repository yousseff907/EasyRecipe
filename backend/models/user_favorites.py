from sqlalchemy import Column, Integer, DateTime, PrimaryKeyConstraint, ForeignKey
from datetime import datetime
from utils.database import Base

class UserFavorites(Base):
	__tablename__ = 'user_favorites'
	__table_args__ = (PrimaryKeyConstraint('user_id', 'recipe_id'),)
	user_id = Column(Integer, ForeignKey('users.id'), nullable = False, unique = False)
	recipe_id = Column(Integer, ForeignKey('recipes.id'), nullable = False, unique = False)
	saved_at = Column(DateTime, default = datetime.now())