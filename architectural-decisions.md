# Architectural Decision Records

> This document contains all architectural and technology decisions made for the Todo Web App.
> Each decision includes the problem it solves, the chosen solution, alternatives considered, and tradeoffs accepted.

---

## ADR-001 — Frontend: Vanilla JS + HTML

### Status
Accepted

### Context
The frontend needs to deliver a UI for managing todos. The app is small, will not grow complex, and the primary goals are speed and simplicity. The question is whether to use a JavaScript framework or go without one.

### Decision
Use plain HTML and Vanilla JavaScript with no frontend framework.

### Reasons
- The browser already speaks HTML and JavaScript natively. There is no framework runtime sitting between the code and the browser.
- Frameworks like React ship a runtime to the browser — extra kilobytes the browser must download, parse, and execute before the app does anything. Vanilla JS eliminates that entirely.
- For a small todo app that will not grow complex, the component model and state management patterns that frameworks provide are unnecessary overhead.
- AI generates vanilla JS accurately — there are no framework-specific patterns, version conflicts, or abstraction layers to get wrong.
- Instant load, zero dependencies, nothing holding it back.

### Alternatives Considered

**React**
Rejected. React ships a runtime to the browser and requires a build pipeline. The component model adds value at scale but is unnecessary overhead for a small todo app. The extra complexity buys nothing here.

**Next.js**
Rejected. Next.js is a full-stack React framework — it solves problems this app does not have. Server-side rendering, file-based routing, and API routes are all overkill for a simple client-side todo UI backed by a separate API.

**Vue 3**
Rejected. Same category as React. A reactive component framework adds a runtime and a mental model that this app does not need. The ecosystem benefit does not outweigh the overhead for a project of this size.

### Tradeoffs Accepted
As the app grows, vanilla JS can become disorganized without discipline. There is no enforced component structure. For this app's scope this is an acceptable tradeoff — the app is intentionally small and will not reach the complexity where this becomes a problem.

---

## ADR-002 — Styling: Tailwind CSS

### Status
Accepted

### Context
The app needs a styling approach. The goal is to move fast, keep the codebase simple, and avoid context switching between files.

### Decision
Use Tailwind CSS utility classes for all styling.

### Reasons
- Tailwind keeps styling in the same file as the HTML. No separate CSS files, no switching context, no inventing class names.
- Utility classes do exactly what they say — `rounded-lg`, `flex`, `gap-4`, `bg-blue-500`. There is no cascade to reason about, no specificity conflicts, no naming conventions to maintain.
- AI generates Tailwind accurately and consistently. There are no custom class names to invent or maintain across files — just well-documented utility classes with a massive base of training examples.
- Fast to write, fast to read, fast to change.

### Alternatives Considered

**Plain CSS**
Rejected. Works fine but means separate files, more context switching, and custom class names that AI may generate inconsistently across files. More overhead for no meaningful benefit on a small app.

**CSS Modules**
Rejected. Scoped styles are a solution to a problem this app won't have. The added build configuration is unnecessary for a project of this scope.

**Bootstrap**
Rejected. Opinionated component classes that impose a visual style. Harder to customize, heavier than Tailwind, and less suited to building a unique UI.

### Tradeoffs Accepted
Tailwind class names can make HTML verbose. A single element might have many classes on it. For a small app this is readable and manageable.

---

## ADR-003 — Backend: FastAPI (Python)

### Status
Accepted

### Context
The app needs a backend API to handle todo CRUD operations and communicate with the database. The question is which framework and language to use.

### Decision
Use FastAPI with Python.

### Reasons
- FastAPI automatically generates a live interactive `/docs` page the moment routes are written. Every endpoint is testable in the browser without Postman or curl — a strong demo artifact.
- Pydantic validation is built in. You define the shape of your data once, and FastAPI automatically rejects any request that doesn't match — before your code even runs. With Flask you write that validation yourself or skip it.
- FastAPI is async by default — built for modern Python, faster under load, and what you would actually choose starting a Python API project today.
- AI writes FastAPI + SQLAlchemy + Postgres accurately. This combination is well-documented with a large base of examples.
- Deployed as a separate Railway service alongside the static frontend — clean separation of concerns.

### Alternatives Considered

**Flask**
Rejected. Flask is a blank slate — you get routing and nothing else. Validation, documentation, and type safety all require additional libraries or don't exist. FastAPI gives all three out of the box. Flask is the older choice; FastAPI is the modern one.

**Node.js + Express**
Rejected. Express would require JavaScript on the backend, adding a second language context. FastAPI in Python offers better built-in validation and automatic documentation that Express does not provide without extra packages.

**Next.js API Routes**
Rejected. Next.js collapses the frontend and backend into one service which reduces deploy complexity, but it couples two concerns that are cleaner when separate. It also requires committing to React on the frontend, which was already rejected in ADR-001.

### Tradeoffs Accepted
Two Railway services instead of one — a static frontend and a Python backend. This means CORS headers must be configured and there are two deploy logs to monitor. For a small app this is manageable and the tradeoff is worth the benefits FastAPI provides.

---

## ADR-004 — Database: PostgreSQL

### Status
Accepted

### Context
The app needs persistent storage for todo data. The data is structured and relational — todos have predictable fields and will eventually relate to users.

### Decision
Use PostgreSQL via Railway's native database plugin.

### Reasons
- Railway has a native Postgres plugin. One click adds it to the project and the `DATABASE_URL` environment variable is injected automatically. No manual configuration.
- Todo data is structured and predictable — an id, a title, a status, a timestamp. This is exactly what a relational database is designed for.
- SQLAlchemy (the standard Python ORM) pairs with Postgres cleanly and AI generates this combination accurately.
- Postgres enforces strict data integrity by default — it rejects bad data rather than silently accepting it.
- Industry standard. The right database to know, the right database to put in an ADR, and what most production applications use.

### Alternatives Considered

**SQLite**
Rejected. SQLite is a file on disk. On Railway, every redeploy wipes the container — data is lost unless persistent storage is manually configured. SQLite is also not designed for concurrent writes, meaning simultaneous requests can corrupt data. It is a local development tool, not a production database.

**MySQL**
Rejected. MySQL and Postgres are in the same category but Postgres is stricter about data integrity, better supported by the modern Python ecosystem, and what AI defaults to in tutorials and examples. No meaningful advantage to MySQL for this use case.

**MongoDB**
Rejected. MongoDB is a document database designed for flexible, schema-less data. Todo data is structured and relational — a fixed schema is a feature, not a limitation. Using MongoDB here would be choosing the wrong tool for the shape of the data. If users are added who own todos, that relationship belongs in a relational database with a foreign key, not a manual document lookup.

### Tradeoffs Accepted
Schema migrations require thought — adding or changing a column requires a migration file. SQLAlchemy handles this via Alembic. This is a standard part of working with any relational database and is accepted as the correct approach.

---

## ADR-005 — Hosting: Railway

### Status
Accepted

### Context
The app needs to be deployed somewhere accessible. The question is which hosting platform to use.

### Decision
Use Railway for all services — static frontend, Python backend, and PostgreSQL database.

### Reasons
- Already paying for it. No cost justification, no new account, no free tier limitations to work around. The infrastructure decision was already made.
- Railway removes deployment friction entirely. Connect a GitHub repo, it detects what's running, and deploys it. Push to main, it redeploys automatically.
- Native Postgres plugin — one click, connection string injected into environment variables automatically.
- Environment variables, logs, and service health are all managed in a clean UI.
- Supports both static sites and Python services under the same project — the entire stack lives in one Railway project.

### Alternatives Considered

**Vercel**
Rejected. Vercel is optimized for Next.js and static frontends. Deploying a Python FastAPI backend on Vercel requires serverless function configuration and has cold start limitations. Railway handles Python services more cleanly.

**Render**
Rejected. Render is a valid alternative with similar features but requires a new account and setup with no additional benefit over Railway given an existing subscription.

**AWS / GCP / Azure**
Rejected. Cloud providers offer more power and flexibility but at the cost of significantly more configuration, IAM roles, networking setup, and operational overhead. For a small todo app this is the wrong level of infrastructure complexity.

### Tradeoffs Accepted
Railway is not the cheapest option if cost were the primary concern. It is chosen here because the existing subscription removes that concern entirely, and the developer experience benefit is worth it.

---

## Summary

| Layer | Choice | Core Reason |
|---|---|---|
| Frontend | Vanilla JS + HTML | No runtime overhead, browser native, instant load |
| Styling | Tailwind CSS | Utility classes in one file, no separate CSS, AI generates accurately |
| Backend | FastAPI (Python) | Built-in validation, live `/docs` page, async, modern |
| Database | PostgreSQL | Structured relational data, Railway native plugin, industry standard |
| Hosting | Railway | Already paid for, zero friction, native Postgres, GitHub integration |