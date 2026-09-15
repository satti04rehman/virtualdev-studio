# VirtualDev Studio — High-Level Architecture

## 1. Architecture Overview

VirtualDev Studio is a **modular monolith** with a React frontend and a Python/FastAPI backend. AI agent orchestration runs as background tasks within the same deployment. There are no microservices — the system is a single deployable unit with clearly separated internal modules.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   React Web App  │  │  Flutter Mobile   │  │  CLI Tool    │  │
│  │  (TypeScript)    │  │   (Phase 2)       │  │  (Phase 3)   │  │
│  └────────┬─────────┘  └────────┬──────────┘  └──────┬───────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / REVERSE PROXY                  │
│                        (Nginx / Caddy)                           │
│              TLS termination · Rate limiting · CORS              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Layer                              │   │
│  │  /auth  /projects  /tasks  /agents  /billing  /admin     │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                  Service Layer                            │   │
│  │  AuthService · ProjectService · AgentService ·           │   │
│  │  TaskService · BillingService · NotificationService      │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                 Domain / Business Logic                    │   │
│  │  ProjectStateMachine · AgentOrchestrator ·               │   │
│  │  CodeGenerator · ReviewEngine · PromptManager            │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                Data Access Layer                           │   │
│  │  SQLAlchemy Repositories · Redis Cache · File Storage    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Background Workers (Celery)                   │   │
│  │  AgentOrchestrationTask · CodeGenerationTask ·           │   │
│  │  TestExecutionTask · NotificationDispatchTask             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────────┐
│    PostgreSQL        │          │        Redis             │
│  (Primary Store)     │          │  (Cache + Queue Broker)  │
│  Users, Projects,    │          │  Sessions, Rate Limits,  │
│  Tasks, Artifacts,   │          │  Task Queue, Real-time   │
│  Audit Logs          │          │  Pub/Sub for WebSocket   │
└─────────────────────┘          └─────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────┐ │
│  │ LLM APIs │ │ GitHub   │ │ Stripe  │ │ SendGrid │ │ S3    │ │
│  │ OpenAI   │ │ GitLab   │ │         │ │ Resend   │ │ R2    │ │
│  │ Anthropic│ │          │ │         │ │          │ │       │ │
│  └──────────┘ └──────────┘ └─────────┘ └──────────┘ └───────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Choice | Justification |
|---|---|---|
| **Framework** | React 18+ | Large ecosystem, strong TypeScript support, team familiarity |
| **Language** | TypeScript | Type safety, better DX, catches bugs at compile time |
| **State Management** | Zustand | Minimal boilerplate, works well with TypeScript, no providers needed |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, accessible components, no CSS-in-JS overhead |
| **Routing** | React Router v6 | Stable, nested routes, loader support |
| **Build Tool** | Vite | Fast HMR, native ESM, good TypeScript support |
| **Real-time** | Native WebSocket API | No extra dependency, sufficient for our needs |
| **Testing** | Vitest + React Testing Library | Fast, Vite-native, good React integration |

### 2.2 Backend

| Technology | Choice | Justification |
|---|---|---|
| **Framework** | FastAPI | Async-native, auto-generated OpenAPI docs, Pydantic validation, high performance |
| **Language** | Python 3.11+ | AI/ML ecosystem, rich libraries, async support |
| **ORM** | SQLAlchemy 2.0 (async) | Mature, excellent async support, flexible query building |
| **Validation** | Pydantic v2 | FastAPI native, fast serialization, strict type checking |
| **Task Queue** | Celery + Redis | Proven for background work, good monitoring (Flower), Redis as broker is simple |
| **WebSockets** | FastAPI native | Built-in, no extra dependency, works with async |
| **Migrations** | Alembic | SQLAlchemy companion, reversible, branch-aware |

### 2.3 Database & Storage

| Technology | Choice | Justification |
|---|---|---|
| **Primary DB** | PostgreSQL 16 | JSONB for flexible metadata, full-text search, RLS, mature ecosystem |
| **Cache / Queue** | Redis 7 | Session store, rate limiting, Celery broker, WebSocket pub/sub |
| **File Storage** | S3-compatible (AWS S3 or Cloudflare R2) | Project artifacts, generated code archives, user uploads |

### 2.4 Infrastructure

| Technology | Choice | Justification |
|---|---|---|
| **Containerization** | Docker + Docker Compose (dev), Docker (prod) | Consistent environments, easy local dev |
| **Reverse Proxy** | Nginx or Caddy | TLS termination, rate limiting, static file serving |
| **CI/CD** | GitHub Actions | Tight GitHub integration, free for open repos |
| **Monitoring** | Prometheus + Grafana | Metrics collection, dashboards, alerting |
| **Logging** | Structured JSON logs → stdout | Docker-native, works with any log aggregator |
| **Error Tracking** | Sentry | Real-time error tracking, performance monitoring |

---

## 3. Module Boundaries

The backend is organized as a modular monolith. Each module has a clear API boundary and communicates with other modules through well-defined interfaces — not direct database access.

```
backend/
├── app/
│   ├── main.py                    # FastAPI app factory
│   ├── config.py                  # Settings from env vars
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── router.py          # API endpoints
│   │   │   ├── service.py         # Business logic
│   │   │   ├── models.py          # SQLAlchemy models
│   │   │   ├── schemas.py         # Pydantic request/response
│   │   │   ├── dependencies.py    # FastAPI deps (get_current_user)
│   │   │   └── exceptions.py      # Module-specific errors
│   │   │
│   │   ├── projects/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   ├── state_machine.py   # Project lifecycle transitions
│   │   │   └── exceptions.py
│   │   │
│   │   ├── agents/
│   │   │   ├── router.py
│   │   │   ├── orchestrator.py    # Agent coordination logic
│   │   │   ├── registry.py        # Agent type registry
│   │   │   ├── prompts/           # Prompt templates (versioned)
│   │   │   ├── llm_client.py      # LLM provider abstraction
│   │   │   ├── tools/             # Agent-callable tools
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── tasks/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── billing/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   └── stripe_client.py
│   │   │
│   │   ├── notifications/
│   │   │   ├── service.py
│   │   │   ├── channels/          # email, in_app, webhook
│   │   │   ├── templates/
│   │   │   └── models.py
│   │   │
│   │   └── admin/
│   │       ├── router.py
│   │       ├── service.py
│   │       └── schemas.py
│   │
│   ├── core/
│   │   ├── database.py            # Engine, session factory
│   │   ├── redis.py               # Redis client
│   │   ├── security.py            # JWT, password hashing
│   │   ├── exceptions.py          # Global exception handlers
│   │   ├── middleware.py          # Rate limiting, logging
│   │   └── websocket.py           # WS connection manager
│   │
│   ├── workers/
│   │   ├── celery_app.py          # Celery configuration
│   │   ├── agent_tasks.py         # Background agent work
│   │   ├── code_gen_tasks.py      # Background code generation
│   │   └── notification_tasks.py  # Background notifications
│   │
│   └── shared/
│       ├── base_model.py          # SQLAlchemy declarative base
│       ├── pagination.py          # Shared pagination utilities
│       └── events.py              # Module event bus (in-process)
│
├── alembic/                       # Database migrations
├── tests/
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── alembic.ini
```

### 3.1 Module Dependency Rules

1. Modules communicate through their **service layer only** — no cross-module model imports
2. A module may depend on `core/` utilities but never on another module's internals
3. `shared/` contains truly cross-cutting code (base models, pagination) — kept minimal
4. The `events.py` bus allows loose coupling for side effects (e.g., "project completed" triggers notification) without direct module dependencies

---

## 4. API Surface Overview

### 4.1 REST API Endpoints

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/oauth/{provider}     # Google, GitHub SSO
  GET    /api/v1/auth/me
  PUT    /api/v1/auth/me

PROJECTS
  GET    /api/v1/projects                   # List user's projects
  POST   /api/v1/projects                   # Create project
  GET    /api/v1/projects/{id}              # Get project detail
  PUT    /api/v1/projects/{id}              # Update project
  DELETE /api/v1/projects/{id}              # Archive/delete project
  POST   /api/v1/projects/{id}/submit       # Submit requirements → DRAFT→PLANNING
  POST   /api/v1/projects/{id}/approve      # Approve plan → PLANNING→IN_PROGRESS
  POST   /api/v1/projects/{id}/cancel       # Cancel project

TASKS
  GET    /api/v1/projects/{id}/tasks        # List tasks for project
  GET    /api/v1/tasks/{id}                 # Get task detail
  POST   /api/v1/tasks/{id}/approve         # Approve task deliverable
  POST   /api/v1/tasks/{id}/reject          # Request changes

AGENTS
  GET    /api/v1/projects/{id}/agents       # List agents active in project
  GET    /api/v1/agents/{id}/logs           # Get agent execution logs
  POST   /api/v1/agents/{id}/retry          # Retry failed agent task

CODE
  GET    /api/v1/projects/{id}/files        # List generated files
  GET    /api/v1/projects/{id}/files/{path} # Get file content
  GET    /api/v1/projects/{id}/diff          # Get recent changes diff

MESSAGES
  GET    /api/v1/projects/{id}/messages     # Chat history
  POST   /api/v1/projects/{id}/messages     # Send message to agents

BILLING
  GET    /api/v1/billing/subscription       # Current plan
  POST   /api/v1/billing/subscribe          # Create subscription
  POST   /api/v1/billing/portal             # Stripe customer portal
  GET    /api/v1/billing/usage              # Usage stats

ADMIN
  GET    /api/v1/admin/users                # List all users
  GET    /api/v1/admin/projects             # All projects
  GET    /api/v1/admin/metrics              # System metrics
  PUT    /api/v1/admin/settings             # Platform settings
  POST   /api/v1/admin/ai-models            # Configure AI models
```

### 4.2 WebSocket Endpoints

```
WS     /ws/projects/{id}                    # Live project updates
         Events: task_update, agent_activity, message, state_change

WS     /ws/notifications                    # User notification stream
         Events: notification, unread_count
```

---

## 5. Data Flow Diagrams

### 5.1 Primary Data Flow — Project Lifecycle

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ User │────▶│  API    │────▶│ Service  │────▶│   DB    │────▶│  Redis   │
│      │     │  Router │     │  Layer   │     │(Postgres)│     │ (Cache)  │
└──┬───┘     └────┬────┘     └────┬─────┘     └─────────┘     └──────────┘
   │              │               │
   │              │               ▼
   │              │        ┌──────────────┐
   │              │        │Celery Worker  │
   │              │        │(Agent Task)   │
   │              │        └──────┬───────┘
   │              │               │
   │              │               ▼
   │              │        ┌──────────────┐     ┌─────────────┐
   │              │        │  LLM Client  │────▶│ LLM Provider│
   │              │        │ (Abstraction)│◀────│ (OpenAI/etc)│
   │              │        └──────┬───────┘     └─────────────┘
   │              │               │
   │              │               ▼
   │              │        ┌──────────────┐     ┌─────────────┐
   │              │        │ File Writer  │────▶│  S3 / R2    │
   │              │        │ (Artifacts)  │     │  (Storage)  │
   │              │        └──────────────┘     └─────────────┘
   │              │
   │◀─────────────┤  (WebSocket push)
   │              │
   ▼              ▼
┌──────────────────────┐
│  React Frontend      │
│  - Renders updates   │
│  - User takes action │
└──────────────────────┘
```

### 5.2 Agent Orchestration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent Orchestrator                           │
│                                                               │
│  1. Receive task from queue                                   │
│  2. Load project context (architecture, prior code, specs)    │
│  3. Select agent type (dev/test/review/architect)             │
│  4. Build prompt with context + task + tools                  │
│  5. Call LLM via abstraction layer                            │
│  6. Parse response (structured output or tool calls)          │
│  7. Execute tool calls (file write, test run, etc.)           │
│  8. If more steps needed → loop to step 5                     │
│  9. Store artifacts in DB + S3                                │
│ 10. Emit completion event → task status update                │
│ 11. If agent exceeded token budget → halt and escalate        │
└─────────────────────────────────────────────────────────────┘

Token Budget Enforcement:
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Per-Project  │───▶│ Per-Task     │───▶│ Per-Turn     │
  │ Budget       │    │ Budget       │    │ (single LLM  │
  │ (plan-level) │    │ (estimate)   │    │  call limit) │
  └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 6. Deployment Architecture

### 6.1 Development Environment

```
docker-compose.yml
├── app (FastAPI, hot-reload)
├── celery-worker
├── celery-beat (scheduled tasks)
├── postgres
├── redis
└── mailhog (email testing)
```

### 6.2 Production Environment

```
┌─────────────────────────────────────────────────┐
│                 Load Balancer                    │
│            (Cloud / Managed LB)                  │
└──────────────────────┬──────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐         ┌──────▼──────┐
    │   App Pod   │         │   App Pod   │    ← Kubernetes or single VM
    │  (FastAPI)  │         │  (FastAPI)  │
    │  + Nginx    │         │  + Nginx    │
    └──────┬──────┘         └──────┬──────┘
           │                       │
    ┌──────▼──────────────────────▼──────┐
    │         Managed PostgreSQL          │    ← AWS RDS / Supabase / self-hosted
    └────────────────────────────────────┘
    ┌────────────────────────────────────┐
    │         Managed Redis              │    ← AWS ElastiCache / Upstash
    └────────────────────────────────────┘
    ┌────────────────────────────────────┐
    │         Object Storage             │    ← AWS S3 / Cloudflare R2
    └────────────────────────────────────┘
    ┌────────────────────────────────────┐
    │    Celery Workers (2-4 pods)       │    ← Separate from app pods
    └────────────────────────────────────┘
```

### 6.3 Deployment Strategy

| Aspect | Approach |
|---|---|
| **MVP deployment** | Single VM (4 vCPU, 8GB RAM) with Docker Compose — keeps costs low |
| **Scaling trigger** | Move to managed services when concurrent users > 500 or agent tasks > 100/hr |
| **Database** | Managed PostgreSQL (RDS/Supabase) for backups, high availability |
| **Static assets** | CDN (Cloudflare) in front of frontend build |
| **Secrets** | Environment variables, managed via platform (Vault for later) |
| **Backups** | Daily automated DB snapshots, 30-day retention |

---

## 7. Security Architecture

### 7.1 Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                     │
│  (Internet: Users, Bots, Attackers)                  │
└────────────────────────┬────────────────────────────┘
                         │  HTTPS (TLS 1.3)
                         ▼
┌─────────────────────────────────────────────────────┐
│                 DMZ / EDGE                            │
│  Nginx: Rate limiting, DDoS protection, CORS         │
└────────────────────────┬────────────────────────────┘
                         │  Internal network
                         ▼
┌─────────────────────────────────────────────────────┐
│                 APPLICATION ZONE                      │
│  FastAPI: JWT validation, input validation, RBAC      │
│  Celery Workers: isolated task execution              │
│  WebSocket: authenticated connections only            │
└────────────────────────┬────────────────────────────┘
                         │  VPC / private network
                         ▼
┌─────────────────────────────────────────────────────┐
│                    DATA ZONE                          │
│  PostgreSQL: RLS, encrypted at rest                  │
│  Redis: password-protected, no public access         │
│  S3: private buckets, signed URLs only               │
│  Secrets: env vars, never in code or logs            │
└─────────────────────────────────────────────────────┘
```

### 7.2 Security Measures

| Layer | Measure |
|---|---|
| **Transport** | TLS 1.3 everywhere, HSTS headers, secure cookies |
| **Authentication** | JWT with short expiry (15 min), refresh rotation, bcrypt password hashing |
| **Authorization** | RBAC with resource-level ownership checks, enforced at service layer |
| **Input Validation** | Pydantic schemas reject malformed input, SQL injection impossible (ORM parameterized queries) |
| **LLM Security** | User input sanitized before prompt injection, output validated, no raw LLM output in DB queries |
| **File Operations** | Generated code executed in sandboxed environment (Phase 2: Docker containers per project) |
| **Rate Limiting** | Per-user API rate limits (Redis), per-IP at edge (Nginx) |
| **Secrets** | Never logged, never in responses, env vars only, rotated quarterly |
| **Audit** | All state changes logged with actor + timestamp, immutable audit log table |
| **Dependencies** | Automated vulnerability scanning (Dependabot / pip-audit) |

### 7.3 LLM-Specific Security

- **Prompt injection defense:** User inputs wrapped in structured delimiters, system prompts isolated from user content
- **Output validation:** LLM output parsed and validated before any system action (file write, state change)
- **Sandboxed execution:** Generated code runs in isolated containers with no network access to internal services
- **Cost controls:** Hard token limits per project, per task, and per API call — circuit breakers on runaway agents
- **Audit trail:** Every LLM call logged with prompt hash, token count, response hash, and latency

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Monolith over microservices** | Monolith | MVP stage, small team, simpler deployment, easier debugging. Microservices add operational complexity without justification at current scale. |
| **Celery over async tasks** | Celery | Long-running agent tasks (minutes) need reliable queue, retry, and monitoring. FastAPI BackgroundTasks is insufficient. |
| **PostgreSQL over MongoDB** | PostgreSQL | Relational data with complex joins (project→tasks→agents→artifacts). JSONB provides schema flexibility where needed. Full-text search avoids needing Elasticsearch. |
| **Zustand over Redux** | Zustand | Less boilerplate, simpler mental model, sufficient for our state complexity. No need for Redux middleware ecosystem. |
| **Server-rendered SPA over SSR** | SPA | No SEO requirements, simpler deployment (static files), faster development. |
| **In-process event bus over Kafka** | In-process | Single process, no need for distributed messaging. If scaling to multiple processes, Redis Pub/Sub is the next step. |

---

## 9. Phase Roadmap

| Phase | Scope | Architecture Impact |
|---|---|---|
| **Phase 1 (MVP)** | Core platform: auth, projects, agents, code gen, review, billing | Monolith + React + FastAPI + PostgreSQL + Redis |
| **Phase 2** | Mobile app (Flutter), collaborative projects, advanced agent tools | Add Flutter app, extend API, add project collaboration roles |
| **Phase 3** | CLI tool, self-hosted option, plugin system for custom agents | CLI client, Docker-based self-hosting, agent plugin architecture |
| **Phase 4** | Enterprise features: SSO, audit logs, on-prem deployment | SAML/OIDC, enhanced logging, air-gapped deployment option |

---

*Document version: 1.0 | Last updated: 2026-09-15*
