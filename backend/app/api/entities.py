from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.models import (
    Project, ProjectRequirement, ResearchItem, ArchitectureComponent,
    Task, TaskRun, Agent, Approval, Document, Diagram,
)
from app.schemas.project_entities import (
    RequirementResponse, ResearchItemResponse, ArchitectureComponentResponse,
    TaskResponse, TaskRunResponse, AgentResponse, ApprovalResponse,
    ApprovalDecision, DocumentResponse, DiagramResponse,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["Project Entities"])


async def _verify_project(project_id: UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/requirements", response_model=list[RequirementResponse])
async def get_requirements(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(ProjectRequirement).where(ProjectRequirement.project_id == project_id))
    return result.scalars().all()


@router.get("/research", response_model=list[ResearchItemResponse])
async def get_research(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(ResearchItem).where(ResearchItem.project_id == project_id))
    return result.scalars().all()


@router.get("/architecture", response_model=list[ArchitectureComponentResponse])
async def get_architecture(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(ArchitectureComponent).where(ArchitectureComponent.project_id == project_id))
    return result.scalars().all()


@router.get("/tasks", response_model=list[TaskResponse])
async def get_tasks(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(Task).where(Task.project_id == project_id).order_by(Task.created_at))
    return result.scalars().all()


@router.get("/tasks/{task_id}/runs", response_model=list[TaskRunResponse])
async def get_task_runs(project_id: UUID, task_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(TaskRun).where(TaskRun.task_id == task_id))
    return result.scalars().all()


@router.get("/approvals", response_model=list[ApprovalResponse])
async def get_approvals(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(Approval).where(Approval.project_id == project_id))
    return result.scalars().all()


@router.post("/approvals/{approval_id}/decide", response_model=ApprovalResponse)
async def decide_approval(
    project_id: UUID, approval_id: UUID, data: ApprovalDecision,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(Approval).where(Approval.id == approval_id, Approval.project_id == project_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already decided")

    from datetime import datetime, timezone
    approval.decision = data.decision
    approval.decision_notes = data.decision_notes
    approval.status = "decided"
    approval.decided_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(approval)
    return approval


@router.get("/documents", response_model=list[DocumentResponse])
async def get_documents(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(Document).where(Document.project_id == project_id))
    return result.scalars().all()


@router.get("/diagrams", response_model=list[DiagramResponse])
async def get_diagrams(project_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _verify_project(project_id, user, db)
    result = await db.execute(select(Diagram).where(Diagram.project_id == project_id))
    return result.scalars().all()


@router.get("/agents", response_model=list[AgentResponse])
async def get_agents(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Agent).where(Agent.is_active == True))
    return result.scalars().all()
