# Copilot Instructions — Checkmark Todo App

This file is the source of truth for every decision made about this project.
Follow it on every request. Do not introduce anything not listed here.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS + HTML | No frameworks, no bundlers, no React, no Vue |
| Styling | Tailwind CSS (CDN) | Utility classes only, no custom CSS files |
| Backend | FastAPI (Python) | Routers, Pydantic models, services pattern |
| Database | PostgreSQL | Via Railway native plugin, SQLAlchemy ORM |
| Hosting | Railway | One app service (FastAPI serves API + frontend) + PostgreSQL plugin |

---

## Architecture Rules

- Follow ADRs in `architectural-decisions.md` (repo root) — every technology choice is documented there
- Follow the spec in `specs.md` (repo root) — data model, API, user stories, acceptance criteria
- This file (`.github/copilot-instructions.md`) is the day-to-day source of truth for Copilot
- Frontend is static files only: `index.html`, `home.js`, `config.js`, and page-specific JS files
- No bundlers, no npm on the frontend — Tailwind loads from CDN
- In production, FastAPI serves the frontend from `frontend/` on the same Railway service (see `backend/main.py`)
- Backend follows FastAPI best practices: separate routers per resource, Pydantic schemas, service layer
- API routes have no `/api` prefix — endpoints are `/auth/...` and `/todos/...` at the root
- Do NOT introduce new technologies not listed in the stack above
- Do NOT add complexity beyond what the spec requires
- Keep code readable and minimal

---

## Authentication

The app supports two login methods. Both land in the same `users` table.

### Option 1 — Username + Password
- User registers with email, name, and password
- Password is hashed with bcrypt before storing — never store plaintext
- Login returns a JWT token stored in localStorage
- Every `/todos` request sends the token in the Authorization header

### Option 2 — Google OAuth
- "Sign in with Google" button on login and register pages
- Uses `authlib` library on the FastAPI backend
- On success, creates or finds the user by `google_id` in the database
- Returns the same JWT token as password login

### Users table
```
id            integer, auto, PK
email         string, unique, required
name          string, required
password_hash string, nullable  — null if Google login
google_id     string, nullable  — null if password login
created_at    timestamp, auto
```

### Todos table
```
id            integer, auto, PK
user_id       integer, FK → users.id
title         string, required
description   string, optional
priority      enum: low / medium / high
completed     boolean, default false
created_at    timestamp, auto
completed_at  timestamp, nullable — set on complete, cleared on uncomplete
```

---

## Environment Variables

Set in `.env` locally (see `.env.example`) and in Railway's Variables tab for production.

```
DATABASE_URL          — PostgreSQL connection string (Railway injects for Postgres plugin)
JWT_SECRET            — signs auth tokens; long random string, never hardcoded
SESSION_SECRET        — required for Google OAuth session state (authlib)
ALLOWED_ORIGINS       — comma-separated CORS origins (local dev + production URL)
FRONTEND_URL          — used for OAuth redirects and post-login routing
GOOGLE_CLIENT_ID      — from Google Cloud Console
GOOGLE_CLIENT_SECRET  — from Google Cloud Console
GOOGLE_REDIRECT_URI   — e.g. https://your-app.up.railway.app/auth/google/callback
```

---

## API Endpoints

All `/todos` endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.
Requests without a token return 401.

```
POST   /auth/register           — create account with email + password
POST   /auth/login              — login, returns JWT
POST   /auth/logout             — invalidate token
GET    /auth/google             — start Google OAuth flow
GET    /auth/google/callback    — Google OAuth callback, issues JWT

GET    /health                  — health check (Railway pings this)

GET    /todos                   — get all todos for logged-in user
POST   /todos                   — create a new todo
PUT    /todos/{id}              — edit title, description, or priority
PATCH  /todos/{id}/complete     — mark as complete (sets completed_at)
PATCH  /todos/{id}/uncomplete   — undo complete (clears completed_at)
DELETE /todos/{id}              — permanently delete
```

### Frontend routes (served by FastAPI, not in OpenAPI schema)
```
/           — index.html (home)
/login      — login.html
/register   — register.html
/app        — app.html (authenticated todo app)
/blueprint  — blueprint.html (public architecture page)
```

---

## File Structure

```
/
├── .github/
│   └── copilot-instructions.md   — this file
├── architectural-decisions.md    — ADRs (ADR-001 through ADR-006)
├── specs.md                      — data model, API, user stories, acceptance criteria
├── .env.example                  — template for local env vars
├── railway.toml                  — production deploy: cd backend && uvicorn ...
│
├── frontend/
│   ├── index.html          — home page
│   ├── home.js             — ghost background animation
│   ├── config.js           — sets CHECKMARK_API_URL (localhost:8000 vs same origin)
│   ├── login.html / login.js
│   ├── register.html / register.js
│   ├── app.html / app.js   — main todo app (authenticated)
│   └── blueprint.html      — public architecture page
│
└── backend/
    ├── main.py             — FastAPI app, serves API + frontend static files
    ├── database.py
    ├── models.py
    ├── schemas.py
    ├── routers/
    │   ├── auth.py         — register, login, logout, Google OAuth
    │   └── todos.py
    └── services/
        ├── auth_service.py
        └── todo_service.py
```

### Local development
- Run backend: `cd backend && uvicorn main:app --reload` (port 8000)
- Serve frontend separately (e.g. Live Server on port 5500) or open via FastAPI at `http://localhost:8000`
- `config.js` points API calls at `http://localhost:8000` when hostname is localhost

---

## Visual Design

### Overall vibe
Clean, playful, fun. Think: a small indie app with personality. 
Not corporate, not bland. Light warm background, orange as the 
primary accent. Colors have personality throughout.

# Color System & Themes

## Base theme — Warm Cream

This is the default theme. All pages use this unless a theme is active.

```
Background page:   #FFFBF5
Background card:   #FFFFFF
Background subtle: #FFF7ED

Text primary:      #1a1208
Text muted:        #78614a
Text placeholder:  #b8a899

Border default:    #e8d5b7
Border focus:      #f97316

Accent primary:    #f97316   (orange)
Accent hover:      #ea6c0a
Accent light:      #fff0e6

Success:           #166534   (text) / #f0fdf4 (bg)
Warning:           #b45309   (text) / #fef9e7 (bg)
Danger:            #c2410c   (text) / #fff0e6 (bg)
```

### Priority pill colors
```
high:    bg #fff0e6  text #c2410c
medium:  bg #fef9e7  text #b45309
low:     bg #f0fdf4  text #166534
```

### Completed todo
- Checkbox: filled with `var(--accent)`, white checkmark inside
- Label: strikethrough, reduced opacity

---

## Themes system

A themes button lives in the top nav on every page (after login).
Clicking it cycles through the available themes or opens a small theme picker.
The chosen theme is saved to `localStorage` under the key `checkmark-theme`.
On page load, read `localStorage` and apply the theme class to `<body>`.

### How to implement
- Add a `data-theme` attribute to `<body>`: `<body data-theme="cream">`
- Each theme is a set of CSS custom properties defined on `body[data-theme="X"]`
- JS reads localStorage on load and sets the attribute
- Theme button calls `setTheme(name)` which updates the attribute and saves to localStorage

### Available themes

**cream** (default)
```css
body[data-theme="cream"] {
  --bg-page:    #FFFBF5;
  --bg-card:    #FFFFFF;
  --bg-subtle:  #FFF7ED;
  --text-primary:   #1a1208;
  --text-muted:     #78614a;
  --border:         #e8d5b7;
  --accent:         #f97316;
  --accent-hover:   #ea6c0a;
  --accent-light:   #fff0e6;
}
```

**purple**
```css
body[data-theme="purple"] {
  --bg-page:    #F7F5FF;
  --bg-card:    #FFFFFF;
  --bg-subtle:  #EDE9FE;
  --text-primary:   #1e1340;
  --text-muted:     #6b5fa8;
  --border:         #c4b5fd;
  --accent:         #7c3aed;
  --accent-hover:   #6d28d9;
  --accent-light:   #ede9fe;
}
```

**sky**
```css
body[data-theme="sky"] {
  --bg-page:    #F0FAFB;
  --bg-card:    #FFFFFF;
  --bg-subtle:  #CFFAFE;
  --text-primary:   #0c2a30;
  --text-muted:     #3d8a95;
  --border:         #a7d9e2;
  --accent:         #0891b2;
  --accent-hover:   #0e7490;
  --accent-light:   #cffafe;
}
```

**rose**
```css
body[data-theme="rose"] {
  --bg-page:    #FFF5F7;
  --bg-card:    #FFFFFF;
  --bg-subtle:  #FFE4E6;
  --text-primary:   #2d0a14;
  --text-muted:     #9f4159;
  --border:         #fecdd3;
  --accent:         #e11d48;
  --accent-hover:   #be123c;
  --accent-light:   #ffe4e6;
}
```

**forest**
```css
body[data-theme="forest"] {
  --bg-page:    #F3FAF3;
  --bg-card:    #FFFFFF;
  --bg-subtle:  #DCFCE7;
  --text-primary:   #0a1f0a;
  --text-muted:     #3a6b3a;
  --border:         #a7d9a7;
  --accent:         #16a34a;
  --accent-hover:   #15803d;
  --accent-light:   #dcfce7;
}
```

**dark**
```css
body[data-theme="dark"] {
  --bg-page:    #0f1117;
  --bg-card:    #1a1d27;
  --bg-subtle:  #252936;
  --text-primary:   #f1f5f9;
  --text-muted:   #94a3b8;
  --border:       #2d3348;
  --accent:       #818cf8;
  --accent-hover: #6366f1;
  --accent-light: #1e1b4b;
}
```

### Theme button UI
- Lives in the top nav, right side (on home, login, register, and app pages)
- Icon: a circle split into 4 colored quadrants
- On click: opens a small inline popover with 6 colored circles (cream, purple, sky, rose, forest, dark)
- Active theme circle has a ring around it
- No page reload needed — switching theme is instant via the CSS variable swap

### Usage rules
- Every color in the app must use a CSS variable from the theme system — never hardcode `#f97316` directly in component CSS
- The ghost background animation on the home page uses `--accent` for checked checkbox color
- Priority pills keep their own semantic colors across all themes — they do not change with theme
- The Blueprint page does not use the theme system — it stays dark always
---

## Home Page — index.html

### Structure
1. Ghost background (full viewport, behind everything)
2. Pill badge: "Your chaos, organised" with indigo pulse dot
3. Headline: "Win the day." in text-primary, then "Turn chaos into checkmarks." in `var(--accent)` — no gradient
4. Subtext: "The todo app that actually makes you feel good about getting stuff done."
5. CTA: "Start Winning →" button (accent color, rounded-full)
6. Secondary link: "Already winning? Log in"
7. Micro-copy: "No credit card. No fluff. Just checkmarks."
8. Footer: © Checkmark | Blueprint | Log in | Register

### Ghost background (home.js)
- Ghost todos fade in and out behind the hero content
- **Opacity when visible: 0.07** — subtle, not competing with hero text
- Items spread across the full viewport height using `justify-between` not `justify-center`
- Text size: `text-base` (not `text-lg`)
- 7 simultaneous ghost slots
- 30% chance a todo gets checked before fading out
- Checked state: strikethrough text, var(--accent) checkbox fill

### Ghost todo items to cycle through
```
Walk the dog 🐕
Grocery shopping
Get calculus assignment done
Buy screen protector
Stop procrastinating on this todo app
Invent excuse for being late
Pretend to have it all together
Reply to that email
Drink more water 💧
Touch grass
Actually go to the gym
Clean my desk (eventually)
Read one chapter. Just one.
Figure out what to cook tonight
Not overthink this todo list
```

---

## Blueprint Page — blueprint.html

Public page. No login required. Linked in the footer of every page as "The Blueprint".

### Sections (in order)
1. Nav: back arrow to Home | "Blueprint" mono label | live spec indicator
2. Hero: `/blueprint` pill badge, "How this thing is built" headline, stack summary pills
3. Section 01 — Stack at a glance: table of layer / choice / core reason
4. Section 02 — ADRs: accordion cards (ADR-001 through ADR-005), expandable with full reasoning
5. Section 03 — Data model: two tables (users, todos) side by side
6. Section 04 — API surface: color-coded HTTP method badges (GET=green, POST=blue, PUT=amber, PATCH=purple, DELETE=red)
7. Section 05 — User stories: card grid, one per story
8. Section 06 — Easter eggs & fun: frontend polish features
9. Section 07 — Reflection: build retrospective
10. Footer: © Checkmark | Home | Log in | Register

### ADR accordion behavior
- Click to expand, click again to collapse
- Only one open at a time
- Chevron rotates 180° when open
- Each ADR shows: context, decision, reasons, alternatives rejected (3 red cards), tradeoff (amber card)

---

## App Features (implemented in app.html / app.js)

### Core (from spec)
- Register, log in (email/password or Google), log out
- Create, view, edit, delete todos
- Mark complete / uncomplete (checkbox toggles both ways; sets/clears `completed_at`)
- Filter by priority (low / medium / high / all)
- User sees only their own todos
- Progress bar with done count, percent, and priority breakdown

### Fun enhancements (frontend-only — do not touch API or database)
- **Chaos button**: shuffles list, tilts page, floats cards, spins progress bar; undo restores order
- **Easter eggs**: keyword parade on save (walk, dog, gym, water, coffee, pizza, sleep, read, cook, email, clean, grass, run, music, shop)
- **Food words**: matching emoji on card + mini parade on save
- **Action verbs**: card jump animation on save (run, buy, call, etc.)
- **Hourly letter**: highlights a letter/color each hour; flashes matching letters in title on save
- **Confetti**: fires when every todo is complete (`canvas-confetti` CDN)
- **Sparkle effect**: particle burst on checkbox completion
- **Themes**: 6 themes (cream, purple, sky, rose, forest, dark) via CSS variables + localStorage
- **PDF export**: grouped open/completed todos with timestamps (jsPDF CDN)

For easter eggs and chaos — keep them as self-contained JS functions. Do not couple them to the core todo logic.

---

## Rules — Always Follow

1. Never introduce a technology not listed in the stack
2. Never add a feature not in the spec without being explicitly asked
3. Never store passwords in plaintext — always bcrypt
4. Never return another user's todos — always filter by authenticated user_id
5. Always validate inputs with Pydantic on the backend
6. Always handle errors — return proper HTTP status codes (400, 401, 404, 422)
7. Keep frontend files simple and flat — one HTML file per page, one JS file per page
8. CORS must be configured on FastAPI — required for local dev when frontend and backend run on different ports
9. JWT_SECRET and SESSION_SECRET must come from environment variables — never hardcoded
10. DATABASE_URL must come from Railway environment — never hardcoded
11. Google OAuth credentials and redirect URI must come from environment variables — never hardcoded
12. When changing data model, API, or features — update `specs.md`, `architectural-decisions.md`, and `blueprint.html` to match