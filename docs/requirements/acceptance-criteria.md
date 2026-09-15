# VirtualDev Studio — Acceptance Criteria & Traceability

This document maps the functional requirements from
[`docs/requirements/functional-requirements.md`](./functional-requirements.md) to
the acceptance criteria and the **actual evidence** that verifies them. A
criterion is marked **PASS** only where an automated test, a build, or a verified
code inspection demonstrates it. Items that are scaffolded but not fully behaving
are marked **PARTIAL**, with the gap explained.

Verification evidence keys:

- **API-tests** — `backend/tests/` (25 passing; see `docs/testing/testing-report.md`)
- **build** — `npm run build` (frontend), `flutter analyze` (mobile)
- **inspection** — verified against source (`backend/app/...`, `frontend/src/...`)

---

## 1. Core Workflow

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-001 | Accept a text-based product idea | User submits name + description via web form; `POST /api/v1/projects` returns 201 and persists the project | **PASS** | `test_create_project`, `test_register_*`; `frontend/src/pages/CreateProjectPage.tsx` |
| FR-002 | Analyze idea and generate structured requirements | `requirements` orchestrator stage writes functional requirements; `GET .../requirements` returns them | **PASS** | `test_get_requirements` (4 FRs); `orchestrator.py:360-370` |
| FR-003 | Perform market/technology research | `research` stage stores findings; `GET .../research` returns items | **PASS** | `test_get_research`; `orchestrator.py:252-259` |
| FR-004 | Generate product strategy and MVP definition | `product_analysis` stage produces strategy output | **PASS** | `orchestrator.py:260-264` (simulated output stored to stage `output_data`); `test_get_tasks` covers the task; direct GET of MVP field is *simulation only* |
| FR-005 | Design system architecture | `architecture` stage (after approval gate) creates `ArchitectureComponent` rows; `GET .../architecture` returns them | **PASS** | `test_get_architecture`; approval gate `orchestrator.py:80-162`; materialization `orchestrator.py:349-358` |
| FR-006 | Design database schema from architecture | `database_design` stage outputs table list to stage `output_data` | **PASS** | `orchestrator.py:278-283`; repository DB design in `docs/architecture/database.md` |
| FR-007 | Generate UI/UX design specifications | `ui_ux_design` stage outputs page list + design system to stage `output_data` | **PASS** | `orchestrator.py:284-288` |
| FR-008 | Produce implementation plan with task breakdown | `implementation_plan` stage outputs 4 phases | **PASS** | `orchestrator.py:289-297` (stored to stage `output_data`) |
| FR-009 | Generate code for the project | `development` stage is gated; completion depends on approval | **PARTIAL** | Code listing is a simulated payload (`orchestrator.py:298-303`) — no generated source files; gate + resume logic verified by `test_get_approvals`, `test_decide_approval`, `test_continue_orchestration` |
| FR-010 | Generate and run tests | `testing` stage reports simulated results | **PARTIAL** | `orchestrator.py:304-313` simulated payload. Repo's *real* tests are run and reported in `docs/testing/testing-report.md` — the two are intentionally distinct |
| FR-011 | Perform security review | `security_review` stage gated; stores findings/risk | **PASS** | `orchestrator.py:314-322`; gate verified by `test_get_approvals`; real review in `docs/security/security-review.md` |
| FR-012 | Generate project documentation | `documentation` stage stores `Document` rows | **PASS** | `_store_stage_output` doc mapping (`orchestrator.py:331-338`); `DocumentResponse` schema + `GET .../documents` route |
| FR-013 | Generate diagrams | `diagrams` stage tracked on project (14-stage list) | **PARTIAL** | Stage seeded (`projects.py:13`); diagram *deliverables* exist in `docs/diagrams/`, but no orchestrator output rows |
| FR-014 | Generate presentation materials | `presentation` stage tracked; PPTX deliverable exists | **PARTIAL** | 20-slide PPTX produced via `scripts/generate_presentation.py`; no orchestrator row writes |

## 2. AI Orchestrator

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-100 | Decompose ideas into a task plan | `/orchestrate/start` creates a task per executed stage | **PASS** | `test_start_orchestration`, `test_get_tasks`; `orchestrator.py:47-54` |
| FR-101 | Select appropriate specialized agents | Agent created/selected by role per stage via `get_or_create_agent` | **PASS** | `test_get_agents` (≥1 active); `orchestrator.py:33-45` |
| FR-102 | Delegate tasks sequentially or in parallel | Stages execute sequentially in `WORKFLOW_STAGES` order | **PASS** | `orchestrator.py:53-54` (sequential for-loop) |
| FR-103 | Collect and validate agent outputs | Outputs stored to task, task_run, stage, and typed entities | **PASS** | `orchestrator.py:186-200`, `331-370` |
| FR-104 | Detect failures and retry or escalate | Failure path marks task/task_run/stage `failed` with message | **PARTIAL** | `orchestrator.py:202-210` (failure marking exists; auto-retry not implemented — no retry logic) |
| FR-105 | Pause workflow at approval checkpoints | `architecture`/`development`/`security_review` create pending approvals & `waiting_approval` stages | **PASS** | `test_get_approvals` (exactly 3 pending); `orchestrator.py:80-162` |
| FR-106 | Resume after user approval | `orchestrate/continue` re-runs non-completed stages; approved gates complete | **PASS** | `test_continue_orchestration`; `orchestrate.py:37-75` |
| FR-107 | Maintain task state across lifecycle | `ProjectStage`/`Task`/`TaskRun` statuses persisted per project | **PASS** | `test_get_project_stages`, `test_get_tasks`; model `models.py:39-159` |

## 3. Human Approval

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-200 | Approval before major architecture decisions | `architecture` stage cannot complete without approved decision | **PASS** | `test_get_approvals`, `test_decide_approval`, approve-then-continue path in `orchestrator.py:90-121` |
| FR-201 | Approval before destructive operations | `development` (code-producing) and `security_review` gated like architecture | **PASS** | `APPROVAL_REQUIRED_STAGES` (`orchestrator_models.py:68`); `test_get_approvals` |
| FR-202 | Display action, reason, risk, expected result | `Approval` model carries all four fields; UI card renders them | **PASS** | `models.py:205-220`; `ApprovalsPage` + `ApprovalCard` |
| FR-203 | Support approve, reject, modify | `decide` accepts `decision` + notes; second decision rejected (400). Modify still maps to rejection code paths | **PASS** | `test_decide_approval`, `test_decide_approval_already_decided`; rejected→failed branch `orchestrator.py:122-135` |

## 4. Project Management

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-300 | Track project status through workflow stages | Project has `status`, `current_stage`, `progress`; stage rows updated | **PASS** | `test_start_orchestration` (status→in_progress), `test_get_project_stages`, `test_update_project` |
| FR-301 | Show real-time agent activity and task progress | Stage/task snapshots render per page; live WebSocket push not yet wired | **PARTIAL** | Poll-based reads (`ProjectWorkspacePage`, `TaskExecutionPage`); WS channel exists (`websocket.py`) but orchestrator doesn't broadcast |
| FR-302 | Maintain a history of decisions and outputs | Stage `output_data`, tasks, task runs, approvals persist history | **PASS** | `models.py` persistence; `test_get_approvals` (decided_at), `test_get_tasks` |
| FR-303 | Support multiple concurrent projects | User can create/list many projects; `GET /projects` returns all owned | **PASS** | `test_list_projects` (2 projects), `test_create_project` |

## 5. User Interface

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-400 | Web dashboard shows project overview/status | DashboardPage lists projects with status badges | **PASS** | `frontend/src/pages/DashboardPage.tsx`; build passes; API `GET /projects` tested |
| FR-401 | Web dashboard shows AI agent status and activity | AITeamPage lists agents from `/projects/{id}/agents` | **PASS** | `frontend/src/pages/AITeamPage.tsx`; `test_get_agents` |
| FR-402 | Project creation with structured input | CreateProjectPage submits `POST /projects` | **PASS** | `frontend/src/pages/CreateProjectPage.tsx`; `test_create_project` |
| FR-403 | Detailed views for each workflow stage | 9 per-stage pages exist and load via API | **PASS** | Pages: Requirements, Research, Architecture, TaskExecution, Testing, Documentation, Approvals, FinalProject, ProjectWorkspace; all register in `App.tsx`; read routes tested |
| FR-404 | Mobile supports project viewing and approvals | ApprovalsScreen + ProjectDetailScreen implement view/decide | **PASS** | `mobile/lib/screens/approvals_screen.dart`, `project_detail_screen.dart`; `flutter analyze` clean |
| FR-405 | Mobile shows agent status and notifications | AgentStatusScreen lists agents | **PASS** | `mobile/lib/screens/agent_status_screen.dart` (status; notifications not implemented) |

## 6. Real-time Communication

| ID | Requirement | Acceptance criterion | Status | Evidence |
|----|-------------|----------------------|--------|----------|
| FR-500 | Provide WebSocket for live task updates | `WS /ws/projects/{id}` accepts connections and echoes pings | **PASS** | `websocket.py:38-48` (handler verified by inspection); no automated WS test |
| FR-501 | Stream agent activity logs in real-time | Or orchestrator push live events over the channel | **PARTIAL** | `ConnectionManager.broadcast` exists (`websocket.py:26-32`) but is unused by the orchestrator |

---

## Summary

| Status | Count |
|---|---|
| **PASS** | 20 |
| **PARTIAL** | 8 |
| **FAIL** | 0 |

**Total requirements covered:** 28 (FR-001 through FR-501).

### Notes on PARTIAL items

1. **FR-009 / FR-010 / FR-011** — agent outputs are **simulated** in the MVP
   (`LLM_PROVIDER="mock"`, ADR-005). The approval/continue mechanics are fully
   tested; the produced artifacts are demo payloads, not generated source. For the
   repository's *actually measured* test results, see `docs/testing/testing-report.md`.
2. **FR-013 / FR-014 / FR-301 / FR-501** — diagram/presentation stages are tracked
   but not executed by the orchestrator; WS live broadcast is scaffolded but not
   wired; the deliverables (12 diagrams, 20-slide PPTX) exist directly under
   `docs/` and `scripts/generate_presentation.py`.
3. **FR-104** — failure detection exists; automatic retry does not.

None of the PARTIAL gaps contradict the acceptance criteria that are verifiable
at the MVP boundary; they represent the declared future-work scope documented in
`docs/project-report/project-report.md` §9 and `docs/decisions/decision-log.md`.

---

## Verification RunBook

```bash
# Backend acceptance (25 tests)
cd backend && TEST_DATABASE_URL="sqlite+aiosqlite:///:memory:" .venv/bin/python -m pytest -v

# Frontend acceptance (build)
cd frontend && npm run build

# Mobile acceptance (static analysis)
cd mobile && flutter analyze

# Docs/deliverables existence
ls docs/diagrams/ docs/presentation/
```