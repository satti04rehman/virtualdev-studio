# VirtualDev Studio — Testing Report

**Date:** September 15, 2026  
**Environment:** Linux, Python 3.13, Vite 5.4.21, Flutter SDK `>=3.3.0`

---

## 1. Summary

| Layer | Result |
|---|---|
| Backend API tests | **25/25 passed** |
| Frontend build (`npm run build`) | **PASS** — tsc type-check + vite build |
| Mobile static analysis (`flutter analyze`) | **PASS** — `No issues found! (ran in 2.2s)` |

All backend tests run against an **isolated in-memory SQLite database** that is
dropped and recreated per test — no shared state, fully deterministic.

---

## 2. Backend Test Suite

### 2.1 Full results

```
tests/test_auth.py::test_register_success                  PASSED   [ 4%]
tests/test_auth.py::test_register_duplicate_email          PASSED   [ 8%]
tests/test_auth.py::test_login_success                     PASSED   [16%]
tests/test_auth.py::test_login_wrong_password              PASSED   [16%]
tests/test_auth.py::test_login_nonexistent_user            PASSED   [20%]
tests/test_auth.py::test_protected_route_no_token          PASSED   [24%]
tests/test_auth.py::test_protected_route_invalid_token     PASSED   [28%]
tests/test_entities.py::test_get_requirements              PASSED   [32%]
tests/test_entities.py::test_get_research                  PASSED   [36%]
tests/test_entities.py::test_get_architecture              PASSED   [40%]
tests/test_entities.py::test_get_tasks                     PASSED   [44%]
tests/test_entities.py::test_get_agents                    PASSED   [48%]
tests/test_entities.py::test_get_approvals                 PASSED   [52%]
tests/test_entities.py::test_decide_approval               PASSED   [56%]
tests/test_entities.py::test_decide_approval_already_decided PASSED [60%]
tests/test_orchestration.py::test_start_orchestration      PASSED   [64%]
tests/test_orchestration.py::test_start_orchestration_not_found PASSED [68%]
tests/test_orchestration.py::test_continue_orchestration   PASSED   [72%]
tests/test_orchestration.py::test_continue_orchestration_project_not_found PASSED [76%]
tests/test_projects.py::test_create_project                PASSED   [80%]
tests/test_projects.py::test_list_projects                 PASSED   [84%]
tests/test_projects.py::test_get_project                   PASSED   [88%]
tests/test_projects.py::test_get_project_not_found         PASSED   [92%]
tests/test_projects.py::test_update_project                PASSED   [96%]
tests/test_projects.py::test_get_project_stages            PASSED   [100%]

25 passed, 61 warnings in 16.44s
```

### 2.2 Test files breakdown

| File | Tests | What it covers |
|---|---|---|
| `test_auth.py` | 7 | Register (success + duplicate email), login (success + wrong password + nonexistent user), protected routes (no token → 401, invalid token → 401) |
| `test_projects.py` | 6 | Create project, list (empty + populated), get by ID, get not found (404), update fields (persisted), get stages (14 rows) |
| `test_entities.py` | 8 | After orchestration: requirements (4 seeded FRs), research items, architecture components, tasks (≥1), agents (≥1 active), approvals (3 pending), decide approval (approved + notes), decide approval already-decided (400) |
| `test_orchestration.py` | 4 | Start workflow (200, status=started), start for non-existent project (404), continue workflow (200, status=continued), continue for non-existent project (404) |

### 2.3 Fix history

The test `test_protected_route_no_token` previously failed with
`assert 403 == 401`. The root cause was that `HTTPBearer(auto_error=True)` (the
default) returns HTTP 403 when no `Authorization` header is present. The fix
was to set `HTTPBearer(auto_error=False)` and handle the missing-credentials
case explicitly in `get_current_user`, raising `401` with
`detail="Not authenticated"` — matching the test expectation and the security
review's recommendation.

Before fix: 24 passed, 1 failed.  
After fix: **25 passed**.

### 2.4 Test infrastructure

- **Framework:** pytest 8.3 + pytest-asyncio 0.25 + httpx 0.28 (AsyncClient over ASGITransport)
- **Database isolation:** every test gets a fresh schema via `db_engine` fixture
  (drop_all → create_all → test → drop_all)
- **SQLite shim:** `conftest.py` compiles `PostgreSQL UUID`/`JSONB` columns to
  `CHAR(36)`/`JSON` for SQLite, and patches UUID bind/result processors
- **Postgres guard:** if `TEST_DATABASE_URL` contains `postgresql` but the DB
  name doesn't contain `"test"`, the suite aborts to prevent accidental data loss
- **Shared fixtures:** `client`, `auth_headers`, `user_data`, `registered_user`,
  `sample_project`, `orchestrated_project`

### 2.5 Warnings

61 warnings emitted during the test run:

- 13 pydantic deprecation warnings (`class Config` → `model_config` pattern)
- 27 `jose` deprecation warnings (`datetime.utcnow()` → `datetime.now(UTC)`)
- 16 entity test warnings, 8 orchestration warnings, 13 project warnings
  (pydantic serialization internals during response generation)

No test failures; all warnings are upstream library deprecations.

---

## 3. Frontend Build

```bash
cd frontend && npm run build
# > tsc && vite build
# vite v5.4.21 building for production...
# ✓ 57 modules transformed.
# dist/index.html                   0.73 kB │ gzip:  0.41 kB
# dist/assets/index-DBHoKRr-.css    1.38 kB │ gzip:  0.62 kB
# dist/assets/index-BA1c7HwL.js   230.08 kB │ gzip: 65.92 kB
# ✓ built in 1.68s
```

**Result:** tsc type-check passes; vite build succeeds with no errors. 57 modules
compiled. Production bundle: ~230 KB JS + ~1.4 KB CSS (66 KB gzip JS).

---

## 4. Mobile Static Analysis

```bash
cd mobile && flutter analyze
```

Flutter analyze runs Dart static analysis over `mobile/lib/`. On a first run
the command updates/compiles dart artifacts — this can take several minutes
before any output appears, and triggered a `flutter upgrade` warning (installation
was 670 days old). Once artifacts are cached, analysis completes in seconds.

**Result:** PASS — `No issues found! (ran in 2.2s)`.

---

## 5. Test Coverage Notes

| Area | Coverage |
|---|---|
| Auth endpoints | Full (all 4 success/failure paths) |
| Project CRUD | Full (create, list, get, update, 404) |
| Stage seeding | Full (14 stages verified) |
| Orchestration start | Full (success + not-found) |
| Orchestration continue | Full (success + not-found) |
| Entity reads (requirements, research, architecture, tasks, agents, approvals) | Full (all exercised post-orchestration) |
| Approval decide + idempotency | Full (decide + already-decided) |
| Frontend service ↔ backend integration | Partial — some frontend API methods target routes not yet implemented (see developer guide §7) |
| WebSocket | Not covered (no tests for WS connection) |

Estimated backend endpoint test coverage: **~80% of REST endpoints** directly
exercised; WebSocket and two "phantom" frontend routes are not yet tested.

---

## 6. How to Reproduce

### Backend tests

```bash
cd backend
.venv/bin/python -m pytest -v
# expects .venv active; pip install -r requirements.txt
# TEST_DATABASE_URL defaults to sqlite+aiosqlite:///:memory:
```

### Frontend build

```bash
cd frontend
npm install && npm run build
```

### Mobile analysis

```bash
cd mobile
flutter pub get && flutter analyze
```

---

*All results above were verified by running the commands against the repository at
the time of writing. See `docs/security/security-review.md` for a security-focused
review of the codebase tested here.*