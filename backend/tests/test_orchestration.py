import uuid

import httpx
import pytest


async def test_start_orchestration(
    client: httpx.AsyncClient, auth_headers: dict, sample_project: dict
):
    response = await client.post(
        f"/api/v1/projects/{sample_project['id']}/orchestrate/start",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "started"
    assert body["project_id"] == sample_project["id"]
    assert body["current_stage"] == "documentation"

    project = await client.get(
        f"/api/v1/projects/{sample_project['id']}", headers=auth_headers
    )
    assert project.status_code == 200
    assert project.json()["status"] == "in_progress"


async def test_start_orchestration_not_found(client: httpx.AsyncClient, auth_headers: dict):
    random_id = uuid.uuid4()
    response = await client.post(
        f"/api/v1/projects/{random_id}/orchestrate/start", headers=auth_headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"


async def test_continue_orchestration(
    client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict
):
    response = await client.post(
        f"/api/v1/projects/{orchestrated_project['id']}/orchestrate/continue",
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "continued"
    assert body["project_id"] == orchestrated_project["id"]


async def test_continue_orchestration_project_not_found(
    client: httpx.AsyncClient, auth_headers: dict
):
    random_id = uuid.uuid4()
    response = await client.post(
        f"/api/v1/projects/{random_id}/orchestrate/continue", headers=auth_headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"
