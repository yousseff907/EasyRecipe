from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from config import DATABASE_URL

Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

from models.recipe import Recipe
from models.user import User
from models.verification import Verification
from models.user_favorites import UserFavorites

Base.metadata.create_all(bind=engine)

def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()