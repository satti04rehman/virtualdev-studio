from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class RequirementCreate(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    priority: str = "P1"
    acceptance_criteria: Optional[dict] = None


class RequirementResponse(BaseModel):
    id: UUID
    project_id: UUID
    type: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    acceptance_criteria: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class ResearchItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    category: Optional[str]
    title: Optional[str]
    content: Optional[str]
    source: Optional[str]
    source_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ArchitectureComponentResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: Optional[str]
    type: Optional[str]
    description: Optional[str]
    technology: Optional[str]
    dependencies: Optional[dict]
    configuration: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    agent_id: Optional[UUID]
    title: Optional[str]
    description: Optional[str]
    stage: Optional[str]
    status: str
    priority: int
    output_data: Optional[dict]
    error_message: Optional[str]
    requires_approval: bool
    created_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TaskRunResponse(BaseModel):
    id: UUID
    task_id: UUID
    agent_id: Optional[UUID]
    status: Optional[str]
    output_data: Optional[dict]
    error_message: Optional[str]
    duration_ms: Optional[int]
    tokens_used: Optional[int]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AgentResponse(BaseModel):
    id: UUID
    name: str
    role: str
    description: Optional[str]
    capabilities: Optional[dict]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    id: UUID
    project_id: UUID
    action: str
    reason: Optional[str]
    risk_level: Optional[str]
    expected_result: Optional[str]
    status: str
    decision: Optional[str]
    decision_notes: Optional[str]
    decided_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalDecision(BaseModel):
    decision: str
    decision_notes: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: Optional[str]
    doc_type: Optional[str]
    content: Optional[str]
    format: str
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


class DiagramResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: Optional[str]
    diagram_type: Optional[str]
    source_format: str
    source_content: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectStageResponse(BaseModel):
    id: UUID
    project_id: UUID
    stage_name: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    output_data: Optional[dict]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    detail: str
    code: str
