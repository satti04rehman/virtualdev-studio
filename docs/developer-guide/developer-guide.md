# VirtualDev Studio — Developer Guide

How to set up, understand, extend, and test the **actual** codebase. All commands
below were verified against the repository.

---

## 1. Prerequisites

| Tool | Version used |
|---|---|
| Python | 3.13 (venv in `backend/.venv`) |
| Node.js / npm | Node 18+, Vite 5 |
| Flutter SDK | Dart `>=3.3.0` |
| PostgreSQL | 16 recommended (SQLite works for tests) |

---

## 2. Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio"
export SECRET_KEY="change-me-in-production"

uvicorn app.main:app --reload
```

Environment variables are read by `app/core/config.py` (Pydantic `BaseSettings`).
Defaults:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio` | asyncpg driver |
| `SECRET_KEY` | `dev-secret-key-change-in-production` (dev only) | **must** be set in production |
| `ALGORITHM` | `HS256` | JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
| `CORS_ORIGINS` | `["http://localhost:5173", "http://localhost:3000"]` | |
| `LLM_PROVIDER` | `mock` | mock AI output |
| `LLM_MODEL` | `gpt-4` | reserved for real providers |

In non-debug (non-development) mode the app refuses to start when `SECRET_KEY` is
unset or still the dev default — see `get_settings()` in `config.py:27`.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc && vite build (production bundle)
```

### Mobile

```bash
cd mobile
flutter pub get
flutter analyze    # static analysis
flutter run        # attach a device/emulator
```

---

## 3. Architecture Overview

VirtualDev Studio is a **modular monolith**: one FastAPI process, one database,
three clients (React SPA, Flutter app, API consumers). The AI orchestrator runs
synchronously inside the request path in the MVP.

```
React SPA (5173) ──┐
Flutter app       ─┼── HTTP/JSON + WS ──▶ FastAPI (8000)
                   │                        ├── /api/v1/auth*      JWT + bcrypt
                   │                        ├── /api/v1/projects*  project CRUD + stages
                   │                        ├── /api/v1/projects/{id}/{entities}
                   │                        ├── /api/v1/projects/{id}/orchestrate*
                   │                        └── /ws/projects/{id}  (unauthenticated, MVP)
                                          └── PostgreSQL / SQLite (tests)
```

Key facts:

- **REST API:** routers live in `backend/app/api/`, registered in `main.py` with
  prefix `/api/v1` (WebSocket router at root).
- **DB access:** async SQLAlchemy 2.0 (`app/core/database.py`), sessions injected
  via `Depends(get_db)`.
- **Auth:** `app/core/security.py` — bcrypt via `passlib`, JWT via `python-jose`,
  bearer extracted with `HTTPBearer(auto_error=False)`. `get_current_user` is the
  shared dependency (returns `401` for missing/invalid tokens).
- **Validation:** Pydantic v2 schemas in `app/schemas/`. Response models use
  `model_config.from_attributes = True` (current code uses the legacy `class
  Config` syntax — see §7).
- **Orchestrator:** `app/ai/orchestrator.py` creates 1 `Task` + 1 `TaskRun` per
  executed stage, stores outputs into stage rows and typed entities, and raises
  `Approval` records at the three gates.
- **Frontend:** single-page app routed in `App.tsx` (React Router v6); data access
  centralized in `services/api.ts`; 15 pages in `src/pages/`.
- **Mobile:** Flutter, `main.dart` wires providers (`AuthProvider`,
  `ProjectProvider`) and routes (7 screens).

### Database

14 tables are designed in `docs/architecture/database.md`; the SQLAlchemy models
in `backend/app/models/models.py` implement **11 domain entities** (+ `users`).
JSONB (`preferred_tech`, `output_data`, etc.) is used for flexible payloads; on
SQLite the test harness compiles JSONB/UUID to compatible types
(`tests/conftest.py`).

### API surface

Full endpoint reference with schemas and examples:
[`docs/api/api-documentation.md`](../api/api-documentation.md).

---

## 4. Code Layout Conventions

```
backend/app/
├── api/            # one router per resource; Depends(get_db) + Depends(get_current_user)
├── ai/             # orchestrator + workflow/agent domain model (AgentRole, TaskStatus, StageStatus)
├── core/           # cross-cutting: config, database, security, rate_limit
├── models/         # SQLAlchemy models (user.py → Base; models.py → 11 entities)
└── schemas/        # Pydantic request/response models (mirror api/)
```

Patterns to follow:

- **Ownership check first.** Every project-scoped handler calls the
  `_verify_project(project_id, user, db)` pattern (found in `entities.py`) or
  filters directly on `Project.owner_id` (found in `projects.py`).
- **Response models over ORM objects.** Return Pydantic response models; never
  serialize `hashed_password`.
- **Keep queries parameterized.** Use SQLAlchemy `select()` expressions; no raw
  SQL fragments with interpolated user input.
- **Async everywhere.** Handlers and fixtures are `async def`; tests use
  `pytest-asyncio`.

---

## 5. Extending the System

### 5.1 Add a new agent

Agent roles are a single enum + workflow list in
`backend/app/ai/orchestrator_models.py`:

1. Add the role to `AgentRole`:

   ```python
   class AgentRole(str, Enum):
       ...
       DEVOPS = "devops_engineer"
   ```

2. Optionally add the stage to `WORKFLOW_STAGES`:

   ```python
   WORKFLOW_STAGES = [
       ...
       ("deployment", AgentRole.DEVOPS, "Plan and configure deployment"),
   ]
   ```

   Stages in `WORKFLOW_STAGES` are executed by `start_workflow`. Stages not in the
   list (e.g. `diagrams`, `presentation`, `final_report`) are tracked but not run.

3. If the stage needs a human gate, add its name to `APPROVAL_REQUIRED_STAGES`:

   ```python
   APPROVAL_REQUIRED_STAGES = {"architecture", "development", "security_review", "deployment"}
   ```

4. Provide simulated output in `_simulate_agent_output(...)` in `orchestrator.py`
   — the dict keys are the raw stage names.
5. If the stage stores typed entities (like requirements/architecture), extend
   `_store_stage_output(...)`.

Agent rows themselves are created lazily by `get_or_create_agent` — no seeding
required.

### 5.2 Add a stage to a project (14-stage list)

The 14 stages a project is seeded with live in `STAGES` in
`backend/app/api/projects.py:13`. Keep this list in sync with the database design
(`docs/architecture/database.md`).

### 5.3 Add a REST endpoint

1. Add a route to the matching router in `app/api/` (or create a new router file).
2. Define request/response schemas in `app/schemas/`.
3. Protect resource routes with `Depends(get_current_user)` and verify ownership.
4. Register the router in `app/main.py`:

   ```python
   app.include_router(my_router, prefix="/api/v1")
   ```

5. Add a test in `backend/tests/` following the `client`, `auth_headers`,
   `sample_project` fixtures in `conftest.py`.

### 5.4 Add a frontend page

1. Create `frontend/src/pages/MyPage.tsx`.
2. Add a route in `frontend/src/App.tsx` (wrap with `ProtectedRoute` if it needs
   auth).
3. Add an API method to `frontend/src/services/api.ts` using the `request<T>()`
   helper.
4. Reuse shared components in `components/common/` (StatusBadge, EmptyState,
   LoadingSpinner, ApprovalCard) and `components/layout/` (Layout, Sidebar,
   Header).

### 5.5 Add a mobile screen

1. Create a screen under `mobile/lib/screens/`.
2. Register its route in `main.dart` (switch in `onGenerateRoute`).
3. Consume data through `ApiService` (`mobile/lib/services/api_service.dart`),
   exposed via the existing `Provider` tree.

---

## 6. Testing

### Backend — 25 tests

```bash
cd backend
export TEST_DATABASE_URL="sqlite+aiosqlite:///:memory:"   # default
.venv/bin/python -m pytest -v
```

| File | Count | Covers |
|---|---|---|
| `tests/test_auth.py` | 7 | register, duplicate email, login, invalid credentials, protected routes |
| `tests/test_projects.py` | 6 | create, list, get, 404, update, stages |
| `tests/test_entities.py` | 8 | requirements, research, architecture, tasks, agents, approvals, decide + already-decided |
| `tests/test_orchestration.py` | 4 | start, continue, both not-found cases |

**SQLite compatibility:** `conftest.py` compiles Postgres `UUID`/`JSONB` types to
SQLite types and uses `StaticPool` for in-memory DBs. Each test gets a freshly
dropped/recreated schema (fully isolated tests).

**Postgres guard:** if `TEST_DATABASE_URL` starts with `postgresql`, the harness
refuses to run unless the database name contains `"test"` (protects against
dropping a real DB).

Current result: **25 passed** — see `docs/testing/testing-report.md`.

### Frontend

```bash
cd frontend && npm run build   # tsc type-check + vite build
```

### Mobile

```bash
cd mobile && flutter analyze
```

---

## 7. Known Integration & Tech Notes

1. **Frontend ↔ backend route drift.** `frontend/src/services/api.ts` still calls
   a few URLs that don't exist as backend routes:
   - `getAgents()` → `GET /agents` (backend: `GET /projects/{id}/agents`)
   - `decideApproval()` → `POST /approvals/{id}/decide`
     (backend: `POST /projects/{id}/approvals/{a_id}/decide`)
   - `startOrchestration()` → `POST /projects/{id}/orchestrate`
     (backend: `POST /projects/{id}/orchestrate/start`)
   - `getDashboardStats()`, `getRecentActivity()`, `getCurrentUser()` target
     `/dashboard/stats`, `/dashboard/activity`, `/auth/me` — none exist; the
     dashboard pages use direct project queries instead.
   The mobile `ApiService` routes match the backend. Align the web service layer
   with `api-documentation.md` when wiring new UI work.

2. **Schema config style.** The Pydantic response models use the deprecated
   `class Config: from_attributes = True` syntax. Prefer `model_config =
   ConfigDict(from_attributes=True)` in new code (Pydantic v2 emits deprecation
   warnings).

3. **`python-jose` + `passlib`/`bcrypt`.** `requirements.txt` pins versions with
   known issues, detailed in `docs/security/security-review.md`
   (findings F-AUTH-07, F-DEP-01, F-DEP-02). If auth fails at runtime with a
   fresh install, pin `bcrypt==4.0.1` or migrate to `PyJWT`/`argon2`.

4. **WebSocket is a shell.** The channel accepts any connection (`F-WS-01`) and
   the orchestrator does not broadcast yet (`orchestrator.websocket_manager` is
   never assigned). Wire the manager in `orchestrator.py` when adding live
   updates.

5. **Debug SQL echo.** `database.py` sets `echo=settings.DEBUG` (`DEBUG=True` by
   default) — every SQL statement and bound parameter is logged. Flip `DEBUG`
   off (or set `SQL_ECHO`-style env) in non-local environments (finding F-DX-01).

---

## 8. Contributing Checklist

- [ ] Read the relevant `docs/` first (API ref, ADRs, security review).
- [ ] Follow the ownership-check pattern for any new project-scoped route.
- [ ] Add/update Pydantic schemas; never return password hashes.
- [ ] Add a test with the `conftest.py` fixtures; run the full suite.
- [ ] Run `npm run build` for frontend changes and `flutter analyze` for mobile.
- [ ] Update `docs/api/api-documentation.md` when the API surface changes.
- [ ] Update `docs/diagrams/` when architecture/workflows change.