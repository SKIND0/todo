from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth

from database import get_db
from schemas import UserRegister, UserLogin, Token
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Google OAuth ──────────────────────────────────────────────────────────────
# Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.
# Optional GOOGLE_REDIRECT_URI override (Railway sets this automatically when
# you configure the Railway custom domain).

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID", ""),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# Where to send the user after Google login — frontend origin
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# ── Password auth ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    if auth_service.get_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    user = auth_service.create_user_password(db, body.email, body.name, body.password)
    return Token(access_token=auth_service.create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.get_user_by_email(db, body.email)
    # Unified error message — never reveal which part was wrong (security)
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )
    if not user or not user.password_hash:
        raise invalid
    if not auth_service.verify_password(body.password, user.password_hash):
        raise invalid
    return Token(access_token=auth_service.create_access_token(user.id))


@router.post("/logout")
def logout():
    # JWTs are stateless — the client discards the token.
    # This endpoint exists so the frontend can make a clean API call.
    return {"detail": "Logged out."}

# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google")
async def google_login(request: Request):
    """Redirect the user to Google's OAuth consent screen."""
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, str(redirect_uri))


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Google redirects here after the user approves. Exchange the code for
    a token, retrieve user info, upsert the user, and redirect to the
    frontend with the JWT in the URL query string."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth failed. Please try again.",
        )

    userinfo  = token.get("userinfo") or {}
    google_id = userinfo.get("sub")
    email     = userinfo.get("email")
    name      = userinfo.get("name") or email

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve account info from Google.",
        )

    user      = auth_service.upsert_google_user(db, google_id, email, name)
    jwt_token = auth_service.create_access_token(user.id)

    # Frontend reads ?token= from the URL and stores it in localStorage
    return RedirectResponse(url=f"{FRONTEND_URL}/login.html?token={jwt_token}")
