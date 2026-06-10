from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from models import PriorityEnum


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email:    EmailStr
    name:     str
    password: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"


# ── Todos ─────────────────────────────────────────────────────────────────────

class TodoCreate(BaseModel):
    title:       str
    description: Optional[str] = None
    priority:    PriorityEnum  = PriorityEnum.low

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title must not be blank.")
        return v.strip()


class TodoUpdate(BaseModel):
    title:       Optional[str]          = None
    description: Optional[str]          = None
    priority:    Optional[PriorityEnum] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Title must not be blank.")
        return v.strip() if v else v


class TodoResponse(BaseModel):
    id:          int
    user_id:     int
    title:       str
    description: Optional[str]
    priority:    PriorityEnum
    completed:    bool
    created_at:   datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
