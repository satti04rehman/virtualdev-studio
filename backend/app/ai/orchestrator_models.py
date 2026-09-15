from enum import Enum
from datetime import datetime, timezone
from uuid import UUID, uuid4
from dataclasses import dataclass, field
from typing import Optional


class AgentRole(str, Enum):
    REQUIREMENTS = "requirements_analyst"
    RESEARCHER = "researcher"
    PRODUCT_STRATEGIST = "product_strategist"
    ARCHITECT = "architect"
    DATABASE_ENGINEER = "database_engineer"
    UI_UX_DESIGNER = "ui_ux_designer"
    DEVELOPER = "developer"
    TESTER = "testing_engineer"
    SECURITY_REVIEWER = "security_reviewer"
    DOCUMENTATION = "documentation_engineer"


class TaskStatus(str, Enum):
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PENDING_APPROVAL = "pending_approval"
    CANCELLED = "cancelled"


class StageStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING_APPROVAL = "waiting_approval"


@dataclass
class AgentTask:
    id: UUID = field(default_factory=uuid4)
    agent_role: AgentRole = AgentRole.REQUIREMENTS
    title: str = ""
    description: str = ""
    input_data: dict = field(default_factory=dict)
    output_data: dict = field(default_factory=dict)
    status: TaskStatus = TaskStatus.QUEUED
    requires_approval: bool = False
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


WORKFLOW_STAGES = [
    ("requirements", AgentRole.REQUIREMENTS, "Analyze idea and generate requirements"),
    ("research", AgentRole.RESEARCHER, "Research market and technology landscape"),
    ("product_analysis", AgentRole.PRODUCT_STRATEGIST, "Define product strategy and MVP"),
    ("architecture", AgentRole.ARCHITECT, "Design system architecture"),
    ("database_design", AgentRole.DATABASE_ENGINEER, "Design database schema"),
    ("ui_ux_design", AgentRole.UI_UX_DESIGNER, "Design UI/UX specifications"),
    ("implementation_plan", AgentRole.ARCHITECT, "Create implementation plan"),
    ("development", AgentRole.DEVELOPER, "Generate project code"),
    ("testing", AgentRole.TESTER, "Create and run tests"),
    ("security_review", AgentRole.SECURITY_REVIEWER, "Perform security review"),
    ("documentation", AgentRole.DOCUMENTATION, "Generate project documentation"),
]

APPROVAL_REQUIRED_STAGES = {"architecture", "development", "security_review"}
