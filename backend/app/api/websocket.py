import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from uuid import UUID
from sqlalchemy import select
from app.core.security import authenticate_token
from app.core.database import get_db
from app.models.models import Project

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id] = [
                ws for ws in self.active_connections[project_id] if ws != websocket
            ]

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/ws/projects/{project_id}")
async def project_websocket(websocket: WebSocket, project_id: str):
    # Auth runs before accept(): the handshake isn't complete until we accept,
    # so unauthenticated/unauthorized clients are rejected with 4401 and never
    # receive a single project event.
    try:
        project_uuid = UUID(project_id)
        header = websocket.headers.get("authorization", "")
        token = (
            header.split(" ", 1)[1]
            if header.lower().startswith("bearer ")
            else websocket.query_params.get("token")
        )
        if not token:
            raise ValueError("missing token")
        async with get_db() as db:
            user = await authenticate_token(token, db)
            result = await db.execute(
                select(Project).where(
                    Project.id == project_uuid, Project.owner_id == user.id
                )
            )
            if result.scalar_one_or_none() is None:
                raise ValueError("not the project owner")
    except Exception:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)