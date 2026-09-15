from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.models import Project, ProjectStage
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

STAGES = [
    "requirements", "research", "product_analysis", "architecture",
    "ui_ux_design", "database_design", "implementation_plan",
    "development", "testing", "security_review", "documentation",
    "diagrams", "presentation", "final_report"
]


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.owner_id == current_user.id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return ProjectListResponse(projects=projects, total=len(projects))


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        target_users=data.target_users,
        platform=data.platform,
        preferred_tech=data.preferred_tech,
        constraints=data.constraints,
        complexity=data.complexity,
        status="created",
        current_stage="requirements",
    )
    db.add(project)
    await db.flush()

    for stage_name in STAGES:
        stage = ProjectStage(
            project_id=project.id,
            stage_name=stage_name,
            status="pending",
        )
        db.add(stage)

    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}/stages")
async def get_project_stages(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    stages_result = await db.execute(
        select(ProjectStage).where(ProjectStage.project_id == project_id).order_by(ProjectStage.stage_name)
    )
    stages = stages_result.scalars().all()
    return stages
