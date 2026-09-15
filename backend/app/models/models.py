import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.user import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    target_users = Column(Text)
    platform = Column(String(100))
    preferred_tech = Column(JSONB)
    constraints = Column(Text)
    complexity = Column(String(50), default="medium")
    status = Column(String(50), default="created")
    current_stage = Column(String(50), default="requirements")
    progress = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")
    stages = relationship("ProjectStage", back_populates="project", cascade="all, delete-orphan")
    requirements = relationship("ProjectRequirement", back_populates="project", cascade="all, delete-orphan")
    research_items = relationship("ResearchItem", back_populates="project", cascade="all, delete-orphan")
    architecture_components = relationship("ArchitectureComponent", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    diagrams = relationship("Diagram", back_populates="project", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="project", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="project", cascade="all, delete-orphan")


class ProjectStage(Base):
    __tablename__ = "project_stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    stage_name = Column(String(100), nullable=False)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    output_data = Column(JSONB)
    error_message = Column(Text)

    project = relationship("Project", back_populates="stages")


class ProjectRequirement(Base):
    __tablename__ = "project_requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    type = Column(String(50))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="P1")
    status = Column(String(50), default="draft")
    acceptance_criteria = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="requirements")


class ResearchItem(Base):
    __tablename__ = "research_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    category = Column(String(100))
    title = Column(String(255))
    content = Column(Text)
    source = Column(String(500))
    source_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="research_items")


class ArchitectureComponent(Base):
    __tablename__ = "architecture_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255))
    type = Column(String(100))
    description = Column(Text)
    technology = Column(String(255))
    dependencies = Column(JSONB)
    configuration = Column(JSONB)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="architecture_components")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False)
    description = Column(Text)
    capabilities = Column(JSONB)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="agent")
    task_runs = relationship("TaskRun", back_populates="agent")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"))
    title = Column(String(255))
    description = Column(Text)
    stage = Column(String(100))
    status = Column(String(50), default="queued")
    priority = Column(Integer, default=0)
    input_data = Column(JSONB)
    output_data = Column(JSONB)
    error_message = Column(Text)
    requires_approval = Column(Boolean, default=False)
    approval_id = Column(UUID(as_uuid=True), ForeignKey("approvals.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
    task_runs = relationship("TaskRun", back_populates="task")
    approval = relationship("Approval", foreign_keys=[approval_id])


class TaskRun(Base):
    __tablename__ = "task_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"))
    status = Column(String(50))
    input_data = Column(JSONB)
    output_data = Column(JSONB)
    error_message = Column(Text)
    duration_ms = Column(Integer)
    tokens_used = Column(Integer)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    task = relationship("Task", back_populates="task_runs")
    agent = relationship("Agent", back_populates="task_runs")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255))
    doc_type = Column(String(100))
    content = Column(Text)
    format = Column(String(20), default="markdown")
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="documents")


class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255))
    diagram_type = Column(String(100))
    source_format = Column(String(20), default="mermaid")
    source_content = Column(Text)
    rendered_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="diagrams")


class Presentation(Base):
    __tablename__ = "presentations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255))
    slide_count = Column(Integer)
    file_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    action = Column(String(255), nullable=False)
    reason = Column(Text)
    risk_level = Column(String(20))
    expected_result = Column(Text)
    status = Column(String(50), default="pending")
    decision = Column(String(20))
    decision_notes = Column(Text)
    decided_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="approvals")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(255))
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    details = Column(JSONB)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="audit_logs")
    user = relationship("User")
