# Checkmark

A todo app that turns chaos into checkmarks. Register or sign in with Google, manage todos by priority, and enjoy a few built-in surprises along the way.

**Live:** [backend-production-18a7.up.railway.app](https://backend-production-18a7.up.railway.app)

## Features

- Email/password registration and login
- Google OAuth sign-in
- Create, edit, delete, and complete todos
- Filter by priority (low / medium / high)
- Progress bar with confetti when everything is done
- Six color themes (including dark mode)
- Hourly letter hint in the nav
- Export todos to PDF
- Fun extras:
  - Letter **x** sparkles in todo titles (style changes every hour)
  - **Food** words show a matching emoji
  - **Action verbs** make the card wiggle for 2 seconds
  - **Chaos button** shuffles and animates the list
  - Keyword easter eggs (walk, gym, pizza, and more)

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Hosting | Railway |

The frontend is served by the same FastAPI service as the API, so one Railway URL runs the whole app.

## Project structure

```
todo/
├── backend/           # FastAPI app, auth, todos API
│   ├── main.py
│   ├── routers/
│   ├── services/
│   └── requirements.txt
├── frontend/          # Static HTML/JS pages
│   ├── index.html     # Landing page
│   ├── login.html
│   ├── register.html
│   └── app.html       # Main todo app
├── requirements.txt   # Root deps (Railway build)
├── railway.toml       # Deploy config
├── railpack.json      # Railway build config
└── .env.example       # Local env template
```

## Local development

### 1. Database

Use a local Postgres instance or a Railway Postgres `DATABASE_URL` in a `.env` file at the repo root (copy from `.env.example`).

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at `http://localhost:8000`.

### 3. Frontend

Open `frontend/index.html` with Live Server (or any static file server on port 5500).

For local dev, the frontend talks to `http://localhost:8000` automatically via `config.js`.

Set in `.env`:

```
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
FRONTEND_URL=http://localhost:5500
```

## Railway deployment

One **BACKEND** service deploys from the **repo root** (not `backend/`).

| Setting | Value |
|---------|-------|
| Root directory | *(empty — repo root)* |
| Start command | `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |

`railway.toml` and `railpack.json` in the repo root handle the build.

### Required environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Reference from Postgres service (`${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | Long random string for auth tokens |
| `SESSION_SECRET` | Long random string for OAuth sessions |
| `ALLOWED_ORIGINS` | Your app URL, e.g. `https://your-app.up.railway.app` |
| `FRONTEND_URL` | Same as your app URL |


## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Log in |
| `POST` | `/auth/logout` | Log out |
| `GET` | `/auth/google` | Start Google OAuth |
| `GET` | `/todos` | List todos (auth required) |
| `POST` | `/todos` | Create todo |
| `PUT` | `/todos/{id}` | Update todo |
| `PATCH` | `/todos/{id}/complete` | Mark complete |
| `DELETE` | `/todos/{id}` | Delete todo |
| `GET` | `/health` | Health check |

## License

Personal project — internship work.
