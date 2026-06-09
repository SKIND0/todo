# Todo App — Spec Document

> This document defines the data model, API design, user stories, and acceptance criteria for the Todo Web App.
> It is a living document and will be updated as decisions change during development.

---

## Data Model

### Users

| Field | Type | Description |
|---|---|---|
| `id` | integer, auto | unique identifier |
| `email` | string, unique, required | used for login |
| `name` | string, required | display name |
| `password_hash` | string, nullable | null if Google login |
| `google_id` | string, nullable | null if password login |
| `created_at` | timestamp, auto | when the account was created |

### Todos

| Field | Type | Description |
|---|---|---|
| `id` | integer, auto | unique identifier |
| `user_id` | integer, foreign key | links todo to its owner |
| `title` | string, required | the name of the todo |
| `description` | string, optional | extra detail about the todo |
| `priority` | enum: low / medium / high | how urgent the todo is |
| `completed` | boolean, default false | whether the todo is done |
| `created_at` | timestamp, auto | when the todo was created |

### Relationships
- A user has many todos
- A todo belongs to one user
- A user can only see and interact with their own todos

---

## API Design

All `/todos` endpoints require authentication. Requests without a valid token are rejected.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | create a new account with email and password |
| `POST` | `/auth/login` | log in, returns an auth token |
| `POST` | `/auth/logout` | log out, invalidates the token |
| `GET` | `/todos` | get all todos belonging to the logged in user |
| `POST` | `/todos` | create a new todo |
| `PUT` | `/todos/{id}` | edit a todo's title, description, or priority |
| `PATCH` | `/todos/{id}/complete` | mark a todo as complete |
| `DELETE` | `/todos/{id}` | permanently delete a todo |

---

## User Stories

1. As a user, I want to register an account so that my todos are private to me.
2. As a user, I want to log in so that I can access my todos.
3. As a user, I want to log out so that my account is secure when I'm done.
4. As a user, I want to create a todo with a title, description, and priority so that I can store and organize my tasks.
5. As a user, I want to view all my todos so that I can see everything I need to do.
6. As a user, I want to mark a todo as complete so that I can track my progress.
7. As a user, I want to edit a todo so that I can update it if things change.
8. As a user, I want to delete a todo so that I can remove tasks I no longer need.
9. As a user, I want to filter my todos by priority so that I can focus on what matters most.

---

## Acceptance Criteria

### Story 1 — Register
- Given I am on the home page
- When I fill in my email, name, and password and click register
- Then my account is created and I am redirected to my todo list

### Story 2 — Log in
- Given I have an existing account
- When I enter my email and password and click log in
- Then I am authenticated and redirected to my todo list

### Story 3 — Log out
- Given I am logged in
- When I click the log out button
- Then I am redirected to the home page and my session is ended, I cannot access my todos without logging in again

### Story 4 — Create a todo
- Given I am logged in
- When I fill in a title and click create
- Then a new todo appears in my list with the correct title, description, and priority

### Story 5 — View todos
- Given I am logged in
- When I open the app
- Then I see only my own todos and no one else's

### Story 6 — Mark a todo complete
- Given I am logged in and have at least one todo in my list
- When I click the complete button on a todo
- Then the todo is marked as complete and visually changes to reflect that state

### Story 7 — Edit a todo
- Given I am logged in and have at least one todo
- When I click edit on a todo and change the title, description, or priority and save
- Then the todo updates immediately and reflects the new information

### Story 8 — Delete a todo
- Given I am logged in and have at least one todo
- When I click delete on a todo
- Then the todo is permanently removed from my list

### Story 9 — Filter by priority
- Given I am logged in and have todos with different priorities
- When I select a priority filter
- Then only todos matching that priority are shown

---

## Out of Scope (for now)

The following features are planned as enhancements during development and are not part of the initial spec:

- Chaos button (temporary visual chaos mode with undo)
- Easter eggs triggered by keywords in todo titles
- Daily themes
- Sound effects on actions
- Confetti and particle effects on interactions
- Due dates on todos