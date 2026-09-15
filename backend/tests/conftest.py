"""Pytest configuration and shared fixtures for the VirtualDev Studio test suite.

The suite targets the same PostgreSQL dialect used in production
(``postgresql+asyncpg``). Set ``TEST_DATABASE_URL`` to point at a test
database, for example::

    export TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio_test

For environments without PostgreSQL, file or in-memory SQLite is also
supported (UUID/JSONB columns are compiled to SQLite-compatible types)::

    export TEST_DATABASE_URL=sqlite+aiosqlite:///tmp/virtualdev_test.db
"""

import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.user import Base

# Importing the models module registers every table on user.Base metadata,
# so ``Base.metadata.create_all`` builds the full schema.
import app.models.models as _models_registry  # noqa: F401,E402

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///:memory:",
)

# Safety guard: the fixtures below drop and recreate every table. Refuse to run
# against a PostgreSQL database whose name does not look like a test database.
if TEST_DATABASE_URL.startswith("postgresql"):
    _db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?")[0].lower()
    if "test" not in _db_name:
        raise RuntimeError(
            "Refusing to run the destructive test suite against non-test "
            f"database '{_db_name}'. Set TEST_DATABASE_URL to a *_test database."
        )

TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "TestPassword123!"


def _engine_options() -> dict:
    """Return engine kwargs, adding SQLite compatibility shims when needed."""
    if not TEST_DATABASE_URL.startswith("sqlite"):
        return {}

    import uuid as _uuid

    from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
    from sqlalchemy.ext.compiler import compiles

    @compiles(PgUUID, "sqlite")
    def _compile_uuid_sqlite(type_, compiler, **kw):
        return "CHAR(36)"

    @compiles(JSONB, "sqlite")
    def _compile_jsonb_sqlite(type_, compiler, **kw):
        return "JSON"

    _original_uuid_bind_processor = PgUUID.bind_processor
    _original_uuid_result_processor = PgUUID.result_processor

    def _sqlite_uuid_bind_processor(self, dialect):
        if dialect.name != "sqlite":
            return _original_uuid_bind_processor(self, dialect)

        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value.replace("-", "")
            return value.hex

        return process

    def _sqlite_uuid_result_processor(self, dialect, coltype):
        if dialect.name != "sqlite":
            return _original_uuid_result_processor(self, dialect, coltype)

        def process(value):
            if value is None:
                return None
            if self.as_uuid:
                if isinstance(value, _uuid.UUID):
                    return value
                return _uuid.UUID(str(value))
            return str(value)

        return process

    PgUUID.bind_processor = _sqlite_uuid_bind_processor
    PgUUID.result_processor = _sqlite_uuid_result_processor

    options = {"connect_args": {"check_same_thread": False}}
    if ":memory:" in TEST_DATABASE_URL:
        from sqlalchemy.pool import StaticPool

        options["poolclass"] = StaticPool
    return options


@pytest_asyncio.fixture
async def db_engine() -> AsyncGenerator:
    """Create an isolated schema in the test database for every test.

    Tables are dropped and recreated per test so individual tests are fully
    independent and deterministic.
    """
    engine = create_async_engine(TEST_DATABASE_URL, **_engine_options())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """A ready-to-use async session bound to the test database."""
    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.close()


@pytest_asyncio.fixture
async def client(db_engine) -> AsyncGenerator[AsyncClient, None]:
    """An HTTPX async client wired to the FastAPI app via ASGI transport.

    The ``get_db`` dependency is overridden to use a session factory bound to
    the isolated test database, so every request hits the test schema.
    """
    factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user_data() -> dict:
    """Sample registration payload. Fresh dict per test to avoid cross-test aliasing."""
    return {
        "email": TEST_USER_EMAIL,
        "full_name": "Test User",
        "password": TEST_USER_PASSWORD,
    }


@pytest_asyncio.fixture
async def registered_user(client, user_data) -> dict:
    """Register and return the JSON body of a freshly created user."""
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201, response.text
    return response.json()


@pytest_asyncio.fixture
async def auth_headers(client, registered_user, user_data) -> dict:
    """Bearer header obtained by logging in with the registered sample user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def sample_project(client, auth_headers) -> dict:
    """Create and return a sample project owned by the authenticated user."""
    response = await client.post(
        "/api/v1/projects",
        json={
            "name": "Test Project",
            "description": "A test project for the suite",
            "target_users": "Developers",
            "platform": "web",
            "preferred_tech": ["python", "react"],
            "complexity": "medium",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest_asyncio.fixture
async def orchestrated_project(client, auth_headers, sample_project) -> dict:
    """Run the AI orchestration workflow on the sample project and return it."""
    response = await client.post(
        f"/api/v1/projects/{sample_project['id']}/orchestrate/start",
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    return sample_project