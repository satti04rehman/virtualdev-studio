import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.models import Project
from app.ai.orchestrator import AIOrchestrator

router = APIRouter(prefix="/projects/{project_id}/orchestrate", tags=["AI Orchestrator"])
logger = logging.getLogger(__name__)


@router.post("/start")
async def start_orchestration(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orchestrator = AIOrchestrator(db, project_id)
    await orchestrator.start_workflow()

    await db.refresh(project)
    return {"status": "started", "project_id": str(project_id), "current_stage": project.current_stage}


@router.post("/continue")
async def continue_orchestration(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.models import ProjectStage
    from app.ai.orchestrator_models import WORKFLOW_STAGES

    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orchestrator = AIOrchestrator(db, project_id)

    stage_result = await db.execute(
        select(ProjectStage).where(
            ProjectStage.project_id == project_id,
            ProjectStage.status.in_(["pending", "in_progress", "failed", "waiting_approval"]),
        ).order_by(ProjectStage.stage_name)
    )
    next_stage = stage_result.scalar_one_or_none()
    if not next_stage:
        await db.refresh(project)
        return {"status": "continued", "project_id": str(project_id), "current_stage": project.current_stage}

    stage_def = next(
        (s for s in WORKFLOW_STAGES if s[0] == next_stage.stage_name), None
    )
    agent_role = stage_def[1] if stage_def else None
    if agent_role:
        await orchestrator._execute_stage(
            next_stage.stage_name, agent_role, f"Continue {next_stage.stage_name}"
        )

    await db.refresh(project)
    return {"status": "continued", "project_id": str(project_id), "current_stage": project.current_stage}
