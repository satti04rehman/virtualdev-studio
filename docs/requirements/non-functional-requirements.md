# Non-Functional Requirements

## ID: REQ-NFR-001

### Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | API response time for standard requests | < 500ms (p95) |
| NFR-002 | WebSocket message delivery | < 100ms |
| NFR-003 | Dashboard initial load | < 3 seconds |
| NFR-004 | Concurrent projects per user | ≥ 10 |

### Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-100 | Authentication | JWT-based with refresh tokens |
| NFR-101 | Authorization | Role-based access control |
| NFR-102 | API rate limiting | 100 requests/minute per user |
| NFR-103 | Input validation | All API inputs validated and sanitized |
| NFR-104 | Secrets management | No secrets in code; environment variables only |

### Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-200 | System availability | 99.5% uptime |
| NFR-201 | Data durability | Zero data loss for project state |
| NFR-202 | Agent failure recovery | Automatic retry with graceful degradation |

### Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-300 | Mobile responsive | All web pages functional on mobile |
| NFR-301 | Accessibility | WCAG 2.1 AA compliance |
| NFR-302 | Onboarding | New user can create first project within 5 minutes |

### Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-400 | Code coverage | ≥ 70% for critical paths |
| NFR-401 | API documentation | OpenAPI/Swagger auto-generated |
| NFR-402 | Modular architecture | Components independently deployable |
