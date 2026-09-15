# VirtualDev Studio — MCP Tool Architecture

## 1. Overview

The MCP (Model Context Protocol) tool layer gives the AI orchestrator safe, discoverable access to system capabilities — filesystem, code analysis, databases, git, testing, and research — through a standardized interface. Each tool is a typed contract: name, description, input schema, output schema, permissions, and safety constraints.

This document defines the tool registry, all tool specifications, the permission system, and the safety model. It integrates with the existing architecture defined in `high-level-architecture.md` and the agent roles in `orchestrator_models.py`.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT ORCHESTRATOR                            │
│  (backend/app/ai/orchestrator.py)                                │
│                                                                   │
│  1. Receives task from Celery queue                               │
│  2. Loads project context                                         │
│  3. Selects agent role (Developer, Tester, etc.)                  │
│  4. Builds prompt with context + task + available tools           │
│  5. Calls LLM via abstraction layer                               │
│  6. LLM returns tool_calls[]                                      │
│  7. ┌──────────────────────────────────────────────────────────┐  │
│     │              MCP TOOL LAYER                              │  │
│     │                                                          │  │
│     │  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐ │  │
│     │  │ Tool        │   │ Permission   │   │ Audit        │ │  │
│     │  │ Registry    │──▶│ Gate         │──▶│ Logger       │ │  │
│     │  └──────┬──────┘   └──────────────┘   └──────────────┘ │  │
│     │         │                                                │  │
│     │  ┌──────▼──────────────────────────────────────────────┐ │  │
│     │  │              TOOL HANDLERS                          │ │  │
│     │  │  Filesystem · Project · Documentation · Testing     │ │  │
│     │  │  Database · Research · Git · Terminal               │ │  │
│     │  └──────┬──────────────────────────────────────────────┘ │  │
│     │         │                                                │  │
│     │  ┌──────▼──────────────────────────────────────────────┐ │  │
│     │  │           SAFETY LAYER                              │ │  │
│     │  │  Path Sandbox · Rate Limiter · Rollback Manager     │ │  │
│     │  │  Command Whitelist · Injection Guard                 │ │  │
│     │  └─────────────────────────────────────────────────────┘ │  │
│     └──────────────────────────────────────────────────────────┘  │
│  8. Executes tool calls, feeds results back to LLM               │
│  9. Loops until task complete or budget exhausted                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tool Registry

The registry is the central catalog of all available tools. Agents query it to discover which tools they can use. The registry enforces per-role access policies.

### 3.1 Registry Interface

```python
# backend/app/ai/tools/registry.py

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional
from uuid import UUID


class RiskLevel(str, Enum):
    READ_ONLY = "read_only"         # No side effects
    MUTATE = "mutate"               # Changes project state
    DESTRUCTIVE = "destructive"     # Deletes data or runs external commands
    CRITICAL = "critical"           # Affects system state or external services


class ToolCategory(str, Enum):
    FILESYSTEM = "filesystem"
    PROJECT = "project"
    DOCUMENTATION = "documentation"
    TESTING = "testing"
    DATABASE = "database"
    RESEARCH = "research"
    GIT = "git"
    TERMINAL = "terminal"


@dataclass
class ToolParameter:
    name: str
    type: str                         # "string", "integer", "boolean", "array", "object"
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[list] = None       # Allowed values
    min_value: Optional[int] = None   # For integers
    max_value: Optional[int] = None   # For integers
    pattern: Optional[str] = None     # Regex for string validation


@dataclass
class ToolDefinition:
    name: str                         # Unique identifier, e.g. "read_file"
    description: str                  # Precise description for agent selection
    category: ToolCategory
    risk_level: RiskLevel
    parameters: list[ToolParameter]
    return_type: str                  # JSON schema description
    permissions: list[str]            # e.g. ["project:read"]
    requires_approval: bool = False   # Needs human approval before execution
    rate_limit_per_minute: int = 30   # Max calls per minute per agent
    timeout_seconds: int = 30         # Handler timeout
    handler: Optional[Callable] = None


@dataclass
class ToolCallRequest:
    tool_name: str
    arguments: dict[str, Any]
    agent_id: str
    agent_role: str
    project_id: UUID
    call_id: str                      # Unique ID for audit trail


@dataclass
class ToolCallResult:
    call_id: str
    tool_name: str
    success: bool
    data: Any = None                  # Result payload
    error_code: Optional[str] = None  # Typed error code
    error_message: Optional[str] = None
    duration_ms: int = 0
    rollback_available: bool = False
    rollback_id: Optional[str] = None


class ToolRegistry:
    """Central registry for all MCP tools. Singleton per server instance."""

    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}
        self._handlers: dict[str, Callable] = {}
        self._rate_limits: dict[str, list[float]] = {}  # tool:agent -> timestamps

    def register(self, tool: ToolDefinition) -> None:
        """Register a tool definition with its handler."""
        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' already registered")
        self._tools[tool.name] = tool
        if tool.handler:
            self._handlers[tool.name] = tool.handler

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools_for_role(self, role: str) -> list[ToolDefinition]:
        """Return tools available to a specific agent role."""
        role_permissions = ROLE_PERMISSIONS.get(role, set())
        return [
            t for t in self._tools.values()
            if set(t.permissions).issubset(role_permissions)
        ]

    def list_all_tools(self) -> list[ToolDefinition]:
        return list(self._tools.values())

    def to_mcp_schema(self, role: str) -> list[dict]:
        """Convert tools to MCP-compatible JSON schemas for LLM consumption."""
        tools = self.list_tools_for_role(role)
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": {
                    "type": "object",
                    "properties": {
                        p.name: {
                            "type": p.type,
                            "description": p.description,
                            **({"enum": p.enum} if p.enum else {}),
                            **({"default": p.default} if p.default is not None else {}),
                        }
                        for p in t.parameters
                    },
                    "required": [p.name for p in t.parameters if p.required],
                },
            }
            for t in tools
        ]
```

### 3.2 Registry Initialization

```python
# backend/app/ai/tools/__init__.py

def create_registry() -> ToolRegistry:
    """Build the tool registry with all available tools."""
    registry = ToolRegistry()

    # Import and register each tool category
    from app.ai.tools.filesystem import FILESYSTEM_TOOLS
    from app.ai.tools.project import PROJECT_TOOLS
    from app.ai.tools.documentation import DOCUMENTATION_TOOLS
    from app.ai.tools.testing import TESTING_TOOLS
    from app.ai.tools.database import DATABASE_TOOLS
    from app.ai.tools.research import RESEARCH_TOOLS
    from app.ai.tools.git import GIT_TOOLS
    from app.ai.tools.terminal import TERMINAL_TOOLS

    for tool in (
        FILESYSTEM_TOOLS + PROJECT_TOOLS + DOCUMENTATION_TOOLS +
        TESTING_TOOLS + DATABASE_TOOLS + RESEARCH_TOOLS +
        GIT_TOOLS + TERMINAL_TOOLS
    ):
        registry.register(tool)

    return registry
```

---

## 4. Tool Specifications

### 4.1 Filesystem Tools

#### read_file

| Field | Value |
|---|---|
| **Name** | `read_file` |
| **Description** | Read the contents of a file within the project workspace. Returns the full text content with line numbers. Use for examining existing code, config files, or any text file before making changes. |
| **Category** | Filesystem |
| **Risk Level** | `read_only` |
| **Permissions** | `project:read` |
| **Requires Approval** | No |
| **Rate Limit** | 60/min |
| **Timeout** | 10s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `file_path` | string | Yes | Relative path to file within project workspace | Must not contain `..`. Must start with `/` or be relative. Max 1024 chars |
| `encoding` | string | No | File encoding | Default: `utf-8`. Enum: `utf-8`, `ascii`, `latin-1` |
| `offset` | integer | No | Line number to start reading from (1-indexed) | Min: 1 |
| `limit` | integer | No | Max lines to return | Min: 1, Max: 5000, Default: 2000 |

**Return Type:**
```json
{
  "file_path": "string",
  "total_lines": "integer",
  "offset": "integer",
  "limit": "integer",
  "content": "string",
  "truncated": "boolean",
  "encoding": "string"
}
```

**Error Codes:**
| Code | Meaning |
|---|---|
| `FILE_NOT_FOUND` | File does not exist at given path |
| `PATH_TRAVERSAL_BLOCKED` | Path attempts to escape project workspace |
| `FILE_TOO_LARGE` | File exceeds read limit (>10MB) |
| `ENCODING_ERROR` | Cannot decode file with specified encoding |
| `PERMISSION_DENIED` | File is outside allowed scope |

---

#### write_file

| Field | Value |
|---|---|
| **Name** | `write_file` |
| **Description** | Write content to a file within the project workspace. Creates the file if it does not exist, overwrites if it does. Automatically creates parent directories. A snapshot is saved for rollback. |
| **Category** | Filesystem |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write` |
| **Requires Approval** | No (approval required for files outside `src/`) |
| **Rate Limit** | 20/min |
| **Timeout** | 15s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `file_path` | string | Yes | Relative path within project workspace | Must not contain `..`. Max 1024 chars |
| `content` | string | Yes | File content to write | Max 500KB |
| `encoding` | string | No | File encoding | Default: `utf-8` |
| `create_directories` | boolean | No | Create parent directories if missing | Default: `true` |
| `overwrite` | boolean | No | Allow overwriting existing files | Default: `true` |

**Return Type:**
```json
{
  "file_path": "string",
  "bytes_written": "integer",
  "created": "boolean",
  "rollback_id": "string"
}
```

**Error Codes:**
| Code | Meaning |
|---|---|
| `PATH_TRAVERSAL_BLOCKED` | Path attempts to escape project workspace |
| `FILE_READ_ONLY` | Target file is marked as protected (e.g. `.env`, config secrets) |
| `DISK_FULL` | No space left on device |
| `CONTENT_TOO_LARGE` | Content exceeds maximum allowed size |

---

#### list_directory

| Field | Value |
|---|---|
| **Name** | `list_directory` |
| **Description** | List files and subdirectories in a directory. Returns names, types, sizes, and modification times. Use for navigating project structure. |
| **Category** | Filesystem |
| **Risk Level** | `read_only` |
| **Permissions** | `project:read` |
| **Requires Approval** | No |
| **Rate Limit** | 60/min |
| **Timeout** | 10s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `dir_path` | string | Yes | Relative path to directory within workspace | Must not contain `..` |
| `recursive` | boolean | No | List all nested contents | Default: `false` |
| `include_hidden` | boolean | No | Include hidden files (dotfiles) | Default: `false` |
| `max_depth` | integer | No | Max recursion depth when recursive | Min: 1, Max: 10, Default: 3 |
| `pattern` | string | No | Glob pattern to filter results | e.g. `*.py`, `*.ts` |

**Return Type:**
```json
{
  "dir_path": "string",
  "entries": [
    {
      "name": "string",
      "type": "string",
      "size_bytes": "integer",
      "modified_at": "string",
      "extension": "string"
    }
  ],
  "total_count": "integer",
  "truncated": "boolean"
}
```

---

#### search_files

| Field | Value |
|---|---|
| **Name** | `search_files` |
| **Description** | Search for files by name pattern or content regex within the project workspace. Returns matching file paths with context lines for content searches. |
| **Category** | Filesystem |
| **Risk Level** | `read_only` |
| **Permissions** | `project:read` |
| **Requires Approval** | No |
| **Rate Limit** | 30/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `query` | string | Yes | Search query: glob pattern for filenames or regex for content | Max 512 chars |
| `search_type` | string | No | `filename` or `content` | Default: `filename`. Enum: `filename`, `content` |
| `dir_path` | string | No | Directory to search in (relative to workspace) | Default: `/` |
| `file_extensions` | array | No | Limit search to these extensions | e.g. `[".py", ".ts"]` |
| `max_results` | integer | No | Maximum results to return | Min: 1, Max: 500, Default: 100 |

**Return Type:**
```json
{
  "query": "string",
  "search_type": "string",
  "results": [
    {
      "file_path": "string",
      "line_number": "integer | null",
      "line_content": "string | null",
      "match_context": "string | null"
    }
  ],
  "total_matches": "integer",
  "truncated": "boolean"
}
```

---

### 4.2 Project Tools

#### scan_project

| Field | Value |
|---|---|
| **Name** | `scan_project` |
| **Description** | Analyze the project structure: detect framework, languages, entry points, configuration files, directory layout, and dependencies. Returns a structured summary useful for understanding a project before making changes. |
| **Category** | Project |
| **Risk Level** | `read_only` |
| **Permissions** | `project:read` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 60s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `depth` | string | No | Scan depth: `quick` (top-level only), `standard` (2 levels), `deep` (full tree) | Default: `standard`. Enum: `quick`, `standard`, `deep` |
| `include_dependencies` | boolean | No | Parse dependency files (package.json, requirements.txt, etc.) | Default: `true` |

**Return Type:**
```json
{
  "project_root": "string",
  "detected_framework": "string | null",
  "detected_languages": ["string"],
  "entry_points": ["string"],
  "config_files": ["string"],
  "dependency_files": ["string"],
  "directory_tree": {
    "name": "string",
    "type": "string",
    "children": ["..."]
  },
  "summary": {
    "total_files": "integer",
    "total_directories": "integer",
    "by_extension": {"string": "integer"},
    "estimated_lines_of_code": "integer"
  }
}
```

---

#### analyze_code

| Field | Value |
|---|---|
| **Name** | `analyze_code` |
| **Description** | Analyze code metrics for a file or directory: complexity, line count, function/class inventory, imports, TODO/FIXME markers, and potential issues. Useful for code review and planning refactors. |
| **Category** | Project |
| **Risk Level** | `read_only` |
| **Permissions** | `project:read` |
| **Requires Approval** | No |
| **Rate Limit** | 20/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `path` | string | Yes | Relative path to file or directory | Must not contain `..` |
| `metrics` | array | No | Specific metrics to compute | Default: all. Enum: `complexity`, `duplication`, `dependencies`, `todo_markers`, `type_coverage` |

**Return Type:**
```json
{
  "path": "string",
  "language": "string",
  "metrics": {
    "lines_of_code": "integer",
    "blank_lines": "integer",
    "comment_lines": "integer",
    "functions": [
      {
        "name": "string",
        "line_start": "integer",
        "line_end": "integer",
        "complexity": "integer",
        "parameters": "integer"
      }
    ],
    "classes": [
      {
        "name": "string",
        "line_start": "integer",
        "line_end": "integer",
        "methods_count": "integer"
      }
    ],
    "imports": ["string"],
    "todos": [
      {
        "line": "integer",
        "text": "string"
      }
    ],
    "cognitive_complexity": "integer"
  }
}
```

---

#### generate_code

| Field | Value |
|---|---|
| **Name** | `generate_code` |
| **Description** | Generate a code file from a specification. The LLM produces the code, and this tool validates syntax, applies formatting, writes to disk, and registers the file in the project artifact store. This is the primary tool for code creation. |
| **Category** | Project |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write`, `project:code_generate` |
| **Requires Approval** | No (approval required for production/deployment files) |
| **Rate Limit** | 10/min |
| **Timeout** | 60s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `file_path` | string | Yes | Target file path within project workspace | Must not contain `..` |
| `content` | string | Yes | Generated code content | Max 200KB |
| `language` | string | Yes | Programming language | Enum: `python`, `javascript`, `typescript`, `go`, `rust`, `java`, `sql`, `html`, `css`, `yaml`, `json`, `shell`, `other` |
| `description` | string | No | Human-readable description of what the code does | Max 512 chars |
| `overwrite_existing` | boolean | No | Allow overwriting existing files | Default: `false` |

**Return Type:**
```json
{
  "file_path": "string",
  "language": "string",
  "lines_written": "integer",
  "syntax_valid": "boolean",
  "rollback_id": "string",
  "artifact_id": "string"
}
```

---

### 4.3 Documentation Tools

#### generate_documentation

| Field | Value |
|---|---|
| **Name** | `generate_documentation` |
| **Description** | Create or update a markdown documentation file. Supports structured docs: README, API reference, architecture guides, user guides, developer guides, and custom documentation. Stores in the project's document table. |
| **Category** | Documentation |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write`, `project:document` |
| **Requires Approval** | No |
| **Rate Limit** | 15/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `title` | string | Yes | Documentation title | Max 255 chars |
| `doc_type` | string | Yes | Type of documentation | Enum: `requirements`, `architecture`, `api`, `user_guide`, `developer_guide`, `security`, `testing`, `report`, `readme`, `custom` |
| `content` | string | Yes | Markdown content | Max 500KB |
| `file_path` | string | No | Optional file path to also write to disk | Relative to project workspace |
| `overwrite` | boolean | No | Overwrite existing doc with same type and title | Default: `false` |

**Return Type:**
```json
{
  "document_id": "string",
  "title": "string",
  "doc_type": "string",
  "file_path": "string | null",
  "version": "integer",
  "content_length": "integer"
}
```

---

#### generate_diagram

| Field | Value |
|---|---|
| **Name** | `generate_diagram` |
| **Description** | Create a Mermaid diagram for the project. Supports: ERD, architecture, sequence, flowchart, class, state, and Gantt diagrams. Stores source in the diagrams table and optionally renders to SVG. |
| **Category** | Documentation |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write`, `project:document` |
| **Requires Approval** | No |
| **Rate Limit** | 15/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `title` | string | Yes | Diagram title | Max 255 chars |
| `diagram_type` | string | Yes | Type of diagram | Enum: `erd`, `architecture`, `sequence`, `flowchart`, `class`, `state`, `gantt`, `custom` |
| `mermaid_source` | string | Yes | Valid Mermaid diagram source code | Max 50KB |
| `render_svg` | boolean | No | Render to SVG after creation | Default: `false` |

**Return Type:**
```json
{
  "diagram_id": "string",
  "title": "string",
  "diagram_type": "string",
  "source_format": "string",
  "rendered_path": "string | null"
}
```

---

#### update_readme

| Field | Value |
|---|---|
| **Name** | `update_readme` |
| **Description** | Create or update the project's README.md. Generates a structured README with sections: overview, installation, usage, API reference, contributing, and license. Can update specific sections or rewrite entirely. |
| **Category** | Documentation |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write`, `project:document` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 20s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `content` | string | Yes | Full README markdown content | Max 200KB |
| `mode` | string | No | `full` replaces entire file, `section` updates a specific section | Default: `full`. Enum: `full`, `section` |
| `section` | string | No | Section name to update (when mode=section) | Max 100 chars |

**Return Type:**
```json
{
  "file_path": "string",
  "bytes_written": "integer",
  "mode": "string",
  "updated_section": "string | null",
  "rollback_id": "string"
}
```

---

### 4.4 Testing Tools

#### run_tests

| Field | Value |
|---|---|
| **Name** | `run_tests` |
| **Description** | Execute the project's test suite. Auto-detects the test framework (pytest, jest, go test, etc.) and runs tests. Returns structured results with pass/fail counts, durations, and failure details. |
| **Category** | Testing |
| **Risk Level** | `destructive` |
| **Permissions** | `project:execute`, `project:test` |
| **Requires Approval** | No |
| **Rate Limit** | 5/min |
| **Timeout** | 300s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `test_path` | string | No | Specific file or directory to test | Relative to project workspace |
| `framework` | string | No | Force a specific test framework | Enum: `pytest`, `jest`, `vitest`, `go_test`, `cargo_test`, `junit`, `auto` (default) |
| `filter` | string | No | Test name filter/pattern | Max 256 chars |
| `verbose` | boolean | No | Include detailed output | Default: `false` |
| `timeout` | integer | No | Max execution time in seconds | Min: 10, Max: 600, Default: 120 |

**Return Type:**
```json
{
  "framework": "string",
  "total_tests": "integer",
  "passed": "integer",
  "failed": "integer",
  "skipped": "integer",
  "duration_ms": "integer",
  "coverage_percent": "number | null",
  "failures": [
    {
      "test_name": "string",
      "file": "string",
      "line": "integer",
      "error": "string",
      "traceback": "string"
    }
  ],
  "output_summary": "string"
}
```

---

#### analyze_coverage

| Field | Value |
|---|---|
| **Name** | `analyze_coverage` |
| **Description** | Analyze test coverage for the project. Runs coverage tools and returns per-file and overall metrics. Identifies uncovered lines and functions. |
| **Category** | Testing |
| **Risk Level** | `destructive` |
| **Permissions** | `project:execute`, `project:test` |
| **Requires Approval** | No |
| **Rate Limit** | 5/min |
| **Timeout** | 300s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `path` | string | No | Specific file or directory to analyze | Relative to project workspace |
| `min_threshold` | integer | No | Fail if coverage below this percent | Min: 0, Max: 100 |
| `format` | string | No | Output format | Default: `summary`. Enum: `summary`, `detailed`, `json` |

**Return Type:**
```json
{
  "overall_coverage_percent": "number",
  "threshold_met": "boolean",
  "files": [
    {
      "file_path": "string",
      "coverage_percent": "number",
      "lines_total": "integer",
      "lines_covered": "integer",
      "uncovered_lines": ["integer"]
    }
  ],
  "uncovered_functions": [
    {
      "file_path": "string",
      "function_name": "string",
      "line_start": "integer"
    }
  ]
}
```

---

#### create_test

| Field | Value |
|---|---|
| **Name** | `create_test` |
| **Description** | Generate test files for a given source file or module. The LLM produces test code and this tool validates syntax, writes the file, and registers it. Supports unit tests, integration tests, and edge case tests. |
| **Category** | Testing |
| **Risk Level** | `mutate` |
| **Permissions** | `project:write`, `project:test` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `source_path` | string | Yes | Source file to generate tests for | Relative to project workspace |
| `test_content` | string | Yes | Generated test code | Max 200KB |
| `test_path` | string | No | Where to write the test file | Auto-detected from convention if omitted |
| `test_type` | string | No | Type of test | Default: `unit`. Enum: `unit`, `integration`, `edge_case`, `snapshot` |

**Return Type:**
```json
{
  "test_file_path": "string",
  "source_file_path": "string",
  "test_type": "string",
  "lines_written": "integer",
  "syntax_valid": "boolean",
  "rollback_id": "string"
}
```

---

### 4.5 Database Tools

#### inspect_schema

| Field | Value |
|---|---|
| **Name** | `inspect_schema` |
| **Description** | View the database schema: tables, columns, types, constraints, indexes, and relationships. Returns a structured representation useful for understanding data models and writing queries. |
| **Category** | Database |
| **Risk Level** | `read_only` |
| **Permissions** | `database:read` |
| **Requires Approval** | No |
| **Rate Limit** | 30/min |
| **Timeout** | 15s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `table_name` | string | No | Specific table to inspect | Omit for all tables |
| `include_indexes` | boolean | No | Include index definitions | Default: `true` |
| `include_constraints` | boolean | No | Include constraint definitions | Default: `true` |

**Return Type:**
```json
{
  "tables": [
    {
      "name": "string",
      "columns": [
        {
          "name": "string",
          "type": "string",
          "nullable": "boolean",
          "default": "string | null",
          "is_primary_key": "boolean"
        }
      ],
      "indexes": [
        {
          "name": "string",
          "columns": ["string"],
          "unique": "boolean"
        }
      ],
      "constraints": [
        {
          "name": "string",
          "type": "string",
          "columns": ["string"],
          "references": "string | null"
        }
      ]
    }
  ],
  "total_tables": "integer",
  "total_relationships": "integer"
}
```

---

#### run_migration

| Field | Value |
|---|---|
| **Name** | `run_migration` |
| **Description** | Execute a database migration. Generates an Alembic migration script from a schema change description, applies it, and records the migration. **Requires human approval for destructive changes** (column drops, table deletes). |
| **Category** | Database |
| **Risk Level** | `critical` |
| **Permissions** | `database:write`, `database:migrate` |
| **Requires Approval** | **Always** |
| **Rate Limit** | 2/min |
| **Timeout** | 120s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `description` | string | Yes | Human-readable description of the schema change | Max 512 chars |
| `sql` | string | No | Raw SQL migration (if not auto-generating) | Max 50KB |
| `auto_generate` | boolean | No | Auto-generate from models | Default: `true` |
| `dry_run` | boolean | No | Show what would happen without executing | Default: `false` |

**Return Type:**
```json
{
  "migration_id": "string",
  "revision": "string",
  "description": "string",
  "applied": "boolean",
  "dry_run": "boolean",
  "sql_generated": "string | null",
  "tables_affected": ["string"],
  "destructive_changes": ["string"],
  "rollback_sql": "string | null"
}
```

---

#### query_data

| Field | Value |
|---|---|
| **Name** | `query_data` |
| **Description** | Run a read-only SQL query against the project database. Strictly enforces SELECT-only, parameterized queries with row limits. Used for data exploration and verification. |
| **Category** | Database |
| **Risk Level** | `read_only` |
| **Permissions** | `database:read`, `database:query` |
| **Requires Approval** | No |
| **Rate Limit** | 30/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `query` | string | Yes | SQL SELECT query | Must start with SELECT. Max 2048 chars. No DDL/DML. |
| `params` | object | No | Query parameters for parameterized queries | Key-value pairs |
| `max_rows` | integer | No | Maximum rows to return | Min: 1, Max: 1000, Default: 100 |

**Return Type:**
```json
{
  "columns": ["string"],
  "rows": [["any"]],
  "row_count": "integer",
  "truncated": "boolean",
  "execution_time_ms": "integer"
}
```

**Error Codes:**
| Code | Meaning |
|---|---|
| `QUERY_NOT_SELECT` | Query is not a SELECT statement |
| `QUERY_TOO_LONG` | Query exceeds max length |
| `SQL_SYNTAX_ERROR` | Invalid SQL syntax |
| `TABLE_NOT_FOUND` | Referenced table does not exist |

---

### 4.6 Research Tools

#### web_search

| Field | Value |
|---|---|
| **Name** | `web_search` |
| **Description** | Search the web for information. Returns structured results with titles, URLs, and snippets. Used for technology research, documentation lookup, and market analysis. |
| **Category** | Research |
| **Risk Level** | `read_only` |
| **Permissions** | `research:web` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 15s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `query` | string | Yes | Search query | Max 512 chars |
| `num_results` | integer | No | Number of results to return | Min: 1, Max: 20, Default: 8 |
| `search_type` | string | No | Search scope | Default: `auto`. Enum: `auto`, `fast`, `deep` |
| `domain_filter` | string | No | Restrict to specific domain | e.g. `github.com`, `stackoverflow.com` |

**Return Type:**
```json
{
  "query": "string",
  "results": [
    {
      "title": "string",
      "url": "string",
      "snippet": "string",
      "domain": "string",
      "published_date": "string | null"
    }
  ],
  "total_results": "integer"
}
```

---

#### analyze_url

| Field | Value |
|---|---|
| **Name** | `analyze_url` |
| **Description** | Fetch and analyze the content of a URL. Extracts text content, metadata, and structure. Use for reading documentation pages, GitHub repos, or API references. |
| **Category** | Research |
| **Risk Level** | `read_only` |
| **Permissions** | `research:web` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 30s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `url` | string | Yes | URL to fetch and analyze | Must be valid URL. HTTPS only. No internal/intranet URLs. |
| `format` | string | No | Desired output format | Default: `markdown`. Enum: `markdown`, `text`, `html` |
| `max_length` | integer | No | Max content length to return | Min: 1000, Max: 100000, Default: 50000 |

**Return Type:**
```json
{
  "url": "string",
  "title": "string",
  "content": "string",
  "format": "string",
  "content_length": "integer",
  "truncated": "boolean",
  "metadata": {
    "description": "string | null",
    "og_image": "string | null",
    "author": "string | null"
  }
}
```

---

### 4.7 Git Tools

#### git_status

| Field | Value |
|---|---|
| **Name** | `git_status` |
| **Description** | Get the current Git repository status: branch, modified files, staged files, untracked files, and ahead/behind counts. |
| **Category** | Git |
| **Risk Level** | `read_only` |
| **Permissions** | `git:read` |
| **Requires Approval** | No |
| **Rate Limit** | 30/min |
| **Timeout** | 10s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `include_diff_stats` | boolean | No | Include diff summary per file | Default: `false` |

**Return Type:**
```json
{
  "branch": "string",
  "remote": "string",
  "ahead": "integer",
  "behind": "integer",
  "staged": [
    {
      "file_path": "string",
      "status": "string",
      "additions": "integer",
      "deletions": "integer"
    }
  ],
  "modified": [
    {
      "file_path": "string",
      "status": "string"
    }
  ],
  "untracked": ["string"],
  "is_clean": "boolean"
}
```

---

#### git_diff

| Field | Value |
|---|---|
| **Name** | `git_diff` |
| **Description** | Get the diff of changes. Can show unstaged changes, staged changes, or diff between two commits/branches. Returns unified diff format. |
| **Category** | Git |
| **Risk Level** | `read_only` |
| **Permissions** | `git:read` |
| **Requires Approval** | No |
| **Rate Limit** | 30/min |
| **Timeout** | 15s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `target` | string | No | Diff target: `staged`, `unstaged`, or a specific file | Default: `unstaged` |
| `from_ref` | string | No | Start ref for commit-to-commit diff | e.g. `main`, `HEAD~3` |
| `to_ref` | string | No | End ref for commit-to-commit diff | Default: `HEAD` |
| `max_lines` | integer | No | Max diff lines to return | Min: 1, Max: 10000, Default: 5000 |

**Return Type:**
```json
{
  "diff_type": "string",
  "files_changed": "integer",
  "additions": "integer",
  "deletions": "integer",
  "diff_content": "string",
  "truncated": "boolean"
}
```

---

#### git_commit

| Field | Value |
|---|---|
| **Name** | `git_commit` |
| **Description** | Stage all changes and create a Git commit with a structured message. Does NOT push — push requires separate approval. Commits are local only. |
| **Category** | Git |
| **Risk Level** | `mutate` |
| **Permissions** | `git:write` |
| **Requires Approval** | No |
| **Rate Limit** | 10/min |
| **Timeout** | 15s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `message` | string | Yes | Commit message | Max 1024 chars |
| `files` | array | No | Specific files to stage (omit for all) | Relative paths |
| `author_name` | string | No | Commit author name | Default: "VirtualDev Agent" |
| `author_email` | string | No | Commit author email | Default: "agent@virtualdev.studio" |

**Return Type:**
```json
{
  "commit_hash": "string",
  "message": "string",
  "files_committed": "integer",
  "branch": "string",
  "author": "string"
}
```

---

### 4.8 Terminal Tools

#### run_command

| Field | Value |
|---|---|
| **Name** | `run_command` |
| **Description** | Execute a shell command in the project workspace. **Heavily restricted**: only whitelisted commands are allowed, executed in a sandboxed environment with no network access and a timeout. Used for package installation, build steps, and test execution. |
| **Category** | Terminal |
| **Risk Level** | `destructive` |
| **Permissions** | `project:execute`, `terminal:run` |
| **Requires Approval** | **Yes** (for commands not in the safe list) |
| **Rate Limit** | 10/min |
| **Timeout** | 300s |

**Parameters:**

| Name | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `command` | string | Yes | Shell command to execute | Max 2048 chars. Must start with whitelisted command. |
| `working_dir` | string | No | Working directory (relative to project workspace) | Default: project root |
| `timeout` | integer | No | Max execution time in seconds | Min: 5, Max: 300, Default: 60 |
| `env` | object | No | Additional environment variables | Key-value pairs. No secrets. |

**Safe Command Whitelist:**
```
# Package managers
npm, npx, yarn, pnpm, pip, pipenv, poetry, cargo, go, mvn, gradle

# Build tools
make, cmake, tsc, webpack, vite, esbuild, rollup, parcel

# Testing
pytest, jest, vitest, cargo test, go test, mocha, rspec

# Linting / Formatting
eslint, prettier, ruff, black, isort, flake8, mypy, pylint

# Version control
git (status, diff, log, branch, add, commit ONLY)

# File inspection
ls, cat, head, tail, wc, grep, find, tree, file, stat
```

**Return Type:**
```json
{
  "command": "string",
  "exit_code": "integer",
  "stdout": "string",
  "stderr": "string",
  "duration_ms": "integer",
  "timed_out": "boolean",
  "stdout_truncated": "boolean",
  "stderr_truncated": "boolean"
}
```

**Error Codes:**
| Code | Meaning |
|---|---|
| `COMMAND_NOT_WHITELISTED` | Command is not in the safe whitelist |
| `COMMAND_TIMEOUT` | Execution exceeded timeout |
| `SANDBOX_VIOLATION` | Command attempted disallowed operation |
| `NON_ZERO_EXIT` | Command exited with non-zero status |

---

## 5. Permission System

### 5.1 Permission Model

Permissions are string tokens of the form `domain:action`. Agents are granted sets of permissions based on their role. A tool can only be invoked if the agent's permission set includes all permissions required by that tool.

```
Permission Taxonomy:

  project:read           # Read project files and structure
  project:write          # Write/create files in project workspace
  project:code_generate  # Generate new code files
  project:execute        # Run commands in project workspace
  project:test           # Run tests and generate test files
  project:document       # Create/update documentation

  database:read          # Inspect schema and read data
  database:write         # Modify schema
  database:migrate       # Run migrations (highest risk)
  database:query         # Run SQL queries

  git:read               # Read git status, diff, log
  git:write              # Create commits

  terminal:run           # Execute shell commands

  research:web           # Web search and URL analysis
```

### 5.2 Role-to-Permission Mapping

```python
# backend/app/ai/tools/permissions.py

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "requirements_analyst": {
        "project:read",
        "research:web",
        "project:document",
    },
    "researcher": {
        "project:read",
        "research:web",
        "project:document",
    },
    "product_strategist": {
        "project:read",
        "research:web",
        "project:document",
    },
    "architect": {
        "project:read",
        "project:write",
        "project:code_generate",
        "project:document",
        "research:web",
        "database:read",
        "git:read",
    },
    "database_engineer": {
        "project:read",
        "project:write",
        "database:read",
        "database:write",
        "database:migrate",
        "database:query",
        "project:document",
    },
    "ui_ux_designer": {
        "project:read",
        "project:write",
        "project:code_generate",
        "project:document",
    },
    "developer": {
        "project:read",
        "project:write",
        "project:code_generate",
        "project:execute",
        "project:test",
        "project:document",
        "database:read",
        "database:query",
        "git:read",
        "git:write",
        "terminal:run",
    },
    "testing_engineer": {
        "project:read",
        "project:write",
        "project:code_generate",
        "project:execute",
        "project:test",
        "database:read",
        "database:query",
        "terminal:run",
    },
    "security_reviewer": {
        "project:read",
        "database:read",
        "database:query",
        "git:read",
        "terminal:run",
        "research:web",
    },
    "documentation_engineer": {
        "project:read",
        "project:write",
        "project:document",
        "git:read",
    },
}
```

### 5.3 Approval Flow

Certain tools require human approval before execution. The approval gate integrates with the existing `approvals` table and the project's approval workflow.

```
Agent calls tool
  │
  ▼
┌─────────────────────┐
│ Permission Gate      │──── DENY → Return PERMISSION_DENIED error
│ (check role perms)   │
└─────────┬───────────┘
          │ ALLOW
          ▼
┌─────────────────────┐
│ Approval Gate       │──── REQUIRED → Create Approval record
│ (requires_approval?)│                    │
└─────────┬───────────┘                    ▼
          │ NOT REQUIRED            ┌──────────────────┐
          │                         │ Approval record   │
          │                         │ status: "pending" │
          │                         │ → WS notify user  │
          │                         │ → Wait for decision│
          │                         └────────┬─────────┘
          │                                  │
          │                         ┌────────▼─────────┐
          │                         │ User approves?    │
          │                         │ YES → Execute     │
          │                         │ NO  → DENY        │
          ▼                         └──────────────────┘
┌─────────────────────┐
│ Rate Limit Gate     │──── EXCEEDED → Return RATE_LIMITED error
└─────────┬───────────┘
          │ WITHIN LIMIT
          ▼
┌─────────────────────┐
│ Safety Gate         │──── VIOLATION → Return SAFETY_VIOLATION error
│ (path sandbox,      │
│  injection check,   │
│  command whitelist)  │
└─────────┬───────────┘
          │ PASSED
          ▼
┌─────────────────────┐
│ Execute Handler     │
│ + Audit Log         │
└─────────────────────┘
```

### 5.4 Audit Logging

Every tool invocation — successful or failed — is logged with full context for traceability and compliance.

```python
# backend/app/ai/tools/audit.py

@dataclass
class ToolAuditEntry:
    call_id: str
    timestamp: datetime
    tool_name: str
    agent_id: str
    agent_role: str
    project_id: UUID
    arguments: dict                # Sanitized (secrets redacted)
    success: bool
    error_code: Optional[str]
    duration_ms: int
    permission_check_result: str   # "allowed", "denied", "approval_required"
    approval_id: Optional[str]
    safety_check_result: str       # "passed", "violated"
    rollback_id: Optional[str]
    ip_address: Optional[str]
```

Audit entries are stored in the `audit_logs` table with:
- `entity_type = 'tool_invocation'`
- `entity_id = call_id`
- `details = { sanitized arguments, result summary, safety checks }`

All audit entries are **immutable** — no UPDATE or DELETE operations are permitted on `audit_logs`.

---

## 6. Safety Model

### 6.1 Tool Allowlists Per Agent Role

Each agent role has a defined set of tools it can invoke. This is derived from the permission mapping above but enforced at the tool level:

```python
# backend/app/ai/tools/safety.py

def get_allowed_tools(role: str) -> set[str]:
    """Return tool names allowed for this agent role."""
    role_permissions = ROLE_PERMISSIONS.get(role, set())
    return {
        tool.name
        for tool in registry.list_all_tools()
        if set(tool.permissions).issubset(role_permissions)
    }
```

An agent attempting to call a tool not in its allowlist receives a `TOOL_NOT_ALLOWED` error and the call is logged as a security event.

### 6.2 Command Sandboxing

The `run_command` tool executes in a sandboxed subprocess:

```
Sandbox Properties:
  ┌─────────────────────────────────────────────────────────┐
  │  Isolated Process (subprocess.Popen)                     │
  │                                                          │
  │  ✓ Working directory: project workspace only             │
  │  ✓ No network access (iptables / network namespace)      │
  │  ✓ CPU limit: 1 core                                     │
  │  ✓ Memory limit: 512MB                                   │
  │  ✓ Time limit: configurable (max 300s)                   │
  │  ✓ No access to host environment variables               │
  │  ✓ No access to parent process or other projects         │
  │  ✓ STDOUT/STDERR captured and truncated at 100KB         │
  │  ✓ Process group killed on timeout                       │
  └─────────────────────────────────────────────────────────┘
```

**Implementation approach:**
- Use `asyncio.create_subprocess_exec` with explicit `cwd`, `env`, and resource limits
- Apply `setrlimit` for CPU and memory constraints on Linux
- Use process groups (`os.setsid`) to ensure clean timeout kills
- Network isolation via project-level firewall rules or container (Phase 2)

### 6.3 File Access Restrictions

```
Path Safety Rules:

  1. All paths are resolved relative to PROJECT_WORKSPACE/{project_id}/
  2. Symlink resolution happens BEFORE path validation
  3. Path must resolve to a location WITHIN the project workspace
  4. Path traversal (..) is blocked at the API boundary
  5. Absolute paths are rejected unless they match workspace prefix
  6. Protected paths are blocked from write operations:
     - .env, .env.*
     - .git/config
     - .ssh/
     - /etc/, /proc/, /sys/
  7. File size limits:
     - Read: 10MB max
     - Write: 500KB max per call
```

```python
# backend/app/ai/tools/safety.py

class PathSandbox:
    def __init__(self, workspace_root: Path):
        self.workspace_root = workspace_root.resolve()
        self.protected_patterns = [
            ".env", ".env.*", ".git/config", ".ssh/",
            "/etc/", "/proc/", "/sys/", "/dev/",
        ]

    def validate_path(self, relative_path: str) -> Path:
        """Resolve and validate that path is within workspace."""
        if ".." in relative_path:
            raise PathTraversalError("Path contains traversal sequences")

        resolved = (self.workspace_root / relative_path).resolve()

        if not str(resolved).startswith(str(self.workspace_root)):
            raise PathTraversalError("Path escapes project workspace")

        for pattern in self.protected_patterns:
            if resolved.match(pattern) or pattern in str(resolved):
                raise PathAccessDeniedError(f"Path matches protected pattern: {pattern}")

        return resolved

    def is_write_allowed(self, path: Path) -> bool:
        """Check if write is allowed for this path."""
        name = path.name
        if name.startswith(".env"):
            return False
        if name in (".gitignore", ".gitkeep"):
            return True
        return not any(p in str(path) for p in self.protected_patterns)
```

### 6.4 Rate Limiting

Rate limits are enforced per tool per agent per minute using a sliding window counter in Redis.

```python
# backend/app/ai/tools/rate_limiter.py

class ToolRateLimiter:
    """Sliding window rate limiter backed by Redis."""

    def __init__(self, redis_client):
        self.redis = redis_client

    async def check_rate_limit(
        self, tool_name: str, agent_id: str, limit_per_minute: int
    ) -> bool:
        """Return True if request is within limit."""
        key = f"tool_rate:{tool_name}:{agent_id}"
        now = time.time()
        window_start = now - 60

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)  # Remove old entries
        pipe.zadd(key, {str(now): now})              # Add current request
        pipe.zcard(key)                               # Count in window
        pipe.expire(key, 120)                         # TTL safety net
        results = await pipe.execute()

        current_count = results[2]
        return current_count <= limit_per_minute
```

**Rate Limits Summary:**

| Tool | Limit/min | Rationale |
|---|---|---|
| `read_file` | 60 | High frequency, read-only |
| `write_file` | 20 | Moderate frequency, side effects |
| `list_directory` | 60 | High frequency, read-only |
| `search_files` | 30 | Moderate frequency, CPU-intensive |
| `scan_project` | 10 | CPU-intensive analysis |
| `analyze_code` | 20 | CPU-intensive analysis |
| `generate_code` | 10 | LLM-heavy, significant side effects |
| `generate_documentation` | 15 | Moderate frequency |
| `generate_diagram` | 15 | Moderate frequency |
| `update_readme` | 10 | Moderate frequency |
| `run_tests` | 5 | Resource-intensive, system effects |
| `analyze_coverage` | 5 | Resource-intensive |
| `create_test` | 10 | Moderate frequency |
| `inspect_schema` | 30 | Read-only |
| `run_migration` | 2 | Critical, requires approval |
| `query_data` | 30 | Read-only |
| `web_search` | 10 | External API rate limits |
| `analyze_url` | 10 | External API rate limits |
| `git_status` | 30 | Read-only |
| `git_diff` | 30 | Read-only |
| `git_commit` | 10 | Side effects |
| `run_command` | 10 | Resource-intensive |

### 6.5 Rollback Capabilities

Every mutating tool creates a snapshot before execution. Rollback reverts the change using the snapshot.

```python
# backend/app/ai/tools/rollback.py

@dataclass
class RollbackEntry:
    rollback_id: str
    tool_name: str
    call_id: str
    created_at: datetime
    snapshot_type: str        # "file", "database", "git"
    snapshot_data: dict       # Serialized snapshot
    restored: bool = False
    restored_at: Optional[datetime] = None


class RollbackManager:
    def __init__(self, db: AsyncSession, storage_path: Path):
        self.db = db
        self.storage_path = storage_path

    async def create_file_snapshot(
        self, file_path: Path, call_id: str, tool_name: str
    ) -> str:
        """Snapshot a file before modification. Returns rollback_id."""
        rollback_id = str(uuid4())
        snapshot_dir = self.storage_path / "rollbacks"
        snapshot_dir.mkdir(exist_ok=True)

        # Copy current file contents
        if file_path.exists():
            snapshot_path = snapshot_dir / f"{rollback_id}.bak"
            snapshot_path.write_bytes(file_path.read_bytes())
            snapshot_type = "file"
            snapshot_data = {"original_path": str(file_path), "backup_path": str(snapshot_path)}
        else:
            # File doesn't exist yet (new file creation)
            snapshot_type = "new_file"
            snapshot_data = {"original_path": str(file_path), "existed": False}

        entry = RollbackEntry(
            rollback_id=rollback_id,
            tool_name=tool_name,
            call_id=call_id,
            created_at=datetime.now(timezone.utc),
            snapshot_type=snapshot_type,
            snapshot_data=snapshot_data,
        )
        await self._store_entry(entry)
        return rollback_id

    async def rollback(self, rollback_id: str) -> bool:
        """Restore from snapshot. Returns True on success."""
        entry = await self._get_entry(rollback_id)
        if not entry or entry.restored:
            return False

        if entry.snapshot_type == "file":
            original_path = Path(entry.snapshot_data["original_path"])
            backup_path = Path(entry.snapshot_data["backup_path"])
            if backup_path.exists():
                original_path.write_bytes(backup_path.read_bytes())
            else:
                original_path.unlink(missing_ok=True)

        elif entry.snapshot_type == "new_file":
            original_path = Path(entry.snapshot_data["original_path"])
            original_path.unlink(missing_ok=True)

        entry.restored = True
        entry.restored_at = datetime.now(timezone.utc)
        await self._update_entry(entry)
        return True
```

**Rollback-eligible tools:**

| Tool | Snapshot Type | Max Rollbacks Retained |
|---|---|---|
| `write_file` | File content backup | Last 10 per file |
| `generate_code` | File content backup | Last 10 per file |
| `update_readme` | File content backup | Last 5 |
| `create_test` | File content backup | Last 5 |
| `run_migration` | SQL rollback script | All (never purged) |
| `run_command` | Git stash snapshot | Last 5 |

---

## 7. Error Handling

### 7.1 Uniform Error Structure

All tool errors follow a consistent structure so agents can reason about failures and retry appropriately.

```python
@dataclass
class ToolError:
    code: str              # Typed error code (e.g. "FILE_NOT_FOUND")
    message: str           # Human/agent-readable description
    category: str          # "permanent" | "retryable" | "safety"
    tool_name: str
    call_id: str
    retry_after_ms: Optional[int] = None  # For retryable errors
    context: Optional[dict] = None        # Additional error context
```

### 7.2 Error Categories

| Category | Meaning | Agent Behavior |
|---|---|---|
| `permanent` | Wrong arguments, resource not found, validation failure | Fix arguments and retry with different input |
| `retryable` | Timeout, rate limit, external service error | Wait and retry the same call |
| `safety` | Permission denied, path blocked, injection detected | Do NOT retry; adjust approach or escalate |

### 7.3 Error Codes Reference

| Code | Category | Tool(s) | Description |
|---|---|---|---|
| `FILE_NOT_FOUND` | permanent | read_file, write_file | File does not exist |
| `PATH_TRAVERSAL_BLOCKED` | safety | all filesystem | Path escapes workspace |
| `PERMISSION_DENIED` | safety | all | Agent role lacks required permission |
| `TOOL_NOT_ALLOWED` | safety | all | Tool not in agent's allowlist |
| `APPROVAL_REQUIRED` | safety | run_migration, run_command | Human approval needed |
| `RATE_LIMITED` | retryable | all | Too many calls, wait and retry |
| `TOOL_TIMEOUT` | retryable | run_tests, run_command, analyze_url | Execution timed out |
| `COMMAND_NOT_WHITELISTED` | safety | run_command | Command not in safe list |
| `SANDBOX_VIOLATION` | safety | run_command | Disallowed operation in sandbox |
| `QUERY_NOT_SELECT` | permanent | query_data | Non-SELECT query blocked |
| `CONTENT_TOO_LARGE` | permanent | write_file, generate_code | Content exceeds size limit |
| `DISK_FULL` | retryable | write_file | No space left |
| `SQL_SYNTAX_ERROR` | permanent | query_data | Invalid SQL |
| `NETWORK_UNAVAILABLE` | retryable | web_search, analyze_url | External service unreachable |
| `LLM_RATE_LIMIT` | retryable | web_search | Upstream API rate limit |
| `INJECTION_DETECTED` | safety | run_command, query_data | Potential injection attempt |

---

## 8. Integration with Agent Orchestrator

### 8.1 Tool Execution Loop

The orchestrator calls tools in a loop within its LLM interaction cycle. Each iteration:

```
┌──────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LOOP                          │
│                                                               │
│  1. Build prompt with: system prompt + project context +     │
│     task description + available tool schemas                 │
│  2. Call LLM → get response                                  │
│  3. If response contains tool_calls:                          │
│     a. For each tool_call:                                    │
│        i.   Validate tool exists in registry                  │
│        ii.  Check agent permissions                           │
│        iii. Check rate limits                                 │
│        iv.  Check approval requirement                        │
│        v.   Run safety checks (path, injection, whitelist)   │
│        vi.  Execute handler                                   │
│        vii. Log audit entry                                   │
│        viii. If error → return typed error to LLM            │
│        ix.  If success → return result to LLM                │
│     b. Append all results to conversation                     │
│     c. Loop back to step 2 (LLM decides next action)          │
│  4. If response has no tool_calls → task complete             │
│  5. If token budget exhausted → halt and escalate             │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 LLM Prompt Integration

Tool schemas are injected into the LLM system prompt as available tools:

```python
async def build_tool_prompt(self, agent_role: str) -> str:
    tools = self.registry.list_tools_for_role(agent_role)
    tool_descriptions = []
    for tool in tools:
        params = "\n".join(
            f"    - {p.name} ({p.type}, {'required' if p.required else 'optional'}): {p.description}"
            for p in tool.parameters
        )
        tool_descriptions.append(
            f"  {tool.name}:\n"
            f"    Description: {tool.description}\n"
            f"    Risk: {tool.risk_level.value}\n"
            f"    Parameters:\n{params}"
        )

    return (
        "You have access to the following tools. Use them by returning "
        "tool_calls in your response. Each tool_call must specify the tool name "
        "and its arguments.\n\n"
        "Available Tools:\n" + "\n".join(tool_descriptions)
    )
```

### 8.3 Orchestrator Integration Points

The existing `AIOrchestrator` in `backend/app/ai/orchestrator.py` will be extended:

| Current Method | Tool Integration |
|---|---|
| `_simulate_agent_output()` | Replaced by LLM calls with tool execution loop |
| `_store_stage_output()` | Uses `generate_documentation`, `generate_diagram` tools |
| `_execute_stage()` | Injects tool registry into agent context |
| No file operations | Uses `scan_project`, `analyze_code`, `generate_code` |
| No test execution | Uses `run_tests`, `analyze_coverage` |
| No database interaction | Uses `inspect_schema`, `query_data` |

---

## 9. File Structure

```
backend/app/ai/tools/
├── __init__.py              # create_registry() factory
├── registry.py              # ToolRegistry, ToolDefinition, ToolParameter
├── permissions.py           # ROLE_PERMISSIONS mapping
├── safety.py                # PathSandbox, CommandSandbox, InjectionGuard
├── rate_limiter.py          # ToolRateLimiter (Redis-backed)
├── rollback.py              # RollbackManager
├── audit.py                 # ToolAuditLogger
├── errors.py                # ToolError, error codes
│
├── filesystem.py            # read_file, write_file, list_directory, search_files
├── project.py               # scan_project, analyze_code, generate_code
├── documentation.py         # generate_documentation, generate_diagram, update_readme
├── testing.py               # run_tests, analyze_coverage, create_test
├── database.py              # inspect_schema, run_migration, query_data
├── research.py              # web_search, analyze_url
├── git.py                   # git_status, git_diff, git_commit
└── terminal.py              # run_command
```

---

## 10. Database Schema Additions

### tool_audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| call_id | VARCHAR(64) | UNIQUE, NOT NULL |
| tool_name | VARCHAR(100) | NOT NULL |
| agent_id | UUID | FK agents(id) |
| agent_role | VARCHAR(100) | NOT NULL |
| project_id | UUID | FK projects(id) |
| arguments | JSONB | NOT NULL (secrets redacted) |
| success | BOOLEAN | NOT NULL |
| error_code | VARCHAR(100) | |
| error_message | TEXT | |
| duration_ms | INTEGER | |
| permission_check | VARCHAR(50) | CHECK IN ('allowed', 'denied', 'approval_required') |
| approval_id | UUID | FK approvals(id) |
| safety_check | VARCHAR(50) | CHECK IN ('passed', 'violated') |
| rollback_id | VARCHAR(64) | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### tool_rollbacks

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, gen_random_uuid() |
| rollback_id | VARCHAR(64) | UNIQUE, NOT NULL |
| tool_name | VARCHAR(100) | NOT NULL |
| call_id | VARCHAR(64) | NOT NULL |
| project_id | UUID | FK projects(id) |
| snapshot_type | VARCHAR(50) | NOT NULL |
| snapshot_path | VARCHAR(500) | |
| snapshot_metadata | JSONB | |
| restored | BOOLEAN | DEFAULT false |
| restored_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:**
```sql
CREATE INDEX idx_tool_audit_project ON tool_audit_logs(project_id);
CREATE INDEX idx_tool_audit_agent ON tool_audit_logs(agent_id);
CREATE INDEX idx_tool_audit_tool ON tool_audit_logs(tool_name);
CREATE INDEX idx_tool_audit_created ON tool_audit_logs(created_at);
CREATE INDEX idx_tool_audit_call_id ON tool_audit_logs(call_id);
CREATE INDEX idx_tool_rollback_project ON tool_rollbacks(project_id);
CREATE INDEX idx_tool_rollback_call ON tool_rollbacks(call_id);
```

---

## 11. MCP Protocol Compliance

### 11.1 Server Metadata

```json
{
  "name": "virtualdev-studio-tools",
  "version": "1.0.0",
  "description": "MCP tool server for VirtualDev Studio AI agents",
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  }
}
```

### 11.2 Tool Listing Response

When an agent connects, the server responds with available tools filtered by the agent's role:

```json
{
  "tools": [
    {
      "name": "read_file",
      "description": "Read the contents of a file...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "file_path": {"type": "string", "description": "Relative path..."},
          "encoding": {"type": "string", "enum": ["utf-8", "ascii"], "default": "utf-8"},
          "offset": {"type": "integer", "minimum": 1},
          "limit": {"type": "integer", "minimum": 1, "maximum": 5000, "default": 2000}
        },
        "required": ["file_path"]
      }
    }
  ]
}
```

### 11.3 Transport

| Phase | Transport | Rationale |
|---|---|---|
| **Phase 1** | In-process function calls | Single process monolith, lowest latency |
| **Phase 2** | stdio (per-project sandbox) | Isolated tool execution per project |
| **Phase 3** | HTTP + SSE | Remote tool servers, plugin system |

In Phase 1, the tool registry is instantiated as a Python object within the orchestrator process. Tool calls are direct function invocations — no network overhead. This is the simplest and fastest approach for the MVP.

---

## 12. Testing Strategy

### 12.1 Unit Tests

Each tool handler tested with:
- Valid arguments → correct output
- Invalid arguments (wrong type, missing required) → typed error
- Boundary values (max size, empty string, special characters)
- Path traversal attempts → SAFETY error
- Injection strings in arguments → SAFETY error

### 12.2 Integration Tests

- Registry correctly filters tools by role
- Rate limiter blocks after limit exceeded
- Approval flow creates record and waits for decision
- Audit log captures all invocations
- Rollback correctly restores previous state

### 12.3 Security Tests

- Path traversal: `../../etc/passwd` → blocked
- Command injection: `; rm -rf /` → blocked
- SQL injection: `'; DROP TABLE users; --` → blocked
- Symlink escape: symlink to `/etc/passwd` → blocked
- Protected file write: `.env` → blocked
- Rate limit bypass attempt → blocked
- Cross-project file access → blocked

---

*Document version: 1.0 | Last updated: 2026-09-15*
