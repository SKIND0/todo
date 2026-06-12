# Checkmark — Spec Document

> This document defines the data model, API design, user stories, and acceptance criteria for the Checkmark todo app.
> It is a living document — keep it in sync with `architectural-decisions.md`, `.github/copilot-instructions.md`, and `frontend/blueprint.html`.

---

## Data Model

### Users

| Field | Type | Description |
|---|---|---|
| `id` | integer, auto | unique identifier |
| `email` | string, unique, required | used for login |
| `name` | string, required | display name |
| `password_hash` | string, nullable | null if Google login |
| `google_id` | string, nullable, unique | null if password login |
| `created_at` | timestamp, auto | when the account was created |

### Todos

| Field | Type | Description |
|---|---|---|
| `id` | integer, auto | unique identifier |
| `user_id` | integer, foreign key | links todo to its owner (`users.id`) |
| `title` | string, required | the name of the todo |
| `description` | string, optional | extra detail about the todo |
| `priority` | enum: low / medium / high | how urgent the todo is |
| `completed` | boolean, default false | whether the todo is done |
| `created_at` | timestamp, auto | when the todo was created |
| `completed_at` | timestamp, nullable | set when marked complete; cleared on uncomplete |

### Relationships
- A user has many todos
- A todo belongs to one user
- A user can only see and interact with their own todos

---

## Authentication

Two login methods. Both use the same `users` table and return the same JWT format.

| Method | Flow |
|---|---|
| Email + password | Register or log in via `/auth/register` or `/auth/login`. Password hashed with bcrypt. JWT stored in `localStorage`. |
| Google OAuth | "Sign in with Google" on login/register pages → `/auth/google` → `/auth/google/callback`. Creates or finds user by `google_id`. Same JWT issued. |

All `/todos` requests send `Authorization: Bearer <token>`. Requests without a valid token return 401.

---

## API Design

Routes are at the root — there is no `/api` prefix.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | create a new account with email, name, and password |
| `POST` | `/auth/login` | log in with email and password; returns JWT |
| `POST` | `/auth/logout` | log out; invalidates the token |
| `GET` | `/auth/google` | start Google OAuth sign-in |
| `GET` | `/auth/google/callback` | OAuth callback; issues JWT |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | health check (used by Railway) |

### Todos — requires auth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/todos` | get all todos for the logged-in user |
| `POST` | `/todos` | create a new todo |
| `PUT` | `/todos/{id}` | edit title, description, or priority |
| `PATCH` | `/todos/{id}/complete` | mark as complete; sets `completed_at` |
| `PATCH` | `/todos/{id}/uncomplete` | undo complete; clears `completed_at` |
| `DELETE` | `/todos/{id}` | permanently delete a todo |

### Frontend pages (served by FastAPI)

| Route | Page |
|---|---|
| `/` | home (`index.html`) |
| `/login` | login (`login.html`) |
| `/register` | register (`register.html`) |
| `/app` | todo app (`app.html`) |
| `/blueprint` | architecture page (`blueprint.html`) |

---

## User Stories

1. As a user, I want to register an account so that my todos are private to me.
2. As a user, I want to log in so that I can access my todos.
3. As a user, I want to log out so that my account is secure when I'm done.
4. As a user, I want to sign in with Google so that I can access my todos without creating a password.
5. As a user, I want to create a todo with a title, description, and priority so that I can store and organize my tasks.
6. As a user, I want to view all my todos so that I can see everything I need to do.
7. As a user, I want to mark a todo as complete so that I can track my progress.
8. As a user, I want to undo a completed todo so that I can fix mistakes.
9. As a user, I want to edit a todo so that I can update it if things change.
10. As a user, I want to delete a todo so that I can remove tasks I no longer need.
11. As a user, I want to filter my todos by priority so that I can focus on what matters most.

---

## Acceptance Criteria

### Story 1 — Register
- Given I am on the register page
- When I fill in my email, name, and password and click register
- Then my account is created and I am redirected to my todo list

### Story 2 — Log in
- Given I have an existing account
- When I enter my email and password and click log in
- Then I am authenticated and redirected to my todo list

### Story 3 — Log out
- Given I am logged in
- When I click the log out button
- Then I am redirected to the home page and my session is ended; I cannot access my todos without logging in again

### Story 4 — Google sign-in
- Given I am on the login or register page
- When I click "Sign in with Google" and complete the Google flow
- Then I am authenticated and redirected to my todo list with a valid JWT

### Story 5 — Create a todo
- Given I am logged in
- When I fill in a title and click create
- Then a new todo appears in my list with the correct title, description, and priority

### Story 6 — View todos
- Given I am logged in
- When I open the app
- Then I see only my own todos and no one else's

### Story 7 — Mark a todo complete
- Given I am logged in and have at least one incomplete todo
- When I click the checkbox on a todo
- Then the todo is marked complete, `completed_at` is set, and it visually changes (strikethrough, filled checkbox)

### Story 8 — Uncomplete a todo
- Given I am logged in and have at least one completed todo
- When I click the checkbox on a completed todo
- Then the todo is marked incomplete, `completed_at` is cleared, and it returns to its open visual state

### Story 9 — Edit a todo
- Given I am logged in and have at least one todo
- When I click edit on a todo and change the title, description, or priority and save
- Then the todo updates immediately and reflects the new information

### Story 10 — Delete a todo
- Given I am logged in and have at least one todo
- When I click delete on a todo
- Then the todo is permanently removed from my list

### Story 11 — Filter by priority
- Given I am logged in and have todos with different priorities
- When I select a priority filter
- Then only todos matching that priority are shown

---

## Frontend Enhancements (implemented, frontend-only)

These features live in `app.js` only. They do not change the API or database.

| Feature | Description |
|---|---|
| Chaos button | Shuffles list, tilts page, floats cards; undo restores order |
| Easter eggs | Keyword parade on save (walk, dog, gym, water, coffee, etc.) |
| Food words | Matching emoji on card + mini parade when title contains food words |
| Action verbs | Card jump animation when title contains verbs like run, buy, call |
| Hourly letter | Highlights a letter/color each hour; flashes matching letters on save |
| Confetti | Fires when every todo is complete |
| Sparkle | Particle burst on checkbox completion |
| Themes | Six themes (cream, purple, sky, rose, forest, dark) via CSS variables |
| Progress bar | Done count, percent, priority breakdown |
| PDF export | Download todos grouped by date with timestamps |
