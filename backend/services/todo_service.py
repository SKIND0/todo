from typing import List, Optional
from sqlalchemy.orm import Session

from models import Todo
from schemas import TodoCreate, TodoUpdate


def get_todos(db: Session, user_id: int) -> List[Todo]:
    """Return all todos belonging to user_id, newest first."""
    return (
        db.query(Todo)
        .filter(Todo.user_id == user_id)
        .order_by(Todo.created_at.desc())
        .all()
    )


def get_todo(db: Session, todo_id: int, user_id: int) -> Optional[Todo]:
    """Return a single todo that belongs to user_id, or None."""
    return (
        db.query(Todo)
        .filter(Todo.id == todo_id, Todo.user_id == user_id)
        .first()
    )


def create_todo(db: Session, user_id: int, data: TodoCreate) -> Todo:
    todo = Todo(
        user_id=user_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def update_todo(db: Session, todo_id: int, user_id: int, data: TodoUpdate) -> Optional[Todo]:
    todo = get_todo(db, todo_id, user_id)
    if not todo:
        return None
    if data.title is not None:
        todo.title = data.title
    if data.description is not None:
        todo.description = data.description
    if data.priority is not None:
        todo.priority = data.priority
    db.commit()
    db.refresh(todo)
    return todo


def complete_todo(db: Session, todo_id: int, user_id: int) -> Optional[Todo]:
    todo = get_todo(db, todo_id, user_id)
    if not todo:
        return None
    todo.completed = True
    db.commit()
    db.refresh(todo)
    return todo


def uncomplete_todo(db: Session, todo_id: int, user_id: int) -> Optional[Todo]:
    todo = get_todo(db, todo_id, user_id)
    if not todo:
        return None
    todo.completed = False
    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, todo_id: int, user_id: int) -> bool:
    todo = get_todo(db, todo_id, user_id)
    if not todo:
        return False
    db.delete(todo)
    db.commit()
    return True
