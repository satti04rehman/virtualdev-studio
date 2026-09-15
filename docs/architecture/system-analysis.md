# VirtualDev Studio — System Analysis

## 1. System Overview

**VirtualDev Studio** is an AI-powered virtual software development studio that orchestrates AI agents to collaboratively build software projects. Users describe what they want to build, and the system coordinates specialized AI agents (architect, developer, tester, reviewer) to produce working code through a structured project lifecycle.

**Core Value Proposition:** Replace the manual process of hiring and coordinating a development team with an AI-driven pipeline that takes a project from idea to deployed code.

---

## 2. Actors

### 2.1 Human Actors

| Actor | Description | Capabilities |
|---|---|---|
| **User (Client)** | Person who wants software built | Create projects, provide requirements, review progress, approve/reject deliverables, manage billing |
| **Admin** | System administrator | Manage users, monitor system health, configure AI models, handle disputes, manage platform settings |

### 2.2 AI Agents

| Agent | Role | Responsibilities |
|---|---|---|
| **Project Manager Agent** | Orchestrator | Breaks requirements into tasks, assigns work to other agents, tracks progress, escalates blockers |
| **Architect Agent** | System design | Designs system architecture, defines module boundaries, creates data models, selects tech stack |
| **Developer Agent** | Code generation | Implements features based on task specifications, writes code following project conventions |
| **Tester Agent** | Quality assurance | Generates and runs tests, identifies bugs, validates acceptance criteria |
| **Reviewer Agent** | Code review | Reviews code for quality, security, and maintainability; provides actionable feedback |

### 2.3 System Components (Non-Human Actors)

| Component | Type | Description |
|---|---|---|
| **LLM Provider** | External service | OpenAI / Anthropic / local models — the AI backbone |
| **Git Provider** | External service | GitHub/GitLab — version control and collaboration |
| **CI/CD Pipeline** | Automation | Build, test, and deployment automation |
| **Notification Service** | Internal | Email, in-app, and optional push notifications |
| **File Storage** | Infrastructure | Project artifacts, generated code, documents |

---

## 3. Modules and Services

### 3.1 Module Map

```
VirtualDev Studio
├── Authentication & Authorization Module
├── Project Management Module
│   ├── Project Lifecycle Engine
│   ├── Task Breakdown & Assignment
│   └── Progress Tracking
├── AI Agent Orchestration Module
│   ├── Agent Registry
│   ├── Task Queue & Scheduler
│   ├── Agent Communication Bus
│   └── LLM Provider Abstraction
├── Code Generation Module
│   ├── Code Generator (per-language)
│   ├── Project Template Engine
│   └── Code Context Manager
├── Review & Testing Module
│   ├── Automated Code Review
│   ├── Test Generation & Execution
│   └── Quality Scoring
├── Collaboration Module
│   ├── Real-time Updates (WebSocket)
│   ├── Chat / Discussion Thread
│   └── Approval Workflow
├── Billing & Subscription Module
│   ├── Usage Metering
│   ├── Plan Management
│   └── Payment Processing
├── Notification Module
│   ├── Email Notifications
│   ├── In-App Notifications
│   └── Webhook Dispatch
└── Admin Module
    ├── Dashboard & Analytics
    ├── User Management
    ├── AI Model Configuration
    └── System Health Monitoring
```

### 3.2 Service Responsibilities

| Module | Owns | Does NOT Own |
|---|---|---|
| Auth | Identity, sessions, roles, API keys | User profile content, billing |
| Project Management | Lifecycle states, task graph, assignments | Code generation, AI decisions |
| AI Orchestration | Agent spawning, LLM calls, prompt management | Business logic, data persistence |
| Code Generation | Code output, file structure, templates | Architecture decisions, testing |
| Review & Testing | Quality gates, test results, feedback | Code rewriting (hands to Developer Agent) |
| Collaboration | Messages, approvals, notifications delivery | Notification content (delegates to Notification module) |
| Billing | Subscriptions, invoices, usage tracking | Feature access control (delegates to Auth) |
| Notification | Delivery channels, template rendering | Notification triggering logic |

---

## 4. Data Flow

### 4.1 Project Creation Flow

```
User → [Create Project Request]
  → Auth Module (verify token, check plan limits)
  → Project Management Module (create project entity, state: DRAFT)
  → AI Orchestration Module (spawn Project Manager Agent)
  → PM Agent (analyze requirements, create task breakdown)
  → Project Management Module (store task graph, state: PLANNING)
  → Collaboration Module (notify user of plan)
  → User reviews plan → [Approve]
  → Project Management Module (state: IN_PROGRESS)
  → AI Orchestration Module (dispatch tasks to agents)
```

### 4.2 Code Generation Flow

```
AI Orchestration → [Task: Implement Feature X]
  → Developer Agent
    → Reads project context (architecture, existing code, conventions)
    → Calls LLM Provider (via abstraction layer)
    → Receives code output
    → Writes files to project workspace
  → Review & Testing Module (trigger automated review)
    → Tester Agent (generates & runs tests)
    → Reviewer Agent (code review)
  → Results → Project Management Module (update task status)
  → Collaboration Module → [WebSocket push to User]
```

### 4.3 Approval Flow

```
Agent completes deliverable
  → Project Management Module (state: PENDING_REVIEW)
  → Collaboration Module (notify user, send diff/preview)
  → User reviews
    → [Approve] → state: COMPLETED → next task dispatched
    → [Request Changes] → state: IN_REVISION → Developer Agent re-engages
    → [Reject] → state: BLOCKED → PM Agent re-evaluates
```

---

## 5. AI Components Detail

### 5.1 LLM Provider Abstraction Layer

- **Purpose:** Decouple business logic from specific LLM providers
- **Interface:** Unified `complete(prompt, context, options) → response` API
- **Supported providers:** OpenAI (GPT-4o), Anthropic (Claude), local models (Ollama)
- **Features:** Fallback chain, rate limiting, cost tracking, response caching, token counting

### 5.2 Agent System

Each AI agent has:
- **System prompt:** Defines role, constraints, and output format
- **Tool set:** Functions the agent can call (file read/write, bash execution, web search)
- **Context window management:** Automatic truncation and summarization of long contexts
- **Memory:** Per-project scratchpad for maintaining state across interactions

### 5.3 Prompt Management

- Prompts are version-controlled in the database
- A/B testing support for prompt variants
- Template variables for dynamic context injection
- Audit trail of all prompts sent to LLMs

---

## 6. Frontend Architecture

### 6.1 Technology
- React 18+ with TypeScript
- State management: Zustand (lightweight, simple)
- Routing: React Router v6
- Styling: Tailwind CSS + component library (shadcn/ui)
- Real-time: WebSocket client for live updates

### 6.2 Key Views

| View | Purpose |
|---|---|
| Dashboard | Project overview, active projects, recent activity |
| Project Detail | Task list, progress timeline, agent activity log |
| Code Viewer | Browse generated code with syntax highlighting, diff views |
| Chat / Discussion | Threaded conversation with AI agents on project |
| Settings | Profile, API keys, notification preferences, billing |
| Admin Panel | User management, system metrics, AI model config |

### 6.3 Client-Side Architecture

```
Pages (Route Components)
  └── Feature Components
        └── Shared UI Components (shadcn/ui)
  └── Stores (Zustand)
        ├── authStore
        ├── projectStore
        ├── notificationStore
        └── chatStore
  └── API Client (Axios + interceptors)
  └── WebSocket Client (reconnection, event routing)
```

---

## 7. Backend Architecture

### 7.1 Technology
- Python 3.11+ with FastAPI
- Async-first (asyncio, async database drivers)
- Background tasks: Celery + Redis (for long-running agent work)
- WebSockets: FastAPI native WebSocket support

### 7.2 Backend Layer Structure

```
API Layer (FastAPI Routers)
  → Schema Validation (Pydantic)
  → Authentication Middleware (JWT)
  → Rate Limiting Middleware
  → Business Logic (Service Layer)
  → Data Access (Repository Pattern)
  → Database (SQLAlchemy + asyncpg)
```

### 7.3 Background Processing

- **Task Queue:** Celery with Redis broker
- **Use cases:** Agent orchestration loops, code generation, test execution, batch operations
- **Monitoring:** Flower (Celery monitoring dashboard)

---

## 8. Database Requirements

### 8.1 Core Entities

| Entity | Key Relationships |
|---|---|
| **User** | has many Projects, has Profile, has Subscription |
| **Project** | belongs to User, has many Tasks, has Workspace |
| **Task** | belongs to Project, assigned to Agent, has many Artifacts |
| **AgentInstance** | spawned for Task, has ExecutionLog |
| **Artifact** | generated by Agent for Task (code files, test results, reviews) |
| **Message** | in Project context, from User or Agent |
| **Subscription** | belongs to User, has Plan, has UsageRecords |

### 8.2 Data Characteristics

- **Volume:** Moderate (thousands of projects, millions of tasks at scale)
- **Read/Write ratio:** Read-heavy (code browsing, dashboard views)
- **Consistency:** Strong consistency for billing and project state; eventual for notifications
- **Retention:** Project data retained per plan; audit logs retained for compliance

### 8.3 Database Features Needed

- JSON/JSONB columns for flexible metadata (agent outputs, task configs)
- Full-text search (PostgreSQL tsvector) for code and project search
- Row-level security (RLS) for multi-tenant data isolation
- Scheduled jobs (pg_cron) for usage aggregation and cleanup

---

## 9. External Service Interfaces

| Service | Protocol | Purpose | Failure Mode |
|---|---|---|---|
| **LLM Provider (OpenAI/Anthropic)** | REST API | AI inference | Retry with backoff → fallback provider → queue for later |
| **GitHub API** | REST + Webhooks | Repo management, commits | Retry → queue commits → notify user of delay |
| **Stripe** | REST API | Payment processing | Idempotent retries → manual admin intervention |
| **SendGrid / Resend** | REST API | Transactional email | Queue for retry → in-app notification as fallback |
| **Redis** | TCP | Caching, task queue broker, sessions | In-memory fallback for non-critical; fail fast for queue |

---

## 10. Authentication & Authorization Model

### 10.1 Authentication

- **Method:** JWT (access token) + refresh token rotation
- **OAuth providers:** Google, GitHub (for SSO)
- **API keys:** For programmatic access (CI/CD integrations)
- **Session management:** Server-side refresh token store (Redis)

### 10.2 Authorization

- **Model:** Role-Based Access Control (RBAC)
- **Roles:**
  - `user` — default, can create/manage own projects
  - `admin` — full system access
- **Project-level permissions:** Owner, Collaborator (Phase 2), Viewer (Phase 2)
- **API endpoint protection:** FastAPI dependency injection with role checks
- **Resource ownership:** Users can only access their own projects (enforced at query level)

### 10.3 Security Tokens

```
Access Token:  short-lived (15 min), contains user_id + role
Refresh Token: long-lived (7 days), stored in DB, rotated on use
API Key:       persistent, hashed in DB, scoped to specific permissions
```

---

## 11. Notification Flow

### 11.1 Trigger Events

| Event | Channel | Priority |
|---|---|---|
| Project created | In-app | Low |
| Plan ready for review | In-app + Email | Medium |
| Task completed | In-app | Low |
| Deliverable ready for approval | In-app + Email | High |
| Approval / rejection | In-app | Medium |
| Payment failed | In-app + Email | Critical |
| Agent error / stall | In-app + Email (admin) | High |

### 11.2 Flow

```
Event occurs in any module
  → Notification Module (receive event + metadata)
  → Determine channels based on event type + user preferences
  → Render template with context
  → Dispatch to channels (in-app via WebSocket, email via provider)
  → Record delivery status
  → Retry on failure (exponential backoff, max 3 attempts)
```

---

## 12. Project Lifecycle States & Transitions

### 12.1 State Machine

```
DRAFT
  → PLANNING        (user submits requirements)
  → ARCHITECTING     (AI architect designs system)
  → IN_PROGRESS      (user approves plan, coding begins)
    → IN_REVIEW      (deliverable ready for user review)
      → IN_PROGRESS  (user requests changes)
      → COMPLETED    (user approves)
    → BLOCKED        (dependency or error)
      → IN_PROGRESS  (blocker resolved)
  → COMPLETED        (all tasks done, user accepts)
  → CANCELLED        (user cancels at any point before COMPLETED)
  → ARCHIVED         (completed project moved to archive)
```

### 12.2 Transition Rules

| From | To | Trigger | Guard |
|---|---|---|---|
| DRAFT | PLANNING | User submits requirements | Requirements are non-empty |
| PLANNING | IN_PROGRESS | User approves plan | Plan exists and is approved |
| IN_PROGRESS | IN_REVIEW | Agent completes deliverable | All tasks in sprint complete |
| IN_REVIEW | IN_PROGRESS | User requests changes | Feedback is non-empty |
| IN_REVIEW | COMPLETED | User approves | All acceptance criteria met |
| Any non-terminal | BLOCKED | Agent error or dependency | Error is unrecoverable by agent |
| BLOCKED | IN_PROGRESS | Admin or user resolves blocker | Blocker marked resolved |
| Any non-terminal | CANCELLED | User cancels | Project not yet COMPLETED |
| COMPLETED | ARCHIVED | User or auto-archive | 30 days after completion |

### 12.3 State Persistence

- All state transitions are logged with timestamp, actor, and reason
- State is the source of truth; UI derives from state, never the reverse
- Concurrent transitions prevented via optimistic locking (version column)

---

## 13. Risks and Gaps

| Risk | Severity | Mitigation |
|---|---|---|
| LLM hallucination in code generation | High | Automated testing + human review gate before any deployment |
| Cost runaway from agent loops | High | Token budget per project, hard limits, circuit breakers |
| Agent context window overflow | Medium | Automatic context summarization and pruning |
| GitHub API rate limiting | Medium | Queue commits, batch operations, cache repo metadata |
| Prompt injection via user input | High | Input sanitization, output validation, sandboxed execution |
| WebSocket connection drops | Low | Auto-reconnect with exponential backoff, state resync |
| Database migration complexity | Medium | Strict migration review process, backward-compatible changes |

---

*Document version: 1.0 | Last updated: 2026-09-15*
