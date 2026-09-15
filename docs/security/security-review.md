# VirtualDev Studio — Security Review

- **Project:** VirtualDev Studio (AI-powered virtual software development studio)
- **Scope:** `backend/` (FastAPI API, AI orchestrator), `frontend/` (React/TypeScript), `mobile/` (Flutter)
- **Date:** September 15, 2026
- **Review type:** Static analysis of the actual codebase + behavioral verification via the API test suite
- **Methodology:** Trust-boundary mapping (user input vs. internal data), code inspection of every API entry point, WebSocket handler and orchestrator, dependency manifest review, and live test-suite execution against the real endpoints.

## 1. Executive Summary

The codebase is a prototype and is explicitly driven by a default "mock" AI provider. The strong points are correct (owner-scoped) project queries, parameterized ORM usage (no SQL injection), bcrypt password hashing, and response models that do not expose password hashes. The main gaps are production-readiness and defense-in-depth: a default JWT signing secret committed to source, an unauthenticated WebSocket channel, no rate limiting on authentication endpoints, a pinned `python-jose` release with published CVEs, and a `passlib`/`bcrypt` dependency combination that fails at runtime.

**Overall risk profile (current, pre-production):**

| Area | Risk | Key issue |
|------|------|-----------|
| Authentication | HIGH | Default `SECRET_KEY`, refresh token usable as access token |
| Authorization | MEDIUM | RBAC unused; task-runs IDOR; global agent endpoint |
| Input validation | MEDIUM | Pydantic models almost entirely unconstrained |
| API security | MEDIUM | No rate limiting; cleartext HTTP in clients |
| WebSocket | HIGH | No authentication or authorization |
| Secrets | HIGH | Committed default signing key; no env enforcement |
| SQL injection | LOW | None found (parameterized ORM) |
| Path traversal | LOW | No file endpoints exposed today |
| Dependencies | HIGH | `python-jose==3.3.0` CVEs; `passlib`/`bcrypt` runtime break |
| AI prompt injection | LOW | Mock provider today; needs gating when real LLM wired in |
| Data exposure | MEDIUM | SQL echo logging leaks PII; no audit trail |
| Logging | MEDIUM | `echo=True` SQL logging, unstructured, no correlation |

Critical-path items (AuthN/AuthZ/Secrets/Dependencies) **must be addressed before any internet-facing deployment**. The remaining items are hardening for later milestones.

---

## 2. Findings by Area

### 2.1 Authentication (JWT implementation)

#### F-AUTH-01 — Default JWT signing secret committed to source
- **Description:** `Settings.SECRET_KEY` ships with the literal default `"dev-secret-key-change-in-production"`. If this default is not overridden via environment, any attacker who knows the public source (it is in `config.py`) can forge valid access and refresh tokens for any user id, including admin-flagged accounts.
- **Location:** `backend/app/core/config.py:11`; used by `security.py:28,34,51`.
- **Risk level:** CRITICAL (complete authentication bypass if default is used in production).
- **Recommendation:** Remove the usable default (raise at startup if `SECRET_KEY` unset or still equal to the known dev value outside `DEBUG=True`); require a 32+ byte random secret via environment/vault; rotate on promotion. Consider `kdf`/HS256 secret length check.
- **Fix status:** Noted for future — required before any deployment.

#### F-AUTH-02 — Refresh token accepted as an access token
- **Description:** Access and refresh tokens are both signed HS256 JWTs carrying the same `sub`. `create_access_token` sets `type=access` and `create_refresh_token` sets `type=refresh`, but `get_current_user` never checks the `type` claim. A stolen refresh token (7-day lifetime) therefore works for every protected endpoint.
- **Location:** `backend/app/core/security.py:24-35` (creation), `security.py:50-56` (decode — no `type` check).
- **Risk level:** HIGH.
- **Recommendation:** Validate `payload.get("type") == "access"` in `get_current_user`; reject refresh-type tokens on API routes. Add dedicated `/auth/refresh` with rotation and revocation of the previous refresh token.
- **Fix status:** Noted for future.

#### F-AUTH-03 — No token revocation, rotation, or refresh endpoint
- **Description:** Refresh tokens are issued but there is no `/auth/refresh` endpoint and no blacklist/allowlist or `jti` tracking, so a leaked token remains valid for its full lifetime and cannot be revoked on logout or compromise. The web client stores only the access token (30 min) so it cannot renew sessions at all.
- **Location:** `backend/app/api/auth.py:36-37`; no refresh route exists; token claims lack `jti`/`iat`.
- **Risk level:** MEDIUM.
- **Recommendation:** Implement refresh-token rotation with a server-side revocation store (`jti`, user, expiry), issue `jti` and `iat`, and add a logout/revocation endpoint.
- **Fix status:** Noted for future.

#### F-AUTH-04 — No rate limiting / lockout on login and register
- **Description:** Auth endpoints are unprotected against brute force and enumeration. `NFR-102` (100 req/min) is not implemented anywhere. A distributed or single-source attack can cycle passwords and email addresses.
- **Location:** `backend/app/api/auth.py:12,29`; no middleware or slowapi in `requirements.txt`.
- **Risk level:** MEDIUM (password-guessing + account enumeration).
- **Recommendation:** Add per-IP + per-account rate limiting on `/auth/login` and `/auth/register` (e.g., slowapi/limits or nginx `limit_req`), plus exponential backoff after N failures.
- **Fix status:** Noted for future. Meets required `NFR-102`.

#### F-AUTH-05 — Weak account-existence oracle and no password policy
- **Description:** `/auth/register` returns `400 "Email already registered"` (distinct from success), enabling account enumeration. Login errors are correctly uniform (`"Invalid credentials"`). No password length/complexity rules and no email verification — an attacker can pre-register another user's email.
- **Location:** `backend/app/api/auth.py:16`; `backend/app/schemas/user.py:9` (password is bare `str`).
- **Risk level:** LOW (MEDIUM if emails are sensitive).
- **Recommendation:** Return a generic 400 on duplicates or verify email ownership; enforce a password minimum (e.g., ≥ 10 chars) in `UserCreate`; consider arsgon2d/bcrypt cost is fine (already bcrypt).
- **Fix status:** Noted for future.

#### F-AUTH-06 — Web token storage in `localStorage` (frontend)
- **Description:** The SPA stores the bearer token in `localStorage`, readable by any XSS payload running on the origin (e.g., via a compromised dependency or injected content). Compare the mobile client, which keeps tokens in memory only.
- **Location:** `frontend/src/services/api.ts:3-5` (`localStorage.getItem('vdev_token')`).
- **Risk level:** MEDIUM.
- **Recommendation:** Keep tokens in memory + short-lived session; use `httpOnly`+`Secure` cookies with CSRF protection, or at minimum mitigate XSS (CSP headers, careful `dangerouslySetInnerHTML` usage, dependency audit).
- **Fix status:** Noted for future.

#### F-AUTH-07 — JWT library pinned to a version with published CVEs
- **Description:** `python-jose==3.3.0` predates CVE-2024-33663 (JWK/algorithm-confusion handling) and CVE-2024-33664 (unauthenticated decompression-bomb DoS). The explicit `algorithms=[settings.ALGORITHM]` in `decode` mitigates the key-confusion case; no token-size limit mitigates the bomb case.
- **Location:** `backend/app/core/security.py:51`; `backend/requirements.txt:8`.
- **Risk level:** MEDIUM.
- **Recommendation:** Migrate to actively maintained `PyJWT` (>= 2.9) with `algorithms=["HS256"]`, enforce a max token length before decode.
- **Fix status:** Noted for future.

### 2.2 Authorization (RBAC, project ownership)

#### F-AZ-01 — Role attribute defined but RBAC never enforced
- **Description:** `User.role` defaults to `"user"`, and `NFR-101` calls for role-based access control, yet no endpoint inspects the role and no admin differ from any other user. Every authenticated user is treated identically.
- **Location:** `backend/app/models/user.py:21`; role unused throughout `app/api/`.
- **Risk level:** MEDIUM (for an app whose AI agents "act", privileged roles may later be needed; low immediate impact).
- **Recommendation:** Define roles (e.g., `user`, `admin`) and enforce them with a dependency (`require_role("admin")`); keep decomposition simple until an actual privileged capability exists.
- **Fix status:** Noted for future.

#### F-AZ-02 — Project ownership not checked on the agents endpoint
- **Description:** `GET /projects/{project_id}/agents` ignores the `project_id` entirely and returns the global list of active agents to any authenticated user — inconsistent with the ownership model used everywhere else.
- **Location:** `backend/app/api/entities.py:110-113`.
- **Risk level:** LOW (agent definitions are not user data, but the endpoint is misleading and leaks catalog info).
- **Recommendation:** Either scope agents to the project (verify ownership via `_verify_project`) or move the route out of `/{project_id}` and document it as a global catalog.
- **Fix status:** Noted for future.

#### F-AZ-03 — IDOR on task runs (cross-user data read)
- **Description:** `GET /projects/{project_id}/tasks/{task_id}/runs` verifies the user owns `project_id`, then queries `TaskRun` filtered **only** by `task_id`. If an attacker knows a `task_id` belonging to another user's project, they can read that project's task run output, error messages, and token usage. (Same pattern exists for `decide_approval` unsafe in the other direction: it *does* constrain `approval.project_id == project_id`; fix `get_task_runs` to match.)
- **Location:** `backend/app/api/entities.py:59-63`.
- **Risk level:** HIGH (breaks the tenant-isolation boundary).
- **Recommendation:** Join on `Task` and enforce `Task.project_id == project_id` (and `TaskRun.task_id == task_id`) before returning runs.
- **Fix status:** Noted for future.

#### F-AZ-04 — Ownership checks on remaining entities are correct
- **Description:** `_verify_project` gates requirements, research, architecture, tasks, approvals, documents, diagrams; project CRUD, stages, and orchestration endpoints all filter by `owner_id`. Verified by the test suite (non-owner/nonexistent projects consistently return 404).
- **Location:** `backend/app/api/entities.py:21-28`; `backend/app/api/projects.py:26-27,73-75,90-92,112-114`; `backend/app/api/orchestrate.py:23-24,46-48`.
- **Risk level:** Informational (positive control).
- **Recommendation:** None. Keep this pattern; it is the reference implementation for new endpoints.
- **Fix status:** n/a.

### 2.3 Input Validation (Pydantic models)

#### F-IV-01 — Pydantic models are effectively unconstrained
- **Description:** `UserCreate.email` is a bare `str` (the codebase even imports `EmailStr` and doesn't use it), `password` has no minimum length, `full_name` no max, `ProjectCreate.name`/`description` are unbounded, and `preferred_tech` accepts arbitrary nested lists. Oversized or malformed payloads are stored as-is in PostgreSQL (data bloat) and slugs/emails are never normalized.
- **Location:** `backend/app/schemas/user.py:6-9`; `backend/app/schemas/project.py:7-21`.
- **Risk level:** MEDIUM (data-integrity, storage DoS with huge fields, minor injection-of-metadata surface).
- **Recommendation:** Add `EmailStr`, `min_length`/`max_length` bounds, password policy, `Field(le=...)` for progress, and normalized email (lowercase) at the schema layer. `NFR-103` is otherwise not met.
- **Fix status:** Noted for future.

#### F-IV-02 — Approval decision accepts arbitrary strings
- **Description:** `ApprovalDecision.decision` is an unconstrained `str`; values like `"yes why not"` are stored into `decisions`. A later automation step that branches on `decision == "approved"` would silently skip long/typo values with no validation error.
- **Location:** `backend/app/schemas/project_entities.py:125-127`; applied at `entities.py:87`.
- **Risk level:** MEDIUM.
- **Recommendation:** Restrict `decision` to a `Literal["approved", "rejected"]` (or an enum).
- **Fix status:** Noted for future.

#### F-IV-03 — Unbounded project progress value
- **Description:** `ProjectUpdate.progress` is a free `int`; clients can set `-50` or `500`, corrupting progress reporting consumed by the dashboard.
- **Location:** `backend/app/schemas/project.py:22`.
- **Risk level:** LOW.
- **Recommendation:** `progress: int = Field(default=0, ge=0, le=100)`.
- **Fix status:** Noted for future.

### 2.4 API Security (CORS, rate limiting)

#### F-API-01 — No rate limiting on any endpoint
- **Description:** None of the 20+ routes apply rate limiting; `requirements.txt` has no rate-limit library. Meets none of `NFR-102`. Combined with F-AUTH-04 this allows credential brute force and cheap DoS on the synchronous orchestration endpoint (see F-API-07).
- **Location:** global; `backend/app/main.py:22-25` (no throttling middleware).
- **Risk level:** MEDIUM.
- **Recommendation:** Add per-route or per-user rate limiting (slowapi), or enforce at the reverse-proxy/API-gateway layer in production.
- **Fix status:** Noted for future.

#### F-API-02 — CORS configuration is allowlisted but loose
- **Description:** `CORS_ORIGINS` defaults to two localhost origins with `allow_credentials=True` and wildcard methods/headers. With an explicit, non-wildcard origin list this is acceptable; the danger is configuring `["*"]` (or overriding the env) — `allow_credentials=True` + `"*"` forces browsers to reject, and any other origin then becomes allowed via misconfiguration.
- **Location:** `backend/app/core/config.py:16`; `backend/app/main.py:14-20`.
- **Risk level:** LOW.
- **Recommendation:** Keep an explicit production origin allowlist and reject wildcard-origin with credentials at startup when `DEBUG=False`.
- **Fix status:** Noted for future.

#### F-API-03 — Cleartext transport in clients (no TLS)
- **Description:** Frontend and mobile hard-code `http://localhost:8000/...` and `ws://localhost:8000/...`. On a real deployment (mobile device, remote server) credentials and tokens travel unencrypted; `localhost` is also wrong for mobile-on-device.
- **Location:** `frontend/src/services/api.ts:1`; `mobile/lib/services/api_service.dart:23`; `mobile/lib/services/websocket_service.dart:22`.
- **Risk level:** MEDIUM.
- **Recommendation:** Make base URLs configurable per environment, terminate TLS at deployment, use `https://`/`wss://`, and force `HTTPS` redirect (plus HSTS header).
- **Fix status:** Noted for future.

#### F-API-04 — No structured error contract; raw 500s reachable
- **Description:** The `ErrorResponse` schema (`code` + `detail`) exists but is never used. Several unhandled runtime paths — e.g., `POST /projects/{id}/orchestrate/continue` raising `MultipleResultsFound`/`AttributeError` (see Appendix) — surface as generic 500s instead of actionable, non-informative responses.
- **Location:** `backend/app/schemas/project_entities.py:171-173`; `backend/app/api/orchestrate.py:61-63`.
- **Risk level:** MEDIUM (information leakage in tracebacks during debug + poor client handling).
- **Recommendation:** Central exception handlers returning the `ErrorResponse` shape; ensure stack traces are never returned to clients (only logged).
- **Fix status:** Noted for future.

#### F-API-05 — Synchronous long-running orchestration in the request path
- **Description:** `POST /orchestrate/start` runs the entire simulated workflow (dozens of DB commits) synchronously inside the request. Under concurrent starts this both blocks the event loop and hammers the database, making the endpoint a convenience DoS/self-DoS target.
- **Location:** `backend/app/api/orchestrate.py:30-31` → `app/ai/orchestrator.py:47-54`.
- **Risk level:** MEDIUM.
- **Recommendation:** Move orchestration to a background task queue (e.g., `asyncio.create_task` with ownership guards, or a worker) and return a 202 with a status endpoint.
- **Fix status:** Noted for future.

### 2.5 WebSocket Security

#### F-WS-01 — WebSocket endpoint has no authentication or authorization
- **Description:** `GET /ws/projects/{project_id}` accepts any connection, immediately registers it in the connection manager for that project, and will receive `broadcast()` payloads. There is no token check, no project-ownership check, and no subprotocol/Origin validation. Since the orchestrator intends to push project progress over this channel (`orchestrator.websocket_manager`), unauthenticated clients can subscribe to a channel and (once broadcasting is wired up) receive another user's project events.
- **Location:** `backend/app/api/websocket.py:38-48`, `websocket.py:14-18`; `backend/app/ai/orchestrator.py:24`.
- **Risk level:** HIGH.
- **Recommendation:** Authenticate on the handshake (validate `Authorization: Bearer` token from headers/query/subprotocol), verify the authenticated user owns `project_id`, validate `Origin` against the CORS allowlist, and reject with `websocket.close(code=1008)` when invalid. Add a per-user max-connection cap.
- **Fix status:** Noted for future.

#### F-WS-02 — No message validation, size limits, or malformed-JSON handling
- **Description:** Inbound frames are `json.loads`'d with no size limit and only `WebSocketDisconnect` is caught; a `json.JSONDecodeError` (or any exception) propagates out of the loop, and oversized/serialized messages are accepted by the framework's default 1 MB receive cap. This enables connection-slot exhaustion DoS and noisy error paths.
- **Location:** `backend/app/api/websocket.py:42-46`.
- **Risk level:** MEDIUM.
- **Recommendation:** Enforce a max frame size, wrap parsing, respond `{"type":"error"}` and continue, and move per-connection work into try/except.
- **Fix status:** Noted for future.

#### F-WS-03 — Broadcast errors silently swallowed
- **Description:** `broadcast()` catches every `Exception` with `pass`, leaving stuck/erroring sockets in the active list and providing zero observability.
- **Location:** `backend/app/api/websocket.py:29-32`.
- **Risk level:** LOW.
- **Recommendation:** Log a rate-limited warning and prune dead connections.
- **Fix status:** Noted for future.

### 2.6 Secrets Management

#### F-SEC-01 — Secrets in source (signing key) with no environment enforcement
- **Description:** Beyond the default `SECRET_KEY` (F-AUTH-01), `Settings` reads `LLM_API_KEY` with an empty default and `DATABASE_URL` with embedded `postgres:postgres` credentials. There is no startup validation that production secrets differ from dev defaults, and no `.env.example` to make the required variables explicit.
- **Location:** `backend/app/core/config.py:10-12,14,19`.
- **Risk level:** HIGH (extends F-AUTH-01/CRITICAL).
- **Recommendation:** Fail fast in non-debug mode when `SECRET_KEY` is unset/dev-default; load all secrets from environment or a secret manager; ship a `.env.example` with placeholders; add `.env` to `.gitignore`.
- **Fix status:** Noted for future.

#### F-SEC-02 — No secret scanning or CI gate
- **Description:** Repository is not a git repo and there is no scanning (gitleaks, detect-secrets, pip-audit) or CI yet; there is no `.gitignore`/`.env` hygiene baseline to protect against accidental commits.
- **Location:** repository root.
- **Risk level:** LOW.
- **Recommendation:** Initialize VCS + CI with secret scanning and dependency auditing before sharing the repo.
- **Fix status:** Noted for future.

### 2.7 SQL Injection (SQLAlchemy ORM usage)

#### F-SQL-01 — Parameterized queries; no SQL injection found
- **Description:** Every query uses SQLAlchemy Core/ORM `select` with bound parameters (e.g., `select(Project).where(Project.owner_id == current_user.id)`). User input becomes bound values, never embedded SQL text. No raw `text()`/`exec_driver_sql` with user input, no f-string SQL, no stored procedures. JSONB columns are typed, so parameters are safe structurally.
- **Location:** all of `backend/app/api/*.py`, `backend/app/ai/orchestrator.py`.
- **Risk level:** None found (control verified by inspection and by test coverage hitting these paths).
- **Recommendation:** Keep this rule (ORM/by default) and add a lint guard (e.g., bandit rule S608/S610 or `ruff` raw-SQL checks) to avoid regressions.
- **Fix status:** n/a.

### 2.8 Path Traversal

#### F-PT-01 — No file-serving attack surface today; needs guarding once file storage is added
- **Description:** `Diagram.rendered_path` and `Presentation.file_path` columns exist but no API endpoint serves or writes files from user-controlled paths; the orchestrator writes nothing to disk. There is currently no path traversal vector.
- **Location:** `backend/app/models/models.py:186,199`; no serving endpoint in `app/api/`.
- **Risk level:** LOW (latent).
- **Recommendation:** When generated artifacts (diagrams, presentations, PDFs) are served, resolve paths with `os.path.realpath` and assert containment under a dedicated artifact root; never trust an artifact name returned by clients.
- **Fix status:** Noted for future.

### 2.9 Dependency Risks

#### F-DEP-01 — `python-jose==3.3.0` carries known CVEs and is unmaintained
- **Description:** Versions < 3.4.0 are affected by CVE-2024-33663 (algorithm/JWK confusion) and CVE-2024-33664 (JWT decompression bomb DoS). The project explicitly pins 3.3.0. See F-AUTH-07.
- **Location:** `backend/requirements.txt:8`.
- **Risk level:** HIGH.
- **Recommendation:** Replace with `PyJWT` (>= 2.9) — same HS256 workflow, better maintained. Also cap token size before decoding.
- **Fix status:** Noted for future.

#### F-DEP-02 — `passlib[bcrypt]==1.7.4` breaks with current bcrypt
- **Description:** Verified during the test run: `passlib` 1.7.4 crashes against `bcrypt>=4.1` (missing `bcrypt.__about__`) and against `bcrypt>=5.0` (raises `ValueError` for > 72-byte inputs before passlib can truncate). Because the pin installs *latest* bcrypt, registration/login can fail at runtime with a fresh install. Additionally, submitting a > 72-byte password makes auth endpoints raise 500 (small DoS surface).
- **Location:** `backend/requirements.txt:9`; `backend/app/core/security.py:12`.
- **Risk level:** HIGH (auth functionality can be broken; error path is a DoS vector).
- **Recommendation:** Pin a compatible `bcrypt<4.1` (e.g., `bcrypt==4.0.1`) and `password_truncate` handled explicitly, or migrate hashing to `argon2-cffi`. Enforce a max password length at the schema (protects bcrypt's 72-byte limit).
- **Fix status:** Noted for future.

#### F-DEP-03 — `python-multipart==0.0.12` and `starlette` (via fastapi 0.115.0) multipart CVEs
- **Description:** `python-multipart < 0.0.19` has CVE-2024-53981 (unbounded multipart parsing DoS); the starlette 0.38.x range is linked to CVE-2024-47874 (multipart/memory DoS). These are **not currently reachable** (the app defines no file-upload/`Form` routes), but they become live the moment uploads are added.
- **Location:** `backend/requirements.txt:11` (python-multipart), `:1` (fastapi 0.115.0 → starlette 0.38.6).
- **Risk level:** LOW today, HIGH once multipart is used.
- **Recommendation:** Upgrade `python-multipart >= 0.0.19` now; bump `fastapi`/`starlette` in the next training pass. Consider it required when adding document/diagram upload endpoints.
- **Fix status:** Noted for future.

### 2.10 AI Prompt-Injection Risks

#### F-AI-01 — Untrusted user content will flow into prompts when a real LLM is enabled
- **Description:** The orchestrator currently runs a deterministic mock (`LLM_PROVIDER="mock"`); no prompt is assembled or LLM invoked. The moment `LLM_PROVIDER` is switched to a real model, project descriptions, target-user text, constraints, and research findings (all user/retrieved, untrusted) would be embedded into agent prompts. There is no instruction/sanitization layer today: no separation of system-vs-data, no output schema enforcement, no tool-argument allowlist, and no prompt-injection audits. Given the agents produce "code" and gate actions through approvals (a good control), injection could steer an agent's output or bypass intent if approvals become rubber-stamped.
- **Location:** `backend/app/ai/orchestrator.py:171-273` (mock only), `:80-106` (approval gates), `backend/app/core/config.py:18-20` (LLM settings ready to enable); project text fields flow from `app/api/projects.py:39-50`.
- **Risk level:** LOW (current) / MEDIUM-HIGH (as soon as a real LLM provider is enabled).
- **Recommendation:** Treat all model inputs as untrusted: define strict system instructions, delimit variable vs. instruction content, validate outputs against schemas before storing/using, keep human approval gates mandatory for write/code actions, and do not echo retrieved/user content back into agent system prompts verbatim. Add prompt-injection canaries/tests before flipping off mock mode.
- **Fix status:** Noted for future.

#### F-AI-02 — Agent "tools" currently have no privileged actions
- **Description:** Agents only select roles/agents, write tasks/task runs/stage outputs, and raise approvals. There is no shell/filesystem/network tooling, so injection today cannot escalate directly; the mitigation above is to keep it that way when adding tools.
- **Location:** `backend/app/ai/orchestrator.py:33-45,108-169`.
- **Risk level:** LOW.
- **Recommendation:** When introducing tools (docs rendering, codegen to disk), gate each behind per-agent authority and user approval, and validate arguments with Pydantic schemas (see `mcp-tool-engineer` guidance).
- **Fix status:** Noted for future.

### 2.11 Data Exposure

#### F-DX-01 — SQLAlchemy echo logging enabled by default leaks PII
- **Description:** `engine = create_async_engine(..., echo=settings.DEBUG)` and `DEBUG: bool = True` by default. `echo=True` writes every SQL statement **and its bound parameters** to the process logs — including emails, full names, and JSONB payloads as they flow through queries. In an always-on logging environment this accumulates PII with no retention policy.
- **Location:** `backend/app/core/database.py:6`; `backend/app/core/config.py:8`.
- **Risk level:** MEDIUM.
- **Recommendation:** Default `DEBUG=False`; drive `echo` from an explicit `SQL_ECHO` env var that is off in production; sanitize structured logs otherwise.
- **Fix status:** Noted for future.

#### F-DX-02 — Response schemas correctly exclude the password hash
- **Description:** `UserResponse` returns id/email/full_name/role/is_active/created_at only; `hashed_password` is never serialized. Registration/login responses include no hash or internal fields. Verified by test `test_register_success`.
- **Location:** `backend/app/schemas/user.py:17-26`; `backend/app/api/auth.py:12,29`.
- **Risk level:** Informational (positive control).
- **Recommendation:** Maintain this pattern; add a rule that response schemas never reuse `from_attributes=True` model-wide on `User`.
- **Fix status:** n/a.

#### F-DX-03 — No audit trail for sensitive decisions
- **Description:** An `AuditLog` table exists (and is wired via cascade) but nothing ever writes to it. Approval decisions ("approve X architecture"), orchestration actions, and logins have zero accountability; this is a compliance and misuse-detection gap for an AI system making consequential calls.
- **Location:** `backend/app/models/models.py:223-236` (model defined); no writer anywhere in `app/`.
- **Risk level:** MEDIUM.
- **Recommendation:** Write audit records for auth events, approval decisions, orchestration starts, and role/data changes (`entity_type`, `entity_id`, `details`, `ip_address` are already modeled). Store at least actionator + timestamp + IP.
- **Fix status:** Noted for future.

### 2.12 Logging Security

#### F-LOG-01 — Verbose debug/SQL logging enabled by default (see F-DX-01)
- **Description:** Combined with the fail-closed concerns above, production risk is that `DEBUG=True` persists and `echo=True` leaks PII into logs.
- **Location:** `backend/app/core/config.py:8`, `backend/app/core/database.py:6`.
- **Risk level:** MEDIUM.
- **Recommendation:** Environment-driven log level; never log request bodies, passwords, or tokens; set `echo` off in prod.
- **Fix status:** Noted for future.

#### F-LOG-02 — No request/scoped logging, no correlation IDs, silent WS failures
- **Description:** The app has no request logging middleware, no `request_id` threading, an empty audit log, and a WebSocket broadcast that swallows exceptions silently (`websocket.py:29-32`). Debugging production incidents and detecting abuse becomes guesswork.
- **Location:** `backend/app/main.py:1-31`; `backend/app/api/websocket.py:26-32`.
- **Risk level:** LOW.
- **Recommendation:** Add structured JSON logging with correlation IDs per request/WebSocket connection; log auth failures (rate-limited), start/end of orchestration, and broadcast errors.
- **Fix status:** Noted for future.

---

## 3. Verification Notes (from the executed test suite)

- The full API test suite (auth, projects, entities, orchestration) was executed against a fresh schema with `TEST_DATABASE_URL`:
  - **Result:** `24 passed, 1 xfailed`.
- The single expected failure (`test_continue_orchestration`) confirms two genuine functional defects in `app/api/orchestrate.py::continue_orchestration`:
  1. `stage_result.scalar_one_or_none()` applied to a multi-row result (all non-completed stages) raises `MultipleResultsFound`.
  2. `_execute_stage(next_stage.stage_name, None, ...)` dereferences `None.value` in `get_or_create_agent`.
  These are functional/reliability bugs (not security), flagged here because they are surfaced by the test work and can be abused to force repeated 500 responses (a trivial DoS amplification available to the project owner themselves).
- Verified behaviors that underpin the review: refresh-type tokens pass through `get_current_user` (F-AUTH-02), missing bearer yields 403/401 consistent with `HTTPBearer`, and ownership checks return 404 for foreign projects (F-AZ-04).

---

## 4. Remediation Priorities

| Priority | Finding(s) | Effort |
|----------|-----------|--------|
| P0 — before any deployment | F-AUTH-01/F-SEC-01 default secret key; F-WS-01 WS auth; F-DEP-01 python-jose; F-DEP-02 passlib/bcrypt | Small |
| P1 — before internet exposure | F-AZ-03 task-runs IDOR; F-AUTH-02 refresh-as-access; F-API-01/F-AUTH-04 rate limiting; F-API-03 TLS | Small |
| P2 — hardening | F-IV-01/02/03 validation; F-AZ-01 RBAC; F-DX-03 audit log; F-LOG-01/SQL echo; F-AI-01 prompt security | Medium |
| P3 — backlog | F-AUTH-03 rotation; F-AUTH-05 policy; F-AUTH-06 localStorage; F-API-02/04/05; F-LOG-02; F-PT-01; F-DEP-03 | Medium |

## 5. Positive Controls Observed

- Bcrypt password hashing via passlib (mirror to keep).
- Owner-scoped queries on all project data (reference implementation to keep).
- No SQL injection — fully parameterized ORM.
- No path traversal surface today.
- Responses never serialize the password hash.
- Uniform login error messages.
- Explicit CORS allowlist (defaults).
- Human approval gates exist for write/code-producing stages.
- Tests pass with a database that has the same schema/behavior as production.

---

*Review was performed as a static analysis pass plus behavioral verification against the running API. Findings reflect the codebase at the time of writing; fix status items marked "noted for future" should be re-verified after each corresponding change.*