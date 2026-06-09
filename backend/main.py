"""
Checkmark — FastAPI backend
Run locally:  uvicorn main:app --reload          (from backend/ directory)
Railway:      start command → uvicorn main:app --host 0.0.0.0 --port $PORT
"""
from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from database import Base, engine
from routers import auth, todos

# ── Create tables on startup ──────────────────────────────────────────────────
# In production you'd use Alembic migrations; for this app's scope, create_all
# is safe and sufficient — it never drops or alters existing tables.
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Checkmark API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Session middleware (required by authlib for Google OAuth state) ────────────
# SESSION_SECRET must be a long random string; kept in env vars, never hardcoded.
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ["SESSION_SECRET"],
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# ALLOWED_ORIGINS is a comma-separated list of frontend origins.
# e.g. "http://localhost:3000,https://your-app.up.railway.app"
_origins_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(todos.router)


@app.get("/", tags=["health"])
def health():
    """Health check — Railway and monitoring tools ping this."""
    return {"status": "ok", "app": "Checkmark API"}
