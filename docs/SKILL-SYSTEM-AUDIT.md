# Skill System Audit

## Context

This audit evaluates the entire OpenCode professional skill ecosystem after a full end-to-end software project (VirtualDev Studio, 24 phases, ~2,000 backend LOC, ~3,100 frontend LOC, ~4,000 mobile LOC, 6,900+ doc lines).

The project was structured as a coordinated **Product + Engineering + AI + Design + QA + Security + Documentation + Delivery** team simulation.

---

## 1. Which skills worked well?

| Skill | Why it worked |
|-------|---------------|
| **python-fastapi-engineer** | Production-grade workflow (routers/schemas/services/errors/tests). Directly produced testable backend. |
| **react-typescript-engineer** | Strong typed-contract discipline; loading/error/empty states enforced. Produced a clean 15-page app. |
| **flutter-dart-engineer** | Repositories/services/models separation; typed `fromJson`; the sub-agent matched backend schemas exactly. |
| **database-engineer** | Constraints/indexes/migration guidance produced a schema that matched the ERD and models exactly. |
| **requirements-engineer** | Traceability discipline (FR/NFR/US IDs) that tests and acceptance criteria later referenced. |
| **git-release-engineer** | Clean 13-commit history, CHANGELOG, v0.1.0 tag, .gitignore — professional release hygiene. |
| **presentation-engineer** | Bullet-driven slides with one message per slide; generated a real 20-slide PPTX from actual project data. |
| **mcp-tool-engineer** | The 1,938-line tool architecture with permission boundaries is genuinely production-usable. |
| **testing-engineer** | PLAN→IMPLEMENT→RUN→FIX loop caught a real bug (MultipleResultsFound) that the code path otherwise hid. |

## 2. Which skills were weak?

| Skill | Weakness |
|-------|----------|
| **ai-evaluation-engineer** | Cannot operate meaningfully on mock AI. Useless until real LLM integration. |
| **code-engineer** | Generic; adds no distinct workflow over the stack-specific skills. Felt redundant. |
| **api-integration-engineer** | No enforcement mechanism; the frontend service routes and backend routes drifted despite the skill existing. |
| **system-analyst** | Outputs were thorough but overlapped with software-architect's document almost completely. |

## 3. Which skills overlapped?

1. **research-engineer / startup-market-researcher** — both "web research with verified sources." Merged in practice.
2. **product-strategy-engineer / startup-market-researcher / startup-pitch-engineer** — value prop + market + pricing appear in all three.
3. **client-requirements-engineer / requirements-engineer** — 90% identical workflow; audience is the only difference.
4. **system-analyst / software-architect** — both produced overlapping analysis/architecture docs.
5. **technical-documentation-engineer / project-docs** — both "document the project accurately."

## 4. Which skills were missing?

1. **Async SQLAlchemy test-fixture skill** — nothing in the ecosystem specifies the pytest-asyncio + ASGITransport + dependency-override + SQLite compiler-shim pattern. Discovered entirely empirically and hand-rolled in conftest.py.
2. **Frontend↔Backend contract sync skill** — no skill validates that the TS API client matches FastAPI routes/schemas. This caused documented drift.
3. **ADR/decision convention** — decision-log was improvised; a lightweight ADR template skill would standardize it.
4. **Diagram↔code sync checker** — diagram-engineer draws diagrams but nothing verifies "diagram matches implementation."

## 5. Which skills should be merged?

| Merge | Into | Rationale |
|-------|------|-----------|
| startup-market-researcher + product-strategy-engineer + startup-pitch-engineer | **product-strategy-engineer** | One skill for "analyze the business of the product" with sub-phases. |
| research-engineer + startup-market-researcher | **research-engineer** | Generic research with a "product/market" mode. |
| system-analyst + software-architect | **software-architect** | Analysis is a prerequisite phase of architecture. |
| technical-documentation-engineer + project-docs | **project-docs** | Both verify docs match code; unify tooling. |
| code-engineer (absorb) | stack skills | Its rules (reuse, minimal deps) are already in the stack skills. |

## 6. Which skills should be split?

| Skill | Proposed split |
|-------|----------------|
| **testing-engineer** | Split into (a) test-planning strategy, (b) backend async test-fixture patterns, (c) frontend/component testing. The fixture pattern is the most valuable and most missing. |
| **mcp-tool-engineer** | Split into (a) tool registry design, (b) permission/safety model, (c) reference implementation starter. Currently one doc does all three at varying depth. |

## 7. Which skills need better instructions?

- **python-fastapi-engineer** — add concrete async test fixture patterns (pytest-asyncio, ASGITransport). Currently says "test with pytest + httpx TestClient" but not *how* for an async SQLAlchemy app.
- **database-engineer** — document how to make PostgreSQL-flavored models (UUID, JSONB) testable under SQLite.
- **react-typescript-engineer** — add a step for generating the typed API client and validating it against the backend OpenAPI schema.
- **flutter-dart-engineer** — the secure-token guidance ("never in shared_preferences") wasn't followed because `flutter_secure_storage` wasn't in the dependency list; skill should say *which package to add* proactively.

## 8. Which skills need better examples?

- **ai-application-engineer** — no example of a *mock/abstracted* LLM layer; the project's mock provider was improvised.
- **code-reviewer** — example findings are non-domain; a worked example on a FastAPI app (IDOR, rate limiting) would calibrate severity.
- **debugger** — no example of "test exposed a bug during a stress-test phase," which was exactly what happened here.

## 9. Which skills need additional tools?

| Skill | Missing tool |
|-------|--------------|
| **diagram-engineer** | A diagram renderer (e.g., mermaid-cli) is documented but not provisioned; diagrams stay `.mmd` only. |
| **presentation-engineer** | Screen-capture of the running app; PPTX had no real screenshots. |
| **testing-engineer** | Coverage tooling (pytest-cov) absent from defaults. |
| **technical-documentation-engineer** | A doc↔code verification checker; the sub-agent had to do this by hand. |

## 10. Which workflows should become automated?

1. **Skill auto-load on phase match** — when a phase explicitly names a skill, the orchestrator should load it via the skill tool automatically, not rely on the model remembering to do so. Only 6 of 29 relevant skills were actually loaded.
2. **Doc↔code sync check** — a nightly/CI script that diffs API docs against FastAPI routes and pages against routes.
3. **API client generation** — derive the TypeScript client from FastAPI's OpenAPI schema automatically.
4. **Test-gated release** — a script that blocks release unless test count/coverage thresholds pass.
5. **Diagram render CI** — auto-render `.mmd` to PNG/SVG on commit.

## 11. Which skills should interact directly?

- **requirements-engineer → testing-engineer**: automatically derive acceptance-criteria test skeletons from FR/US IDs. Currently a human (or sub-agent) does this mapping.
- **database-engineer → diagram-engineer**: push schema changes into the ERD. Currently manual.
- **software-architect → python-fastapi-engineer/react-typescript-engineer**: export the arch doc's API surface into route/schema boilerplate. Currently manual.
- **documentation-engineer → presentation-engineer**: reuse project-report sections for slide content. Currently manual.

## 12. What would make this ecosystem closer to a professional senior engineering environment?

1. **A skill orchestrator layer** — today the main agent chooses which skills to load. A senior engineer doesn't forget to consult specialists; add deterministic phase→skill mapping and load verification (RULE-1 friendly: report which skills were *actually* loaded).
2. **Enforced handoffs** — formal interfaces between phases (requirements → tests; arch → API contract; DB → ERD). Senior teams have these as review gates.
3. **Reference implementations** — each skill ships a minimal do-this-exactly starter (async test fixture, tool registry, ADR template). Kills most "figure it out from scratch" time.
4. **Automated verification primitives** — CI hooks that the skills invoke (test gating, doc↔code diff, diagram render).
5. **Skill load accountability** — a meta-skill that audits, at the end of any project, which skills were loaded vs. matched to phases. This prevents "skills exist but were never used" drift.
6. **Concurrency harness** — several tasks ran as delegated sub-agents whose prompts reproduced skill content. A native "skill as sub-agent" mode would apply the skill file directly instead of paraphrasing it.

---

## Bottom line

The ecosystem **functioned** as a coordinated team: it produced a working end-to-end product with tests, security review, documentation, diagrams, presentation, and clean git history — all under 24 phases. But it under-performed its own capability: only 6 of 29 relevant skills were **actually loaded**, and 4 skills were unnecessary, 5 pairs overlapped, and 3 combinations were missing. The largest single improvement is **deterministic skill loading + handoff enforcement**, turning the ecosystem from "a library of good advice" into "a managed engineering organization."