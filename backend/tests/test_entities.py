import httpx


async def test_get_requirements(
    client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict
):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/requirements",
        headers=auth_headers,
    )
    assert response.status_code == 200
    requirements = response.json()
    assert isinstance(requirements, list)
    assert len(requirements) == 4
    titles = [req["title"] for req in requirements]
    assert "User authentication" in titles
    assert all(req["project_id"] == orchestrated_project["id"] for req in requirements)


async def test_get_research(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/research",
        headers=auth_headers,
    )
    assert response.status_code == 200
    research = response.json()
    assert isinstance(research, list)


async def test_get_architecture(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/architecture",
        headers=auth_headers,
    )
    assert response.status_code == 200
    components = response.json()
    assert isinstance(components, list)
    # The architecture stage is an approval-gated stage: the orchestrator pauses
    # on it and only executes after the approval is decided and the workflow is
    # continued, so the list may legitimately be empty after /orchestrate/start.
    assert all(c["project_id"] == orchestrated_project["id"] for c in components)


async def test_get_tasks(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/tasks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    assert len(tasks) >= 1
    assert all(task["project_id"] == orchestrated_project["id"] for task in tasks)


async def test_get_agents(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/agents",
        headers=auth_headers,
    )
    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, list)
    assert len(agents) >= 1
    assert all(agent["is_active"] is True for agent in agents)


async def test_get_approvals(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    response = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/approvals",
        headers=auth_headers,
    )
    assert response.status_code == 200
    approvals = response.json()
    assert isinstance(approvals, list)
    assert len(approvals) == 3
    assert all(a["status"] == "pending" for a in approvals)
    assert all(a["project_id"] == orchestrated_project["id"] for a in approvals)


async def test_decide_approval(client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict):
    approvals = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/approvals",
        headers=auth_headers,
    )
    approval = approvals.json()[0]

    response = await client.post(
        f"/api/v1/projects/{orchestrated_project['id']}/approvals/{approval['id']}/decide",
        json={"decision": "approved", "decision_notes": "Looks good to me"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "decided"
    assert body["decision"] == "approved"
    assert body["decision_notes"] == "Looks good to me"
    assert body["decided_at"] is not None


async def test_decide_approval_already_decided(
    client: httpx.AsyncClient, auth_headers: dict, orchestrated_project: dict
):
    approvals = await client.get(
        f"/api/v1/projects/{orchestrated_project['id']}/approvals",
        headers=auth_headers,
    )
    approval = approvals.json()[0]
    decide_url = (
        f"/api/v1/projects/{orchestrated_project['id']}/approvals/{approval['id']}/decide"
    )

    first = await client.post(decide_url, json={"decision": "rejected"}, headers=auth_headers)
    assert first.status_code == 200

    second = await client.post(decide_url, json={"decision": "approved"}, headers=auth_headers)
    assert second.status_code == 400
    assert second.json()["detail"] == "Approval already decided"