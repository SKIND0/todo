from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Railway injects DATABASE_URL automatically.
# Locally, set it in a .env file and load with python-dotenv.
DATABASE_URL = os.environ["DATABASE_URL"]

# SQLAlchemy 2.x requires postgresql://, Railway may supply postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# FastAPI dependency — yields a DB session and always closes it
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
