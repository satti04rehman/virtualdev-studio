# Changelog

All notable changes to VirtualDev Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-09-15

### Initial MVP

#### Backend (FastAPI)
- JWT-based authentication with register/login endpoints
- Project CRUD with multi-stage workflow (requirements, research, architecture, development, testing, deployment)
- Entity management for project components (requirements, research items, architecture components, tasks, task runs, documents, approvals)
- AI orchestrator with 10 specialized agent roles (Requirements Analyst, Researcher, Architect, Frontend Dev, Backend Dev, Fullstack Dev, DevOps, Tester, Reviewer, Tech Writer)
- Human-in-the-loop approval workflow for stage transitions
- WebSocket support for real-time orchestration updates
- Rate limiting middleware
- SQLAlchemy async database layer with SQLite
- CORS configuration for frontend integration

#### Backend Tests
- 25 API tests covering authentication, projects, entities, and orchestration flows

#### Frontend (React + TypeScript)
- 15-page SPA with React Router: Landing, Login, Register, Dashboard, Create Project, Project Workspace, Task Execution, Approvals, AI Team, Architecture, Requirements, Research, Documentation, Testing, Final Project
- Reusable component library: ApprovalCard, EmptyState, LoadingSpinner, StatusBadge
- Layout system with Header and Sidebar
- API service layer with hooks
- Tailwind CSS styling

#### Mobile (Flutter)
- Companion app with screens: Login, Dashboard, Project Detail, Create Project, Agent Status, Approvals, Task Detail
- Provider-based state management (AuthProvider, ProjectProvider)
- WebSocket service for real-time updates
- Data models for agents, approvals, projects, tasks
- Reusable widgets: AgentCard, StageTimeline, StatusCard

#### Documentation
- Requirements documentation (problem statement, functional/non-functional requirements, user stories, scope, target users)
- Architecture documentation (high-level, database, MCP tool architecture, system analysis)
- 12 Mermaid diagrams (ERD, sequence, activity, component, deployment, system context, data flow, use case, user flow, class)
- Security review
- Market research

#### Tooling
- Presentation generation script (Python)
