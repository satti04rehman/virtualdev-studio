# VirtualDev Studio

**An AI-powered virtual software development studio.** Turn a product idea into a full
project — requirements, research, architecture, database design, UI/UX specs, code,
tests, security review, and documentation — by coordinating a team of specialized AI
agents under human supervision.

This document describes the project as **actually implemented**. Every claim is
verified against the source in `backend/`, `frontend/`, and `mobile/`.

---

## 1. What It Does

A user describes an idea (name, description, target users, platform, preferred tech,
constraints, complexity). VirtualDev Studio creates a project with **14 workflow
stages**, then an **AI orchestrator** runs a team of **10 agent roles** through the
workflow. At three high-impact checkpoints — **architecture**, **development**, and
**security review** — the workflow pauses and asks the user to **approve or reject**
before continuing. Results (requirements, research findings, architecture components,
reports) are stored and can be browsed in the web dashboard or mobile app.

| Component | Stack | Status |
|---|---|---|
| Backend API | Python 3.13, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 | 25 tests passing |
| Database | PostgreSQL (design), SQLite in-memory for tests | 14 tables, 11 entities in models |
| AI Orchestrator | Python, 10 agent roles, simulated outputs | Approval gates for 3 stages |
| Web frontend | React 18 + TypeScript + Vite + React Router v6 | 15 pages, builds with `npm run build` |
| Mobile app | Flutter / Dart (Material 3) | 7 screens, `flutter analyze` clean |
| Documents | 12 Mermaid diagrams, professional PPTX | `docs/diagrams/`, `docs/presentation/` |

---

## 2. Repository Layout

```
virtualdev-studio/
├── backend/                  # FastAPI application + test suite
│   ├── app/
│   │   ├── api/              # Routers: auth, projects, entities, orchestrate, websocket
│   │   ├── ai/               # AIOrchestrator + agent/workflow models
│   │   ├── core/             # config, database, security (JWT), rate_limit
│   │   ├── models/           # SQLAlchemy models (users + 11 domain models)
│   │   └── schemas/          # Pydantic request/response schemas
│   ├── tests/                # 25 tests across 4 files
│   └── requirements.txt
├── frontend/                 # React + TypeScript SPA
│   └── src/pages/            # 15 page components
├── mobile/                   # Flutter companion app
│   └── lib/                  # 7 screens, providers, services
├── docs/
│   ├── README.md             # This file
│   ├── api/                  # API reference
│   ├── user-guide/           # End-user guide
│   ├── developer-guide/      # Developer setup & extension guide
│   ├── testing/              # Test results
│   ├── decisions/            # Architecture Decision Records
│   ├── project-report/       # Final project report
│   ├── requirements/         # Requirements docs + acceptance criteria
│   ├── architecture/         # Architecture, system analysis, database design
│   ├── diagrams/             # 12 Mermaid diagram sources
│   ├── research/             # Market research
│   ├── security/             # Security review
│   └── presentation/         # VirtualDev-Studio-Presentation.pptx (20 slides)
└── scripts/                  # generate_presentation.py
```

---

## 3. Quick Start

### 3.1 Backend API

Requirements: Python 3.11+, PostgreSQL (or use SQLite for tests).

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Point at your PostgreSQL database (defaults shown below)
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio"
export SECRET_KEY="change-me-in-production"

uvicorn app.main:app --reload
```

- Interactive API docs: <http://localhost:8000/docs> (OpenAPI/Swagger, `NFR-401`)
- Root: <http://localhost:8000/> → `{"message": "VirtualDev Studio API", "version": "0.1.0"}`
- Health: <http://localhost:8000/api/v1/health>

### 3.2 Frontend Web App

Requirements: Node.js 18+.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build (verified: tsc + vite build pass)
```

The dev build expects the API at `http://localhost:8000/api/v1`
(`frontend/src/services/api.ts:1`).

### 3.3 Mobile App

Requirements: Flutter SDK (Dart `>=3.3.0`).

```bash
cd mobile
flutter pub get
flutter run        # pick a device/emulator
```

The app connects to `http://localhost:8000/api/v1`
(`mobile/lib/services/api_service.dart:23`).

---

## 4. Running the Tests

### 4.1 Backend (25 tests)

Tests run against an isolated schema that is dropped and recreated per test. SQLite
in-memory works out of the box; a PostgreSQL `*_test` database is also supported via
`TEST_DATABASE_URL`.

```bash
cd backend
export TEST_DATABASE_URL="sqlite+aiosqlite:///:memory:"
.venv/bin/python -m pytest -v
# or, for PostgreSQL:
# export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio_test"
```

Result: **25 passed**. See `docs/testing/testing-report.md` for the full list and the
history of the single auth-fix (24 passed / 1 failed → 25 passed).

### 4.2 Frontend build / lint

```bash
cd frontend && npm run build     # tsc + vite build — passes (57 modules)
```

### 4.3 Mobile static analysis

```bash
cd mobile && flutter analyze
```

---

## 5. API Surface at a Glance

All REST routes are mounted under `/api/v1` (auth, projects, entities, orchestrate)
plus one WebSocket channel. Ownership is enforced per project; all protected routes
require `Authorization: Bearer <access_token>`.

| Area | Routes |
|---|---|
| Meta | `GET /api/v1/health`, `GET /` |
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` |
| Projects | `GET/POST /api/v1/projects`, `GET/PATCH /api/v1/projects/{id}`, `GET .../stages` |
| Entities | `GET .../requirements`, `.../research`, `.../architecture`, `.../tasks`, `.../tasks/{tid}/runs`, `.../approvals`, `POST .../approvals/{aid}/decide`, `.../documents`, `.../diagrams`, `.../agents` |
| Orchestration | `POST .../orchestrate/start`, `POST .../orchestrate/continue` |
| WebSocket | `WS /ws/projects/{project_id}` |

Full reference with request/response examples: `docs/api/api-documentation.md`.

---

## 6. AI Orchestrator Overview

- **Workflow:** 11 stages executed by the orchestrator out of the 14 tracked on a project.
- **Agent roles (10):** `requirements_analyst`, `researcher`, `product_strategist`,
  `architect`, `database_engineer`, `ui_ux_designer`, `developer`,
  `testing_engineer`, `security_reviewer`, `documentation_engineer`.
- **Approval gates:** stages `architecture`, `development`, and `security_review`
  pause for a human decision; the workflow only continues after approval
  (`APPROVAL_REQUIRED_STAGES` in `backend/app/ai/orchestrator_models.py:68`).
- **AI provider:** `LLM_PROVIDER="mock"` (default). The orchestrator produces
  deterministic, simulated agent outputs and commits them to the database. A real
  LLM provider is wired in later without changing the orchestration model.

---

## 7. Key Files

| What | Where |
|---|---|
| FastAPI app + router registration | `backend/app/main.py` |
| JWT / password security | `backend/app/core/security.py` |
| ORM models (11 entities + users) | `backend/app/models/models.py` |
| AI orchestrator | `backend/app/ai/orchestrator.py` |
| Workflow/agent definitions | `backend/app/ai/orchestrator_models.py` |
| Frontend routes | `frontend/src/App.tsx` |
| API client (web) | `frontend/src/services/api.ts` |
| Mobile entry point + routes | `mobile/lib/main.dart` |
| Database design | `docs/architecture/database.md` |
| Security review | `docs/security/security-review.md` |

---

## 8. Documentation Index

- **API reference** — `docs/api/api-documentation.md`
- **User guide** — `docs/user-guide/user-guide.md`
- **Developer guide** — `docs/developer-guide/developer-guide.md`
- **Testing report** — `docs/testing/testing-report.md`
- **Decision log (ADRs)** — `docs/decisions/decision-log.md`
- **Project report** — `docs/project-report/project-report.md`
- **Acceptance criteria** — `docs/requirements/acceptance-criteria.md`
- **Requirements** — `docs/requirements/`
- **Architecture & DB design** — `docs/architecture/`
- **Diagrams (12, Mermaid)** — `docs/diagrams/`
- **Security review** — `docs/security/security-review.md`
- **Market research** — `docs/research/market-research.md`
- **Presentation (20 slides)** — `docs/presentation/VirtualDev-Studio-Presentation.pptx`

---

## 9. Known Gaps

- The web/mobile clients call a few URLs that don't match backend routes yet
  (`/agents`, `/approvals/{id}/decide`, `/orchestrate`) — see the developer guide,
  section "Frontend ↔ backend route drift".
- WebSocket channel exists but the orchestrator does not yet broadcast live events
  (`orchestrator.websocket_manager` is unused).
- Security hardening items are documented as "noted for future" in
  `docs/security/security-review.md` (default JWT secret, WS auth, dependency
  upgrades).