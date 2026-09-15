# VirtualDev Studio — User Guide

End-to-end walkthrough of the **actual web interface** as implemented in
`frontend/src/pages/`. No features are described unless a corresponding page and
backend route exist.

---

## 1. Get Started

### Create an account

1. Go to **`/register`** (RegisterPage).
2. Fill in **Name**, **Username**, **Email**, and **Password**.
3. Click **Sign Up**.  
   The system creates your account (`POST /api/v1/auth/register`) and
   automatically signs you in (`POST /api/v1/auth/login`).
4. You are redirected to the **Dashboard**.

### Log in

1. Go to **`/login`** (LoginPage).
2. Enter your email and password.
3. Click **Sign In**.  
   You are redirected to the Dashboard.

All subsequent actions require this session. Logging out clears the browser token.

---

## 2. Dashboard — `/dashboard`

The Dashboard (DashboardPage) shows:

- **Your projects** in a card grid: name, platform badge, status, and creation
  date.
- **Recent activity** on the right side.

The project card status badges show the workflow stage the project is currently in,
e.g. `created`, `in_progress`, or a specific stage name.

Click **"+ New Project"** to start a project.

---

## 3. Create a Project — `/projects/new`

CreateProjectPage presents a form with six fields:

| Field | Required | Notes |
|---|---|---|
| Project Name | yes | e.g. "DevOps Dashboard" |
| Description | yes | Your product idea — what the tool should do |
| Target Users | no | e.g. "Platform engineers" |
| Platform | no | `web`, `mobile`, `desktop`, or leave empty |
| Tech Stack | no | Comma-separated, e.g. "react, fastapi, postgresql" |
| Complexity | no | `simple`, `moderate`, `complex`, or `enterprise` |

After submission:

1. The backend creates the project and seeds **14 workflow stages** in pending
   status (`POST /api/v1/projects`).
2. You are redirected to the **Project Workspace** for that project.

---

## 4. Project Workspace — `/projects/:projectId`

ProjectWorkspacePage is your main project view. It displays:

- **Project info:** name, description, status, current stage, progress bar.
- **Workflow stages:** a vertical timeline of all stages with status icons
  (pending ✗, in-progress ⏳, completed ✓, waiting for approval ⏸).
- **"Start AI Workflow" button** (visible when status is `created`).

Click **"Start AI Workflow"** to kick off the orchestrator
(`POST /api/v1/projects/{id}/orchestrate/start`). The page will reload and show the
updated stage statuses.

### Sidebar navigation

Once the workflow is running, the sidebar offers links to detailed views for each
stage. Click through to explore what the AI has generated.

---

## 5. Viewing Stage Results

### Requirements — `/projects/:id/requirements`

RequirementsPage lists all functional requirements the AI identified. Each card
shows: **title**, **priority** (color-coded: critical/red, high/orange,
medium/amber, low/gray), and the stage status.

### Research — `/projects/:id/research`

ResearchPage shows research findings the AI compiled, with a source-type badge
(fact, inference, proposal) and a summary of the finding.

### Architecture — `/projects/:id/architecture`

ArchitecturePage displays the system components the AI designed. Each component
card shows its **name**, **type** (color-coded: frontend/blue, backend/teal,
database/amber, service/purple, etc.), **technology**, and any dependencies.

### Task Execution — `/projects/:id/tasks`

TaskExecutionPage lists all orchestrator tasks, grouped by stage. Click a task
row to expand it and see: status, agent, output data, and error details.

### Testing — `/projects/:id/testing`

TestingPage filters tasks to only show those with task type `"testing"`, letting
you see the QA results in isolation.

### Documentation — `/projects/:id/documentation`

DocumentationPage lists generated documents. Each card shows: **title**, **type**
(PRD, Architecture, API, User Guide, Technical, Deployment), and **version**.
Click a document to view its content in a preview panel.

---

## 6. Human Approval Workflow — `/projects/:id/approvals`

This is the core supervision mechanism. Three stages require your explicit
approval before the AI continues:

| Stage | What you're approving |
|---|---|
| Architecture | The system component design |
| Development | The code generation plan |
| Security Review | The security findings and remediation |

### How it works

1. The orchestrator runs non-gated stages automatically (requirements, research,
   etc.).
2. When it reaches an approval-gated stage, it creates a **pending approval**
   request (`status: "pending"`).
3. You receive the request in the **Approvals page** (ApprovalsPage).

### Reviewing an approval

Each approval card shows:

- **Action:** what stage this approval covers.
- **Reason:** why the AI is asking for permission.
- **Risk level:** rated `medium` for all three gates.
- **Expected result:** what completing this stage will produce.

### Deciding

Click **Approve** or **Reject** and optionally add notes. The decision is sent
to `POST /api/v1/projects/{id}/approvals/{approvalId}/decide`.

After deciding, return to the **Project Workspace** and click
**"Continue AI Workflow"** (`POST /api/v1/projects/{id}/orchestrate/continue`).
The orchestrator resumes from where it paused, processing all remaining stages
including any newly-approved ones.

---

## 7. AI Team — `/ai-team`

AITeamPage shows the roster of AI agents in the system. Each agent card displays:
**name**, **role**, **avatar** (emoji by role), a **status badge**, and a
description.

Agent roles and their emojis:

| Role | Emoji |
|---|---|
| requirements | 📋 |
| research | 🔬 |
| architecture | 🏗️ |
| development | 💻 |
| testing | 🧪 |
| documentation | 📄 |
| project_manager | 🎯 |
| security | 🔒 |
| devops | 🚀 |

This page is a global roster; it shows all active agents, not those scoped to a
single project.

---

## 8. Final Project — `/projects/:id/final`

FinalProjectPage provides a summary of the completed (or in-progress) project:
project details, a full stage timeline with current statuses, and a quick
navigation grid to jump back into any stage's detailed view.

---

## 9. Mobile Companion App

The Flutter mobile app (in `mobile/`) provides a subset of the web functionality
on Android/iOS:

| Screen | What it shows |
|---|---|
| LoginScreen | Email + password sign in |
| DashboardScreen | Project list |
| CreateProjectScreen | New project form |
| ProjectDetailScreen | Stage timeline, start workflow, navigate to sub-views |
| ApprovalsScreen | Pending approval cards with approve/reject |
| AgentStatusScreen | Roster of active agents |
| TaskDetailScreen | Single task + its runs |

The mobile app connects to the same `http://localhost:8000/api/v1` API and
`ws://localhost:8000/ws/` WebSocket endpoint. Tokens are stored in memory (not
`localStorage`), which is more secure than the web client.

**Note:** On a real device, update the API base URL in
`mobile/lib/services/api_service.dart:23` from `localhost` to your server's
public address over HTTPS.

---

## 10. The Full Workflow at a Glance

```
Register / Login
      ↓
Create Project (name + idea)
      ↓
Start AI Workflow
      ↓
┌──────────────────────────────────────────┐
│  requirements ─────────────────────────▶  │  auto
│  research ─────────────────────────────▶  │  auto
│  product_analysis ─────────────────────▶  │  auto
│  architecture ─── ⏸ APPROVAL GATE ────▶  │  user decides
│  database_design ──────────────────────▶  │  auto (after approval)
│  ui_ux_design ─────────────────────────▶  │  auto
│  implementation_plan ──────────────────▶  │  auto
│  development ──────── ⏸ APPROVAL GATE ─▶ │  user decides
│  testing ──────────────────────────────▶  │  auto
│  security_review ── ⏸ APPROVAL GATE ──▶  │  user decides
│  documentation ────────────────────────▶  │  auto
│  diagrams / presentation / final_report   │  tracked (not orchestrated)
└──────────────────────────────────────────┘
      ↓
View Final Project summary
```

Each ⏸ gate: you **Approve** → click **Continue** in the workspace → workflow
resumes automatically.

---

*Based on the actual implementation in `frontend/src/pages/` and
`backend/app/api/` as of September 2026.*