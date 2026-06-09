from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from schemas import TodoCreate, TodoUpdate, TodoResponse
from services import auth_service, todo_service

router = APIRouter(prefix="/todos", tags=["todos"])

# Shorthand dependency alias used by every endpoint
CurrentUser = Depends(auth_service.get_current_user)


@router.get("", response_model=List[TodoResponse])
def list_todos(
    current_user: User = CurrentUser,
    db: Session = Depends(get_db),
):
    """Return all todos that belong to the authenticated user, newest first."""
    return todo_service.get_todos(db, current_user.id)


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
def create_todo(
    body: TodoCreate,
    current_user: User = CurrentUser,
    db: Session = Depends(get_db),
):
    return todo_service.create_todo(db, current_user.id, body)


@router.put("/{todo_id}", response_model=TodoResponse)
def update_todo(
    todo_id: int,
    body: TodoUpdate,
    current_user: User = CurrentUser,
    db: Session = Depends(get_db),
):
    todo = todo_service.update_todo(db, todo_id, current_user.id, body)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found.",
        )
    return todo


@router.patch("/{todo_id}/complete", response_model=TodoResponse)
def complete_todo(
    todo_id: int,
    current_user: User = CurrentUser,
    db: Session = Depends(get_db),
):
    todo = todo_service.complete_todo(db, todo_id, current_user.id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found.",
        )
    return todo


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(
    todo_id: int,
    current_user: User = CurrentUser,
    db: Session = Depends(get_db),
):
    deleted = todo_service.delete_todo(db, todo_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found.",
        )
