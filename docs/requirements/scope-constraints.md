# Scope, Constraints & Assumptions

## ID: REQ-SC-001

### MVP Scope (In Scope)

1. Web-based dashboard with project creation and monitoring
2. AI orchestrator with 5+ specialized agents
3. Requirements analysis agent
4. Research agent
5. Architecture/design agent
6. Database design agent
7. Documentation generation agent
8. Human approval workflow
9. Real-time task status via WebSocket
10. Project state persistence
11. Basic authentication (JWT)
12. REST API backend
13. Responsive web frontend

### Phase 2 Scope (Deferred)

1. Flutter mobile application
2. Code generation agent (full implementation)
3. Test execution agent
4. Security scanning agent
5. Diagram generation (automated)
6. Presentation generation (PPTX)
7. Git integration
8. File system tools
9. Multi-user collaboration
10. Payment/billing integration

### Explicitly Out of Scope

1. Actual LLM inference (system uses mock/simulated AI responses for MVP)
2. Real code compilation and execution
3. Cloud deployment automation
4. Third-party service integrations (beyond API abstraction)
5. Multi-tenant SaaS infrastructure

### System Constraints

| ID | Constraint | Reason |
|----|-----------|--------|
| C-001 | Backend: Python + FastAPI | Team expertise, async support |
| C-002 | Frontend: React + TypeScript | Ecosystem, component model |
| C-003 | Database: PostgreSQL | Relational data, ACID compliance |
| C-004 | Mobile: Flutter (Phase 2) | Cross-platform single codebase |
| C-005 | Communication: REST + WebSocket | Standard, well-supported |
| C-006 | AI: LLM provider abstraction | Avoid vendor lock-in |

### Assumptions

| ID | Assumption | Risk if Wrong |
|----|-----------|---------------|
| A-001 | Users have basic software development knowledge | Low - UI can guide non-technical users |
| A-002 | Single-user per account for MVP | Low - multi-user adds complexity |
| A-003 | AI responses are simulated/mock for MVP | None - abstraction allows real LLM swap later |
| A-004 | Projects are small-to-medium scale | Medium - large projects may need different orchestration |
| A-005 | Internet connectivity required | Low - reasonable for cloud-based tool |

### Dependencies

| ID | Dependency | Type |
|----|-----------|------|
| D-001 | PostgreSQL database server | Infrastructure |
| D-002 | Node.js runtime | Build |
| D-003 | Python 3.11+ runtime | Build |
| D-004 | Flutter SDK (Phase 2) | Build |
| D-005 | LLM API access (Phase 2) | External service |

### Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| R-001 | AI output quality insufficient | High | Human approval checkpoints; mock responses for MVP |
| R-002 | Orchestrator complexity too high | High | Start with sequential workflow; parallelize later |
| R-003 | Scope creep across 24 phases | High | Strict MVP definition; defer non-essential features |
| R-004 | WebSocket reliability | Medium | Implement reconnection and message queuing |
| R-005 | Mobile app scope creep | Medium | Mobile is Phase 2; focus on core web first |
