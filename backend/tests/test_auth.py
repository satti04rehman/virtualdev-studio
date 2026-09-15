from httpx import AsyncClient

from tests.conftest import TEST_USER_EMAIL, TEST_USER_PASSWORD


async def test_register_success(client: AsyncClient, user_data: dict):
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == TEST_USER_EMAIL
    assert body["full_name"] == user_data["full_name"]
    assert body["role"] == "user"
    assert body["is_active"] is True
    assert "id" in body
    assert "created_at" in body
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_duplicate_email(client: AsyncClient, user_data: dict):
    first = await client.post("/api/v1/auth/register", json=user_data)
    assert first.status_code == 201

    duplicate = await client.post("/api/v1/auth/register", json=user_data)
    assert duplicate.status_code == 400
    assert duplicate.json()["detail"] == "Email already registered"


async def test_login_success(client: AsyncClient, registered_user: dict):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, registered_user: dict):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": TEST_USER_EMAIL, "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "irrelevant"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


async def test_protected_route_no_token(client: AsyncClient):
    response = await client.get("/api/v1/projects")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


async def test_protected_route_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1In0.invalid_signature"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication credentials"