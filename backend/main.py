"""
Checkmark — FastAPI backend
Run locally:  uvicorn main:app --reload          (from backend/ directory)
Railway:      start command → uvicorn main:app --host 0.0.0.0 --port $PORT
"""
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from sqlalchemy import text

from database import Base, engine
from routers import auth, todos

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# ── Create tables on startup ──────────────────────────────────────────────────
# In production you'd use Alembic migrations; for this app's scope, create_all
# is safe and sufficient — it never drops or alters existing tables.
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ"
        ))
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


@app.get("/health", tags=["health"])
def health():
    """Health check — Railway and monitoring tools ping this."""
    return {"status": "ok", "app": "Checkmark API"}


# ── Frontend (static HTML/JS) ─────────────────────────────────────────────────
# Served from the same service so one public Railway URL works for the whole app.
# Requires the backend service root directory to be the repo root (not backend/).
_PAGE_ROUTES = {
    "/": "index.html",
    "/login": "login.html",
    "/register": "register.html",
    "/blueprint": "blueprint.html",
    "/app": "app.html",
}

if FRONTEND_DIR.is_dir():
    def _page(route: str, filename: str):
        @app.get(route, include_in_schema=False)
        def handler():
            return FileResponse(FRONTEND_DIR / filename)

    for _route, _file in _PAGE_ROUTES.items():
        _page(_route, _file)

    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")
else:
    @app.get("/", tags=["health"])
    def root_health():
        return {"status": "ok", "app": "Checkmark API"}
