import uuid

from httpx import AsyncClient

STAGES = [
    "requirements", "research", "product_analysis", "architecture",
    "ui_ux_design", "database_design", "implementation_plan",
    "development", "testing", "security_review", "documentation",
    "diagrams", "presentation", "final_report",
]


async def test_create_project(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/projects",
        json={
            "name": "New App",
            "description": "A brand new application",
            "platform": "web",
            "preferred_tech": ["fastapi", "react"],
            "complexity": "high",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New App"
    assert body["status"] == "created"
    assert body["current_stage"] == "requirements"
    assert body["complexity"] == "high"
    assert body["progress"] == 0
    assert "id" in body


async def test_list_projects(client: AsyncClient, auth_headers: dict):
    empty = await client.get("/api/v1/projects", headers=auth_headers)
    assert empty.status_code == 200
    assert empty.json() == {"projects": [], "total": 0}

    await client.post(
        "/api/v1/projects",
        json={"name": "Project One", "description": "First"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/projects",
        json={"name": "Project Two", "description": "Second"},
        headers=auth_headers,
    )

    response = await client.get("/api/v1/projects", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert {p["name"] for p in body["projects"]} == {"Project One", "Project Two"}


async def test_get_project(client: AsyncClient, auth_headers: dict, sample_project: dict):
    response = await client.get(
        f"/api/v1/projects/{sample_project['id']}", headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == sample_project["id"]
    assert body["name"] == "Test Project"
    assert "created_at" in body


async def test_get_project_not_found(client: AsyncClient, auth_headers: dict):
    random_id = uuid.uuid4()
    response = await client.get(f"/api/v1/projects/{random_id}", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"


async def test_update_project(client: AsyncClient, auth_headers: dict, sample_project: dict):
    response = await client.patch(
        f"/api/v1/projects/{sample_project['id']}",
        json={"name": "Renamed Project", "status": "in_progress", "progress": 25},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed Project"
    assert body["status"] == "in_progress"
    assert body["progress"] == 25

    fetch = await client.get(f"/api/v1/projects/{sample_project['id']}", headers=auth_headers)
    assert fetch.status_code == 200
    assert fetch.json()["name"] == "Renamed Project"


async def test_get_project_stages(client: AsyncClient, auth_headers: dict, sample_project: dict):
    response = await client.get(
        f"/api/v1/projects/{sample_project['id']}/stages", headers=auth_headers
    )
    assert response.status_code == 200
    stages = response.json()
    assert isinstance(stages, list)
    assert len(stages) == len(STAGES)
    names = [stage["stage_name"] for stage in stages]
    assert set(names) == set(STAGES)
    assert all(stage["status"] == "pending" for stage in stages)
    assert all(stage["project_id"] == sample_project["id"] for stage in stages)