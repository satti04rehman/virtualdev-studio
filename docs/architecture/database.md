# Database Design

## ID: REQ-DB-001

### Overview

PostgreSQL database for VirtualDev Studio. Schema designed for the MVP with clear extension points.

### Entity Relationship Summary

```
users 1──N projects 1──N project_stages
projects 1──N project_requirements
projects 1──N research_items
projects 1──N architecture_components
projects 1──N documents
projects 1──N diagrams
projects 1──N presentations
projects 1──N approvals
projects 1──N audit_logs
projects 1──N tasks 1──N task_runs
agents 1──N tasks
agents 1──N task_runs
```

### Tables

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | DEFAULT 'user', CHECK IN ('admin','user') |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### projects
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| owner_id | UUID | FK users(id) |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| target_users | TEXT | |
| platform | VARCHAR(100) | |
| preferred_tech | JSONB | |
| constraints | TEXT | |
| complexity | VARCHAR(50) | CHECK IN ('low','medium','high','enterprise') |
| status | VARCHAR(50) | DEFAULT 'created', CHECK IN stages |
| current_stage | VARCHAR(50) | |
| progress | INTEGER | DEFAULT 0, CHECK 0-100 |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### project_stages
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| stage_name | VARCHAR(100) | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'pending' |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| output_data | JSONB | |
| error_message | TEXT | |

#### project_requirements
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| type | VARCHAR(50) | CHECK IN ('functional','nonfunctional','constraint','assumption') |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| priority | VARCHAR(20) | DEFAULT 'P1' |
| status | VARCHAR(50) | DEFAULT 'draft' |
| acceptance_criteria | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### research_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| category | VARCHAR(100) | |
| title | VARCHAR(255) | |
| content | TEXT | |
| source | VARCHAR(500) | |
| source_type | VARCHAR(50) | CHECK IN ('fact','inference','proposal') |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### architecture_components
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| name | VARCHAR(255) | |
| type | VARCHAR(100) | CHECK IN ('service','module','database','external','frontend','ai_agent') |
| description | TEXT | |
| technology | VARCHAR(255) | |
| dependencies | JSONB | |
| configuration | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### agents
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| role | VARCHAR(100) | NOT NULL |
| description | TEXT | |
| capabilities | JSONB | |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### tasks
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| agent_id | UUID | FK agents(id) |
| title | VARCHAR(255) | |
| description | TEXT | |
| stage | VARCHAR(100) | |
| status | VARCHAR(50) | DEFAULT 'queued' |
| priority | INTEGER | DEFAULT 0 |
| input_data | JSONB | |
| output_data | JSONB | |
| error_message | TEXT | |
| requires_approval | BOOLEAN | DEFAULT false |
| approval_id | UUID | FK approvals(id) |
| created_at | TIMESTAMPTZ | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

#### task_runs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | FK tasks(id) |
| agent_id | UUID | FK agents(id) |
| status | VARCHAR(50) | |
| input_data | JSONB | |
| output_data | JSONB | |
| error_message | TEXT | |
| duration_ms | INTEGER | |
| tokens_used | INTEGER | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

#### documents
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| title | VARCHAR(255) | |
| doc_type | VARCHAR(100) | CHECK IN ('requirements','architecture','api','user_guide','developer_guide','security','testing','report') |
| content | TEXT | |
| format | VARCHAR(20) | DEFAULT 'markdown' |
| version | INTEGER | DEFAULT 1 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### diagrams
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| title | VARCHAR(255) | |
| diagram_type | VARCHAR(100) | |
| source_format | VARCHAR(20) | DEFAULT 'mermaid' |
| source_content | TEXT | |
| rendered_path | VARCHAR(500) | |
| created_at | TIMESTAMPTZ | |

#### presentations
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| title | VARCHAR(255) | |
| slide_count | INTEGER | |
| file_path | VARCHAR(500) | |
| created_at | TIMESTAMPTZ | |

#### approvals
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| action | VARCHAR(255) | NOT NULL |
| reason | TEXT | |
| risk_level | VARCHAR(20) | CHECK IN ('low','medium','high','critical') |
| expected_result | TEXT | |
| status | VARCHAR(50) | DEFAULT 'pending' |
| decision | VARCHAR(20) | |
| decision_notes | TEXT | |
| decided_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK projects(id) |
| user_id | UUID | FK users(id) |
| action | VARCHAR(255) | |
| entity_type | VARCHAR(100) | |
| entity_id | UUID | |
| details | JSONB | |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### Indexes

```sql
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_stages_project ON project_stages(project_id);
CREATE INDEX idx_project_requirements_project ON project_requirements(project_id);
CREATE INDEX idx_research_items_project ON research_items(project_id);
CREATE INDEX idx_architecture_components_project ON architecture_components(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_runs_task ON task_runs(task_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_diagrams_project ON diagrams(project_id);
CREATE INDEX idx_approvals_project ON approvals(project_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Migration Strategy

1. Use Alembic for schema migrations
2. Initial migration creates all tables
3. Seed data migration populates default agents
4. All migrations must be reversible
5. No destructive migrations without backup confirmation
