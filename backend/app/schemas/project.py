from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    description: str
    target_users: Optional[str] = None
    platform: Optional[str] = None
    preferred_tech: Optional[list[str]] = None
    constraints: Optional[str] = None
    complexity: str = "medium"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    current_stage: Optional[str] = None
    progress: Optional[int] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    target_users: Optional[str]
    platform: Optional[str]
    preferred_tech: Optional[list[str]]
    constraints: Optional[str]
    complexity: str
    status: str
    current_stage: Optional[str]
    progress: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
