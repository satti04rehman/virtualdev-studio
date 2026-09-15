from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import auth, projects, entities, websocket, orchestrate

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered virtual software development studio",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(entities.router, prefix="/api/v1")
app.include_router(orchestrate.router, prefix="/api/v1")
app.include_router(websocket.router)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {"message": "VirtualDev Studio API", "version": settings.APP_VERSION}
