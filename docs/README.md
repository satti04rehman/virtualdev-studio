# VirtualDev Studio

AI-powered virtual software development studio that orchestrates a team of specialized AI agents to collaboratively build software projects with human-in-the-loop approval workflows.

## Project Structure

```
virtualdev-studio/
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── ai/       # AI orchestrator & agent logic
│   │   ├── api/      # REST & WebSocket endpoints
│   │   ├── core/     # Config, security, rate limiting
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   └── main.py   # FastAPI application entry
│   └── tests/        # Pytest test suite
├── frontend/         # React + TypeScript SPA
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── hooks/       # Custom React hooks
│       ├── pages/       # 15 application pages
│       ├── services/    # API client
│       └── types/       # TypeScript type definitions
├── mobile/           # Flutter companion app
│   └── lib/
│       ├── models/      # Dart data models
│       ├── providers/   # State management
│       ├── screens/     # App screens
│       ├── services/    # API & WebSocket services
│       └── widgets/     # Reusable Flutter widgets
├── docs/             # Project documentation
│   ├── architecture/ # System architecture docs
│   ├── diagrams/     # Mermaid diagram sources
│   ├── requirements/ # Functional & non-functional requirements
│   └── security/     # Security review
└── scripts/          # Utility scripts
```

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Backend  | Python, FastAPI, SQLAlchemy, Pydantic, JWT    |
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS |
| Mobile   | Flutter, Dart, Provider, WebSocket Channel    |
| Database | SQLite (async via aiosqlite)                  |
| Testing  | Pytest (backend)                              |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

## API Endpoints

- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `GET  /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET  /api/v1/projects/{id}` - Get project
- `GET  /api/v1/projects/{id}/entities` - Get project entities
- `POST /api/v1/orchestrate/{project_id}/start` - Start AI orchestration
- `POST /api/v1/orchestrate/{project_id}/continue` - Continue orchestration
- `POST /api/v1/orchestrate/{project_id}/approve/{task_id}` - Approve task
- `WS   /ws/{project_id}` - Real-time project updates
