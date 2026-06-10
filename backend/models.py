import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class PriorityEnum(str, enum.Enum):
    low    = "low"
    medium = "medium"
    high   = "high"


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String,  unique=True, nullable=False, index=True)
    name          = Column(String,  nullable=False)
    password_hash = Column(String,  nullable=True)   # null when Google login
    google_id     = Column(String,  unique=True, nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    todos = relationship("Todo", back_populates="owner", cascade="all, delete-orphan")


class Todo(Base):
    __tablename__ = "todos"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    title       = Column(String,  nullable=False)
    description = Column(String,  nullable=True)
    priority    = Column(SAEnum(PriorityEnum), nullable=False, default=PriorityEnum.low)
    completed     = Column(Boolean, nullable=False, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    completed_at  = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", back_populates="todos")
