# VirtualDev Studio — Architecture Decision Log (ADRs)

Record of the significant architecture decisions made during the build, with the
context, the decision, and the consequences as actually realized in the
repository. Dates reflect when the decision was implemented.

| No. | Decision | Status |
|-----|----------|--------|
| ADR-001 | Modular monolith for the back end | Accepted |
| ADR-002 | LLM provider abstraction (mock-first) | Accepted |
| ADR-003 | SQLite in-memory database for tests | Accepted |
| ADR-004 | Human approval gates for architecture/development/security_review | Accepted |
| ADR-005 | Mock (simulated) AI outputs for the MVP | Accepted |
| ADR-006 | Single monolith DB schema with JSONB for flexible payloads | Accepted |
| ADR-007 | JWT bearer auth with HTTPBearer(auto_error=False) | Accepted |

---

## ADR-001 — Modular monolith for the back end

**Status:** Accepted · **Date:** September 2026

### Context

The product needed a fast-moving MVP with auth, project CRUD, an AI orchestrator,
real-time updates, and three clients (web, mobile, future CLI). Microservices
would add deployment, networking, and consistency complexity with no user
benefit at this scale.

### Decision

Build one deployable FastAPI application with clearly separated routers
(`app/api/`), core utilities (`app/core/`), models (`app/models/`), schemas
(`app/schemas/`), and an orchestrator module (`app/ai/`). All routes mount on a
single `/api/v1` prefix in `backend/app/main.py`. The WebSocket channel lives in
the same process.

### Consequences

- **Positive:** Single service to run and test; the whole system starts with
  `uvicorn app.main:app`; intra-process orchestration is simple; the test suite
  drives the app in-process via `ASGITransport`.
- **Negative:** the long-running orchestration runs synchronously in the request
  path (`POST .../orchestrate/start`), creating a self-DoS/concurrency risk noted
  as finding `F-API-05` in `docs/security/security-review.md`.
- **Evidence:** `backend/app/main.py:22-26` (router registration), `backend/app/core/`.

---

## ADR-002 — LLM provider abstraction (mock-first)

**Status:** Accepted · **Date:** September 2026

### Context

Agent outputs must be persisted and displayed whether or not a paid LLM service
is configured, and the team may want to switch providers (OpenAI-style API,
self-hosted, etc.) without rewriting the orchestrator.

### Decision

Introduce a provider switch in `Settings`:

```
LLM_PROVIDER = "mock"      # "mock" today; reserved values for real providers
LLM_MODEL   = "gpt-4"      # model label used by the abstraction layer
LLM_API_KEY = ""           # populated when a real provider is enabled
```

The orchestrator calls provider-agnostic simulation in
`AIOrchestrator._simulate_agent_output()`. There is no provider- or SDK-specific
code in the orchestrator today; a real provider plugs into the same method
signature (`stage_name, agent_role -> dict`).

### Consequences

- **Positive:** demos and tests run with zero network/keys; switching providers
  touches only the provider seam, not `orchestrator.py`.
- **Negative:** mocked outputs are deterministic and shallow; prompt-injection
  controls are not yet implemented (finding `F-AI-01`), so enabling a real model
  requires adding an instruction/sanitization layer first.
- **Evidence:** `backend/app/core/config.py:18-20`; `backend/app/ai/orchestrator.py:227-329`.

---

## ADR-003 — SQLite in-memory database for tests

**Status:** Accepted · **Date:** September 2026

### Context

Production uses PostgreSQL (asyncpg). Running tests needed a fast, isolated,
zero-setup configuration that exercises the same ORM code paths. A fresh
PostgreSQL instance was not guaranteed on developer machines.

### Decision

The test harness defaults `TEST_DATABASE_URL` to `sqlite+aiosqlite:///:memory:`
and:

- compiles the PostgreSQL `UUID`/`JSONB` column types to SQLite-compatible
  `CHAR(36)`/`JSON` via `@compiles` registration,
- patches the postgres UUID bind/result processors for dialect-aware handling,
- uses `StaticPool` so the in-memory DB survives across connections,
- recreates the schema (`drop_all` → `create_all`) for every single test,
- refuses to run against a PostgreSQL database whose name lacks `"test"` as a
  safety guard for the destructive fixtures.

PostgreSQL remains the **schema source of truth** (`docs/architecture/database.md`),
and the suite still supports `postgresql+asyncpg://...*_test` URL via env.

### Consequences

- **Positive:** tests run in seconds, fully isolated and deterministic; 25 tests
  pass with no external services; CI could run the same command anywhere.
- **Negative:** SQLite is not a behavioral subset of PostgreSQL — dialect quirks
  (e.g. JSONB operators) must be kept out of test-relevant code; the UUID/JSONB
  shim lives in `tests/conftest.py` and must be maintained alongside model changes.
- **Evidence:** `backend/tests/conftest.py:31-107`.

---

## ADR-004 — Human approval gates for architecture/development/security_review

**Status:** Accepted · **Date:** September 2026

### Context

An autonomous agent team that produces architecture, code, and security verdicts
should not operate without human oversight on high-impact artifacts. The product
requirement (`FR-200`/`FR-105`) calls for pausing at approval checkpoints and
resuming after a decision.

### Decision

Define a **gate set** `APPROVAL_REQUIRED_STAGES = {"architecture", "development",
"security_review"}` (`orchestrator_models.py:68`). For each gated stage, the
orchestrator:

1. creates an `Approval` in `pending` status with `action`, `reason`,
   `risk_level`, and `expected_result`;
2. creates a `Task` with `status="pending_approval"` and `requires_approval=True`;
3. sets the stage status to `waiting_approval` and stops;
4. after the user decides (POST .../approvals/{id}/decide), the workflow only
   progresses once `orchestrate/continue` is called — approved gates are
   completed, rejected gates are marked failed.

### Consequences

- **Positive:** supervised autonomy; the approval object carries the full
  decision context required by `FR-202`; the decide endpoint is idempotency-safe
  (400 on second decision); 3 approvals per project verified by test
  (`test_get_approvals`).
- **Negative:** workflow progress requires a manual "continue" step after each
  decision; approval decisions are not yet written to the `AuditLog` table
  (finding `F-DX-03`); `ApprovalDecision.decision` is an unconstrained string
  (finding `F-IV-02`).
- **Evidence:** `backend/app/ai/orchestrator_models.py:68`;
  `backend/app/ai/orchestrator.py:80-162`;
  `backend/app/api/entities.py:73-93`.

---

## ADR-005 — Mock (simulated) AI outputs for the MVP

**Status:** Accepted · **Date:** September 2026

### Context

The MVP must demonstrate the full orchestration pipeline — agents, tasks,
approvals, artifacts — end-to-end reliably, without depending on external LLM
availability, keys, or cost.

### Decision

Drive every agent with a deterministic simulation. `_simulate_agent_output`
returns a stage-specific structure (requirements FRs/NFRs/user stories; research
findings; product analysis; architecture components; DB tables; UI pages;
implementation phases; dev/testing/security findings; documents). The orchestrator
also materializes typed rows and documents:

- `requirements` → 4 `ProjectRequirement` rows + requirements Document
- `architecture` (after approval) → `ArchitectureComponent` rows + Document
- `research`/`documentation` → Documents
- every stage → `Task` + `TaskRun` + stage `output_data`

### Consequences

- **Positive:** full pipeline demoable in one `curl`/click; tests are fast and
  deterministic; the LLM seam (`LLM_PROVIDER`) is already in place to swap real
  inference later.
- **Negative:** no real world knowledge enters the outputs; the simulated "testing"
  and "security_review" payloads describe numbers that must not be mistaken for
  real measured values (the repo's real test numbers are documented in
  `docs/testing/testing-report.md`).
- **Evidence:** `backend/app/ai/orchestrator.py:227-329` (outputs),
  `backend/app/ai/orchestrator.py:331-370` (materialization).

---

## ADR-006 — Single monolith DB schema with JSONB for flexible payloads

**Status:** Accepted · **Date:** September 2026

### Context

The domain has strongly relational entities (users→projects→stages→tasks→runs→
approvals) *and* highly variable agent payloads (arbitrary task/stage output,
preferences, acceptance criteria).

### Decision

Use one PostgreSQL database. 14 tables designed in
`docs/architecture/database.md`; 11 domain entities (+ users) in
`backend/app/models/models.py`. Use **JSONB** for shapes that vary by stage
(`preferred_tech`, `output_data`, `input_data`, `acceptance_criteria`,
`capabilities`, `details`) while keeping the backbone fully normalized/pk-FK.
Foreign keys enable `cascade="all, delete-orphan"` cleanup on `Project`.

### Consequences

- **Positive:** schema flexibility for agent output without migrations per stage;
  correct relational integrity and ownership joins; validated on both PostgreSQL
  and the SQLite test shim.
- **Negative:** JSONB content is unvalidated by the DB; SQLAlchemy echo logging
  leaks payload PII in dev (finding `F-DX-01`).
- **Evidence:** `backend/app/models/models.py`; `docs/architecture/database.md`.

---

## ADR-007 — JWT bearer auth with HTTPBearer(auto_error=False)

**Status:** Accepted · **Date:** September 2026

### Context

FastAPI's default `HTTPBearer(auto_error=True)` returns **403** when the
`Authorization` header is missing, but the API contract and tests require
**401 Unauthenticated** for missing credentials to be consistent with the REST
convention (`test_protected_route_no_token`).

### Decision

Use `HTTPBearer(auto_error=False)` and treat a `None` credential explicitly in
`get_current_user`, raising `401 {"detail": "Not authenticated"}` with a
`WWW-Authenticate: Bearer` header. Invalid tokens still raise
`401 {"detail": "Invalid authentication credentials"}`.

### Consequences

- **Positive:** consistent 401 semantics for missing and malformed credentials;
  the auth test suite passes (25/25).
- **Negative:** password hashing via `passlib[bcrypt]` + `python-jose` carry the
  dependency risks documented in the security review (F-AUTH-07, F-DEP-01,
  F-DEP-02); refresh tokens are currently accepted by protected routes because
  the `type` claim is unchecked (F-AUTH-02).
- **Evidence:** `backend/app/core/security.py:12-56`; `backend/tests/test_auth.py:59-71`.

---

## Related Documents

- Requirements: `docs/requirements/` (FR-105, FR-106, FR-200–FR-203 map to ADR-004)
- Database design: `docs/architecture/database.md`
- Security review findings referenced above: `docs/security/security-review.md`
- Test results: `docs/testing/testing-report.md`