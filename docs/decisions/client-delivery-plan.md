# VirtualDev Studio — Client Delivery Plan

**Document:** Client Delivery Plan & Handover Package
**Project:** VirtualDev Studio — AI-powered virtual software development studio (MVP)
**Author:** Delivery Lead
**Date:** September 15, 2026
**Version:** 1.0
**Status:** Draft for client review
**Classification:** Client-facing

**Reference documents:** `docs/requirements/*` (statement, target users, stories, functional requirements, non-functional requirements, scope & constraints), `docs/architecture/*`, `docs/research/market-research.md`, `docs/security/security-review.md`.

**Effort estimate convention:** All estimates are **PROPOSAL** figures for a single senior full-stack engineer, unless stated otherwise. They are planning numbers, not a fixed quotation; actual effort will be tracked and re-forecast at each milestone.

---

## 1. Purpose

This document defines what will be delivered for the VirtualDev Studio MVP (Phase 1), how the work will be phased, what is out of scope, the estimated effort, and how the finished system is handed over and accepted. It is the single source of truth for the delivery engagement; any change to scope, schedule, or effort is recorded in §10 (Change Control).

---

## 2. Project Scope

### 2.1 In Scope (MVP — Phase 1)

The MVP is a working, deployable system where a user submits a product idea and VirtualDev Studio — through a coordinated team of specialized AI agents — produces a structured, reviewed, documented project package, with human approval at critical checkpoints. Scoped from `scope-constraints.md`:

1. **Web dashboard (React + TypeScript)** — landing, authentication, project dashboard, project creation with structured input, project workspace, per-stage views, AI Team page, approvals, and final project package download.
2. **Backend API (Python + FastAPI, REST)** — project CRUD, auth (JWT), task/agent/approval entities, orchestration endpoints, health.
3. **AI orchestrator with 5+ specialized agents (MVP roles)** — Requirements Analyst, Researcher, Product Strategist, Architect, Database Engineer, UI/UX Designer, Documentation Engineer, with an LLM-provider abstraction layer; agent outputs use structured/simulated responses for the MVP (see §5 Assumptions).
4. **Human approval workflow** — require approval before architecture decisions and destructive operations; display action, reason, risk level, and expected result; support approve / reject / modify.
5. **Real-time status** — WebSocket connections for live task updates and agent activity logs.
6. **Project state persistence** — PostgreSQL, all stages/tasks/artifacts/approvals/audit history persisted.
7. **Project deliverables view** — organized screens for requirements, research, architecture, database design, UI/UX, implementation plan, documentation; zip download of the final package.
8. **Testing** — backend automated tests (pytest) covering critical paths; frontend component tests.
9. **Documentation package** — README, user guide, developer guide, API reference, architecture & database design docs, security review, diagrams, and a project presentation (see Deliverables).
10. **Deployment** — Docker Compose-based deployment for a single-VM production environment with reverse proxy, backups, and monitoring hooks.

### 2.2 Scope Boundaries

- **Single-user per account** for the MVP (A-002) — no multi-user collaboration in this engagement.
- **Sequential workflow** in the orchestrator first; parallelism only if effort allows (R-002 mitigation).
- Mobile, code generation, test execution, security scanning, automated diagrams/presentation, Git integration, billing, and multi-user features are **explicitly deferred to Phase 2** (see §6).

---

## 3. Deliverables

| # | Deliverable | Format / Location | Acceptance reference |
|---|---|---|---|
| D1 | Web application (dashboard, workspace, stage views, approvals, package download) | `frontend/` (React + TS, Vite build) | §9, AC-01…AC-10 |
| D2 | Backend API + orchestration engine (live in-memory workflow, mock LLM) | `backend/` (FastAPI + SQLAlchemy) | §9, AC-01…AC-10 |
| D3 | PostgreSQL schema with migrations | Alembic migrations | §9, AC-06 |
| D4 | WebSocket real-time updates | Backend WS + frontend hooks | §9, AC-05 |
| D5 | Automated test suite | `backend/tests/` (pytest) | §9, AC-04 |
| D6 | Documentation package (README, user guide, developer guide, API reference, architecture, database design, security review) | `docs/` | §9, AC-08 |
| D7 | Diagrams (architecture, ERD, component, data-flow, sequence, deployment) | `docs/diagrams/` (Mermaid source) | §9, AC-08 |
| D8 | Project presentation | `docs/presentation/VirtualDev-Studio-Presentation.pptx` | §9, AC-08 |
| D9 | Deployment configuration (Docker Compose, reverse proxy, env templates w/o secrets) | `deploy/` or repo root | §9, AC-09 |
| D10 | Handover package (this plan's §8 content, credentials addendum via secure channel) | `docs/decisions/` + secure share | §9, AC-10 |

**Deliverables do not include** (see §6 Exclusions): real LLM inference integration, production code compilation/execution sandbox, mobile app, third-party billing/payment integrations, and any Phase 2 agent roles (developer, tester, security scanner).

---

## 4. Implementation Phases

| Phase | Name | Description | Exit criteria |
|---|---|---|---|
| **P0** | Discovery & Specification | Confirm business context, walk the existing docs, lock acceptance criteria, set up environments (dev, staging, prod), seed the tracker | Approved scope & acceptance checklist; environments provisioned |
| **P1** | Backend Foundation | FastAPI project setup, config, core utilities, JWT auth, user + project models, Alembic migrations, project CRUD, seed data (default agents) | All schema migrations apply; auth + project endpoints tested |
| **P2** | AI Orchestrator & Approval Engine | Agent registry, workflow state machine (11 stages), orchestration loop, LLM-provider abstraction with mock responses, approval engine (action/reason/risk/result, approve/reject/modify), failure retry/escalation, audit logging, progress computation | Full pipeline runs end-to-end in tests with approval gates enforced |
| **P3** | Frontend Application | React + TS scaffold, routing, layout, auth pages, dashboard, create project, project workspace, stage views (requirements, research, architecture, DB, UI/UX, implementation plan, documentation), AI Team page, task execution view, approval cards, final package download | All user stories US-001…US-010 demonstrable |
| **P4** | Real-Time Integration | WebSocket connection manager, live task/agent streaming events, reconnect + queueing, notification of pending approvals | Live status streams; WS events delivered < 100 ms |
| **P5** | Testing & QA | Backend pytest suite (auth, projects, entities, orchestration), frontend component tests, integration test of a full pipeline, performance/load sanity, UAT prep | ≥ 70% coverage on critical paths; full pipeline green |
| **P6** | Security Review & Hardening | Dependency scan, auth/authz audit, input validation, rate limiting, secrets handling, CORS/TLS posture, write-up of findings to engineering decision | Security review doc delivered; high findings closed |
| **P7** | Documentation & Deliverables | User guide, developer guide, API reference, architecture & database docs, diagrams, presentation (D6–D8) | Deliverables complete and cross-referenced |
| **P8** | Deployment & DevOps | Docker Compose stack, reverse proxy/TLS, env templates, backup config, monitoring hooks, CI/CD pipeline, production deployment | Fresh server deploys from documented runbook |
| **P9** | Handover & Close-out | Client walkthrough, UAT sessions, fixes from UAT, final acceptance, handover package delivered, support period begins | Signed acceptance (§9); handover delivered |

**Dependency note:** P3 depends on P1/P2 API stability; P4 depends on P2 event hooks; P5 runs in parallel with P3/P4; P6–P9 are largely overlappable with P3–P5 (risk R-003 mitigation).

---

## 5. Assumptions

From `scope-constraints.md` (A-001…A-005) plus delivery-specific assumptions:

| # | Assumption | Risk if wrong |
|---|---|---|
| A-001 | Users have basic software development knowledge; UI guides non-technical users | Low — guided onboarding mitigates |
| A-002 | Single-user per account for MVP | Low — multi-user adds complexity, deferred |
| A-003 | **AI responses are simulated/mock for the MVP**; an abstraction layer allows real LLM swap later. No real LLM inference, no real code compilation/execution | None — abstraction is a stated constraint |
| A-004 | Projects are small-to-medium scale | Medium — large projects need different orchestration |
| A-005 | Internet connectivity is required (cloud-hosted tool) | Low |
| A-006 | Client provides final production server (or approves the proposed single-VM setup) and any required DNS/certificates | Medium — deployment blocked without it |
| A-007 | Access to the existing `virtualdev-studio/` repository with its docs and code is available to the delivery team throughout | Low |
| A-008 | Acceptance criteria (§9) are agreed before UAT begins and are the sole basis of acceptance | Medium — scope creep exposure |
| A-009 | Effort estimates assume one senior full-stack engineer; a second engineer shortens calendar time, not total hours | Medium — schedule |
| A-010 | No requirement for WCAG AAA or localization in MVP; WCAG 2.1 AA and English-only UI | Low |

---

## 6. Exclusions

Explicitly **not** part of this delivery (beyond MVP by design — `scope-constraints.md`):

1. Real LLM inference / provider integration (mock/simulated responses only).
2. Real code compilation, execution, or sandboxed runtime for generated code.
3. Flutter mobile application.
4. Full code generation, test-execution, security-scanning agents (MVP role set only).
5. Automated diagram and presentation generation (generated as part of the docs package, not by the product).
6. Git integration and file-system tooling.
7. Multi-user collaboration / team seats.
8. Payment/billing integration and usage metering.
9. Cloud deployment automation beyond Docker Compose (no K8s, no multi-region).
10. Multi-tenant SaaS infrastructure; SSO; on-prem/air-gapped enterprise features.
11. Third-party service integrations beyond the API abstraction (no Stripe, SendGrid, OAuth providers as accounts).
12. Post-launch support beyond the agreed support window (§8).

---

## 7. Estimated Effort (hours, by phase)

**PROPOSAL estimates.** Basis: one senior full-stack engineer. Contingency and notes included below; actual tracking will adjust per phase (tracker is the source of truth).

| Phase | Activities | Estimates (h) | Range |
|---|---|---|---|
| P0 | Discovery, spec, environment setup, acceptance locking | 40 | 32–48 |
| P1 | Backend foundation: auth, models, migrations, project CRUD | 60 | 50–75 |
| P2 | Orchestrator + approval engine (core differentiator, highest complexity) | 90 | 75–110 |
| P3 | Frontend application (all pages & flows) | 110 | 90–135 |
| P4 | Real-time WebSocket integration | 30 | 24–38 |
| P5 | Testing & QA (backend + frontend + integration + UAT prep) | 45 | 36–55 |
| P6 | Security review & hardening | 25 | 20–32 |
| P7 | Documentation & deliverables (docs, diagrams, presentation) | 35 | 28–44 |
| P8 | Deployment & DevOps (Docker Compose, CI/CD, runbook) | 30 | 24–38 |
| P9 | Handover, UAT fixes, close-out | 35 | 28–45 |
| **Total** | | **500** | **407–620** |

**Notes:**
- **Contingency: +15%** is recommended on the midpoint (± 75 h) for UAT fixes and integration drift → planning total ≈ **575 h**.
- With **one senior engineer**: ≈ **13–15 calendar weeks** at ~40 h/week including contingency.
- With **two engineers** (parallelizing P3/P4 against P2, and P7/P8 against P5): ≈ **8–10 calendar weeks**, total hours unchanged.
- The P2 estimate is deliberately the highest-risk line item (R-002 orchestration complexity in `scope-constraints.md`): it is range-broadened to reflect state-machine and approval-engine complexity; re-forecast after P1.
- Milestones bill on completion of the phase exit criteria in §4, not on time spent.

---

## 8. Client Handover Document

> This section is the skeleton of the handover package. It is also copied to a stand-alone `HANDOVER.md` at close-out, with the **credentials addendum delivered separately via a secure channel — never in plain chat, email, or the repository** (per freelance-project-manager rules).

### 8.1 Project Summary

- **System:** VirtualDev Studio — AI-powered virtual software development studio (MVP).
- **Version:** v1.0.0 (tag at close-out).
- **Repository:** `~/Projects/virtualdev-studio/` (backend, frontend, docs, scripts).
- **Production URL:** _[to be filled at deployment]_
- **Architecture:** modular monolith — React + TypeScript frontend (Vite), Python/FastAPI backend, PostgreSQL, WebSocket real-time, Docker Compose. See `docs/architecture/high-level-architecture.md`.

### 8.2 Admin / Access Inventory (template — complete via secure share)

| Item | Value | Where stored securely |
|---|---|---|
| Production server (SSH) | _— | Password manager |
| PostgreSQL admin credentials | _— | Password manager |
| App JWT signing secret (.env) | _— | Password manager / env only |
| Reverse proxy / TLS cert management | _— | Env / provider console |
| Monitoring/backup credentials | _— | Password manager |

> **Rule:** never commit secrets; `.env.example` with placeholder values only, real `.env` on server only.

### 8.3 How to Run (Development)

From `docs/developer-guide` (summary):

1. `docker compose up -d` for PostgreSQL + Redis (dev profile).
2. Backend: `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload` (API docs at `/docs`).
3. Frontend: `cd frontend && npm ci && npm run dev`.

### 8.4 How to Run (Production)

1. Provision single VM (≥ 4 vCPU / 8 GB RAM).
2. `git clone` + checkout release tag; copy `.env` from secure share.
3. `docker compose -f docker-compose.prod.yml up -d` (app, worker, postgres, redis, reverse proxy).
4. Point DNS A-record to server; obtain TLS via proxy (Caddy/Nginx + certbot).
5. Verify health endpoint; smoke-test auth → create project → workflow.

### 8.5 Database, Backups & Data Migration

- Schema managed by Alembic; `alembic upgrade head` on deploy.
- Daily automated snapshots, 30-day retention; restore drill documented in runbook.
- Seed data: default AI agent roles created by seed migration.

### 8.6 Logging, Monitoring & Alerting

- Structured JSON logs to stdout; Prometheus + Grafana (or equivalent) for metrics.
- Sentry (or equivalent) for error tracking — DSN in `.env`.
- Alert on: worker failures, WS connection drops, API error rate > threshold.

### 8.7 Maintenance, Support & Escalation

- **Support window:** _[e.g., 4 weeks post-acceptance_, free of charge, defects only_].
- **SLA:** best-effort within business hours; critical incidents next-business-day.
- **Escalation:** client contact → delivery lead → (if needed) fix cycle per §10 change control.
- **Out-of-scope follow-ons** (quoted separately): Phase 2 mobile app; real LLM integration; code/test/security agents; billing.

### 8.8 Troubleshooting FAQ (starter)

| Symptom | First step |
|---|---|
| Workflow stuck at a stage | Check `approvals` status for pending decision; approve/reject from dashboard |
| WebSocket events not live | Check browser console reconnect logic; server WS endpoint at `/ws/projects/{id}` |
| Login failing after deploy | Verify JWT secret set and consistent across workers; check user seeded |
| Worker tasks not executing | `docker compose ps`; verify Redis reachable; check worker logs |

### 8.9 Final Notes

- Default agents are seeded; roles mirror `AgentRole` in `backend/app/ai/orchestrator_models.py`.
- For Phase 2 readiness: the LLM abstraction layer (`agents/llm_client.py` interface) is the single swap point for real models.

---

## 9. Acceptance Checklist

Each item must pass during UAT; the client signs off per milestone and at close-out. Source: user stories (`user-stories.md`) + functional requirements (`functional-requirements.md`) + NFRs (`non-functional-requirements.md`).

| ID | Acceptance check | Criterion | Source |
|---|---|---|---|
| AC-01 | User registers / logs in (JWT + refresh) | Flow works; session persists; 401s returned when unauthenticated | NFR-100, NFR-101, US-001 |
| AC-02 | Create project from a product idea | Structured input captured; project created with status "Requirements"; redirect to workspace | US-001, FR-001 |
| AC-03 | Requirements, research, product analysis, architecture, DB, UI/UX, implementation plan stages run | Each stage produces organized output shown in its view; workflow auto-advances in order | FR-002…FR-008, US-002, US-009 |
| AC-04 | AI orchestrator behavior | Tasks created per stage; agent roles selected; failures retried/escalated (no silent dead-ends); approval checkpoints pause workflow | FR-100…FR-107, US-005 |
| AC-05 | Real-time updates | Agent activity logs stream live via WebSocket; stage statuses update without refresh; WS < 100 ms | FR-500, FR-501, NFR-002, US-006 |
| AC-06 | Approval workflow | Pending approval card shows action, reason, risk, expected result; approve/reject/modify each works and records decision; workflow resumes only after approval | FR-200…FR-203, US-003, US-007, US-008 |
| AC-07 | Project status & history | Progress %, current stage, status timeline, and full decision/output history visible; ≥ 10 concurrent projects per user | FR-300…FR-303, NFR-004, US-004 |
| AC-08 | Deliverables available | Documentation, diagrams, and presentation bundled; project package downloadable as zip (US-010) | FR-012…FR-014, US-010 |
| AC-09 | Deployment & reliability | Fresh-server deploy follows runbook; health endpoint healthy; daily backups configured; secrets not in repo; API < 500 ms p95 | NFR-001, NFR-200, NFR-201, NFR-104 |
| AC-10 | Handover complete | Handover doc (§8) delivered; credentials transferred securely; walkthrough done; support terms agreed | §8 |
| AC-11 | Automated tests pass | Backend pytest suite green; ≥ 70% coverage on critical paths | NFR-400 |
| AC-12 | Security review closed | Dependency scan clean of high findings; authz/input-validation checks pass; security review doc delivered | NFR-102, NFR-103 |

**Acceptance procedure:** each item is demonstrated live by the delivery team → client verifies → sign-off per milestone (P1–P9) and a final sign-off after the close-out walkthrough. Items failing UAT go into the fix cycle; re-test is scheduled within 5 business days.

---

## 10. Change Control & Communication

- **Single tracker** is the source of truth for tasks, milestones, and remaining effort; client sees the current version on request.
- **Reporting cadence:** weekly one-page status (completed / in progress / next / risks / input needed).
- **Change requests:** any new requirement, scope shift, or out-of-scope feature is logged with scope + time + cost impact and requires written approval **before** work begins. No silent absorption of added work.
- **Delay disclosure:** any slip is communicated early with reasons and a revised plan.
- **Bad news policy:** blockers, budget changes, and data risks are reported at discovery, never at the milestone.

## 11. Risk Register (delivery view)

From `scope-constraints.md` R-001…R-005 plus engagement risks; mitigations are PROPOSAL.

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-001 | AI output quality insufficient | High | Human approval checkpoints; mock responses scope the claim |
| R-002 | Orchestrator complexity too high | High | Sequential workflow first; P2 re-forecast after P1; range-broadened estimate |
| R-003 | Scope creep across phases | High | §6 exclusions enforced; §10 change control; strict MVP definition |
| R-004 | WebSocket reliability | Medium | Reconnection + message queuing; P4 dedicated phase |
| R-005 | Environment/deployment drift | Medium | Docker Compose parity dev→prod; runbook tested on fresh server (P8) |
| R-006 | Client UAT availability / delayed inputs | Medium | Fixed review windows; documented assumptions when unresponsive |
| R-007 | Key-person dependency | Low-Med | Two-engineer option; docs-first delivery (D6–D7) reduces risk |
| R-008 | Estimate variance on P2/P3 | Medium | Range-bound estimates; re-forecast at each milestone |

---

## Appendix — Milestone & Billing Snapshot (PROPOSAL)

| Milestone | Delivers | Effort (h) | Cumulative (h) |
|---|---|---|---|
| M0 | Scope agreed, environments up | 40 | 40 |
| M1 | Backend foundation (P1) | 60 | 100 |
| M2 | Orchestrator + approvals (P2) | 90 | 190 |
| M3 | Frontend + real-time (P3+P4) | 140 | 330 |
| M4 | QA + security (P5+P6) | 70 | 400 |
| M5 | Docs + deployment (P7+P8) | 65 | 465 |
| M6 | Handover + acceptance (P9) | 35 | 500 |

*Planning total ≈ 500 h (≈ 575 h with 15% contingency). Re-forecast at M1 and M2.*

---

*Document version 1.0 | 2026-09-15 | Delivery Lead — approval required from client before start of P0.*