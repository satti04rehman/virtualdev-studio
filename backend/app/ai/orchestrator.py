import json
import logging
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import (
    Project, ProjectStage, ProjectRequirement, ResearchItem,
    ArchitectureComponent, Task, TaskRun, Agent, Approval, Document,
)
from app.ai.orchestrator_models import (
    AgentRole, TaskStatus, StageStatus,
    WORKFLOW_STAGES, APPROVAL_REQUIRED_STAGES,
)

logger = logging.getLogger(__name__)


class AIOrchestrator:
    def __init__(self, db: AsyncSession, project_id):
        self.db = db
        self.project_id = project_id
        self.websocket_manager = None

    async def get_project(self) -> Project:
        result = await self.db.execute(select(Project).where(Project.id == self.project_id))
        project = result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {self.project_id} not found")
        return project

    async def get_or_create_agent(self, role: AgentRole) -> Agent:
        result = await self.db.execute(select(Agent).where(Agent.role == role.value))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                id=uuid4(),
                name=role.value.replace("_", " ").title(),
                role=role.value,
                description=f"AI agent specialized in {role.value.replace('_', ' ')}",
            )
            self.db.add(agent)
            await self.db.flush()
        return agent

    async def start_workflow(self):
        project = await self.get_project()
        project.status = "in_progress"
        await self.db.commit()
        logger.info(f"Starting workflow for project {self.project_id}")

        for stage_name, agent_role, description in WORKFLOW_STAGES:
            await self._execute_stage(stage_name, agent_role, description)

    async def _execute_stage(self, stage_name: str, agent_role: AgentRole, description: str):
        project = await self.get_project()
        agent = await self.get_or_create_agent(agent_role)

        stage_result = await self.db.execute(
            select(ProjectStage).where(
                ProjectStage.project_id == self.project_id,
                ProjectStage.stage_name == stage_name,
            )
        )
        stage = stage_result.scalar_one_or_none()
        if not stage:
            stage = ProjectStage(project_id=self.project_id, stage_name=stage_name)
            self.db.add(stage)
            await self.db.flush()

        if stage.status == "completed":
            return

        stage.status = "in_progress"
        stage.started_at = datetime.now(timezone.utc)
        project.current_stage = stage_name
        await self.db.commit()

        requires_approval = stage_name in APPROVAL_REQUIRED_STAGES
        if requires_approval:
            approval_result = await self.db.execute(
                select(Approval).where(
                    Approval.project_id == self.project_id,
                    Approval.action == f"Approve {stage_name.replace('_', ' ')} results",
                )
            )
            existing_approval = approval_result.scalars().all()

            if existing_approval:
                pending = [a for a in existing_approval if a.status == "pending"]
                approved = [a for a in existing_approval if a.status == "decided" and a.decision == "approved"]
                if pending:
                    return
                if approved:
                    task_result = await self.db.execute(
                        select(Task).where(
                            Task.project_id == self.project_id,
                            Task.stage == stage_name,
                        )
                    )
                    task = task_result.scalars().first()
                    if task:
                        task.status = TaskStatus.COMPLETED.value
                        task.completed_at = datetime.now(timezone.utc)
                        self.db.add(TaskRun(
                            id=uuid4(),
                            task_id=task.id,
                            agent_id=agent.id,
                            status="completed",
                            output_data={"result": f"Stage {stage_name} approved by user"},
                            completed_at=datetime.now(timezone.utc),
                        ))
                    stage.status = StageStatus.COMPLETED.value
                    stage.completed_at = datetime.now(timezone.utc)
                    stage.output_data = {"summary": f"Stage {stage_name} approved and completed"}
                    if stage_name == "architecture":
                        output = await self._simulate_agent_output(stage_name, agent_role)
                        stage.output_data = output
                        await self._store_stage_output(stage_name, output)
                    return
                rejected = [a for a in existing_approval if a.status == "decided" and a.decision in ("rejected", "modified")]
                if rejected:
                    stage.status = StageStatus.FAILED.value
                    stage.error_message = f"Stage {stage_name} rejected by user"
                    task_result = await self.db.execute(
                        select(Task).where(
                            Task.project_id == self.project_id,
                            Task.stage == stage_name,
                        )
                    )
                    task = task_result.scalars().first()
                    if task:
                        task.status = TaskStatus.CANCELLED.value
                    return

            approval = Approval(
                id=uuid4(),
                project_id=self.project_id,
                action=f"Approve {stage_name.replace('_', ' ')} results",
                reason=f"The {stage_name.replace('_', ' ')} stage has produced results that require your review before proceeding.",
                risk_level="medium",
                expected_result=f"Reviewed and approved {stage_name.replace('_', ' ')} output",
                status="pending",
            )
            self.db.add(approval)
            await self.db.flush()

            task = Task(
                id=uuid4(),
                project_id=self.project_id,
                agent_id=agent.id,
                title=description,
                stage=stage_name,
                status=TaskStatus.PENDING_APPROVAL.value,
                requires_approval=True,
                approval_id=approval.id,
            )
            self.db.add(task)
            stage.status = StageStatus.WAITING_APPROVAL.value
            await self.db.commit()
            return

        task = Task(
            id=uuid4(),
            project_id=self.project_id,
            agent_id=agent.id,
            title=description,
            stage=stage_name,
            status=TaskStatus.IN_PROGRESS.value,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(task)
        await self.db.flush()

        task_run = TaskRun(
            id=uuid4(),
            task_id=task.id,
            agent_id=agent.id,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(task_run)
        await self.db.flush()

        try:
            output = await self._simulate_agent_output(stage_name, agent_role)
            task.status = TaskStatus.COMPLETED.value
            task.output_data = output
            task.completed_at = datetime.now(timezone.utc)
            task_run.status = "completed"
            task_run.output_data = output
            task_run.completed_at = datetime.now(timezone.utc)
            task_run.duration_ms = 150

            stage.status = StageStatus.COMPLETED.value
            stage.completed_at = datetime.now(timezone.utc)
            stage.output_data = output

            await self._store_stage_output(stage_name, output)

        except Exception as e:
            task.status = TaskStatus.FAILED.value
            task.error_message = str(e)
            task.completed_at = datetime.now(timezone.utc)
            task_run.status = "failed"
            task_run.error_message = str(e)
            stage.status = StageStatus.FAILED.value
            stage.error_message = str(e)
            logger.error(f"Stage {stage_name} failed: {e}")

        completed_stages = await self.db.execute(
            select(ProjectStage).where(
                ProjectStage.project_id == self.project_id,
                ProjectStage.status == StageStatus.COMPLETED.value,
            )
        )
        total = await self.db.execute(
            select(ProjectStage).where(ProjectStage.project_id == self.project_id)
        )
        done_count = len(completed_stages.scalars().all())
        total_count = len(total.scalars().all())
        project.progress = int((done_count / max(total_count, 1)) * 100)

        await self.db.commit()

    async def _simulate_agent_output(self, stage_name: str, agent_role: AgentRole) -> dict:
        simulated_outputs = {
            "requirements": {
                "summary": "Requirements analysis complete",
                "functional_requirements": [
                    {"id": "FR-001", "title": "User authentication", "priority": "P0"},
                    {"id": "FR-002", "title": "Project CRUD operations", "priority": "P0"},
                    {"id": "FR-003", "title": "AI workflow execution", "priority": "P0"},
                    {"id": "FR-004", "title": "Real-time status updates", "priority": "P0"},
                ],
                "non_functional_requirements": [
                    {"id": "NFR-001", "title": "API response < 500ms", "category": "performance"},
                    {"id": "NFR-002", "title": "JWT authentication", "category": "security"},
                ],
                "user_stories": [
                    {"id": "US-001", "story": "As a user, I want to create a project from an idea"},
                    {"id": "US-002", "story": "As a user, I want to see AI agents working on my project"},
                    {"id": "US-003", "story": "As a user, I want to approve critical decisions"},
                ],
                "edge_cases": [
                    "Empty project description",
                    "Concurrent approval requests",
                    "Agent failure during execution",
                ],
            },
            "research": {
                "summary": "Market research complete",
                "findings": [
                    {"category": "Competitors", "content": "GitHub Copilot, Cursor, Devin identified as primary competitors", "source_type": "fact"},
                    {"category": "Market Gap", "content": "No product combines multi-role orchestration with human approval gates", "source_type": "inference"},
                    {"category": "Pricing", "content": "SaaS subscription model at $29-99/month viable for target segment", "source_type": "proposal"},
                ],
            },
            "product_analysis": {
                "summary": "Product strategy defined",
                "mvp_scope": ["Project creation", "AI orchestration", "Requirements generation", "Architecture design", "Approval workflow"],
                "target_market": "Solo developers and small teams",
                "value_proposition": "AI-powered virtual development team with human oversight",
            },
            "architecture": {
                "summary": "Architecture designed",
                "components": [
                    {"name": "Web Frontend", "type": "frontend", "technology": "React + TypeScript"},
                    {"name": "API Backend", "type": "service", "technology": "Python + FastAPI"},
                    {"name": "Database", "type": "database", "technology": "PostgreSQL"},
                    {"name": "AI Orchestrator", "type": "ai_agent", "technology": "Python + LLM Abstraction"},
                    {"name": "WebSocket Server", "type": "service", "technology": "FastAPI WebSocket"},
                ],
                "api_surface": "REST + WebSocket",
                "deployment": "Docker Compose",
            },
            "database_design": {
                "summary": "Database schema designed",
                "tables": ["users", "projects", "project_stages", "project_requirements", "research_items", "architecture_components", "agents", "tasks", "task_runs", "documents", "diagrams", "approvals", "audit_logs"],
                "indexes_count": 17,
                "relationships": "14 foreign key relationships",
            },
            "ui_ux_design": {
                "summary": "UI/UX design complete",
                "pages": ["Landing", "Dashboard", "Create Project", "Project Workspace", "AI Team", "Requirements", "Research", "Architecture", "Task Execution", "Testing", "Documentation", "Final Project"],
                "design_system": "Modern, clean, professional with dark mode support",
            },
            "implementation_plan": {
                "summary": "Implementation plan created",
                "phases": [
                    {"phase": 1, "name": "Backend Foundation", "tasks": ["Database models", "API endpoints", "Auth system"]},
                    {"phase": 2, "name": "AI Orchestrator", "tasks": ["Agent system", "Task execution", "Approval workflow"]},
                    {"phase": 3, "name": "Frontend", "tasks": ["Dashboard", "Project views", "Real-time updates"]},
                    {"phase": 4, "name": "Testing & Security", "tasks": ["API tests", "Security review", "Documentation"]},
                ],
            },
            "development": {
                "summary": "Code implementation complete",
                "backend": "FastAPI with 15+ endpoints, JWT auth, WebSocket support",
                "frontend": "React dashboard with 12 pages, responsive design",
                "ai": "Orchestrator with 10 specialized agent roles",
            },
            "testing": {
                "summary": "Testing complete",
                "api_tests": {"total": 25, "passed": 23, "failed": 2},
                "component_tests": {"total": 15, "passed": 15, "failed": 0},
                "coverage": "78%",
                "findings": [
                    {"severity": "low", "description": "Minor validation edge case in project creation"},
                    {"severity": "low", "description": "WebSocket reconnection could be more robust"},
                ],
            },
            "security_review": {
                "summary": "Security review complete",
                "findings": [
                    {"severity": "medium", "description": "JWT secret key should be rotated in production"},
                    {"severity": "low", "description": "Rate limiting should be implemented on auth endpoints"},
                    {"severity": "low", "description": "CORS origins should be restricted in production"},
                ],
                "overall_risk": "low",
            },
            "documentation": {
                "summary": "Documentation generated",
                "documents": ["README.md", "API Documentation", "Architecture Guide", "User Guide", "Developer Guide"],
                "diagrams": ["ERD", "Architecture Diagram", "Sequence Diagram", "Flow Diagram"],
            },
        }
        return simulated_outputs.get(stage_name, {"summary": f"Stage {stage_name} completed"})

    async def _store_stage_output(self, stage_name: str, output: dict):
        doc_type_map = {
            "requirements": "requirements",
            "research": "research",
            "architecture": "architecture",
            "documentation": "documentation",
        }
        if stage_name in doc_type_map:
            doc = Document(
                id=uuid4(),
                project_id=self.project_id,
                title=f"{stage_name.replace('_', ' ').title()} Report",
                doc_type=doc_type_map[stage_name],
                content=json.dumps(output, indent=2),
                format="json",
            )
            self.db.add(doc)

        if stage_name == "architecture" and "components" in output:
            for comp in output["components"]:
                component = ArchitectureComponent(
                    id=uuid4(),
                    project_id=self.project_id,
                    name=comp["name"],
                    type=comp["type"],
                    technology=comp["technology"],
                )
                self.db.add(component)

        if stage_name == "requirements" and "functional_requirements" in output:
            for req in output["functional_requirements"]:
                requirement = ProjectRequirement(
                    id=uuid4(),
                    project_id=self.project_id,
                    type="functional",
                    title=req["title"],
                    priority=req["priority"],
                    status="approved",
                )
                self.db.add(requirement)
