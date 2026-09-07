from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.skills import router as skills_router
from app.api.developers import router as developers_router
from app.api.projects import router as projects_router
from app.api.teams import router as teams_router
from app.api.tasks import router as tasks_router
from app.api.assignments import router as assignments_router
from app.api.workload import router as workload_router
from app.api.features import router as features_router
from app.api.recommendations import router as recommendations_router
from app.api.dashboard import router as dashboard_router
from app.api.performance import router as performance_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable AI-Based Developer Recommendation and Workload Balancing System API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API endpoints under /api prefix
app.include_router(health_router, prefix=settings.API_PREFIX, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication & Authorization"])
app.include_router(skills_router, prefix=f"{settings.API_PREFIX}/skills", tags=["Skills Catalog"])
app.include_router(developers_router, prefix=f"{settings.API_PREFIX}/developers", tags=["Developer Profiles"])
app.include_router(performance_router, prefix=settings.API_PREFIX, tags=["Performance Intelligence"])
app.include_router(projects_router, prefix=f"{settings.API_PREFIX}/projects", tags=["Projects Management"])
app.include_router(teams_router, prefix=settings.API_PREFIX, tags=["Teams Management"])
app.include_router(tasks_router, prefix=settings.API_PREFIX, tags=["Tasks Management"])
app.include_router(assignments_router, prefix=settings.API_PREFIX, tags=["Task Assignments"])
app.include_router(workload_router, prefix=f"{settings.API_PREFIX}/workload", tags=["Workload Engine"])
app.include_router(features_router, prefix=f"{settings.API_PREFIX}/features", tags=["Feature Engineering & Dataset"])
app.include_router(recommendations_router, prefix=f"{settings.API_PREFIX}/recommendations", tags=["Recommendation Engine"])
app.include_router(dashboard_router, prefix=f"{settings.API_PREFIX}/dashboard", tags=["Dashboard Statistics"])




@app.get("/", summary="Root Endpoint")
def root():
    return {
        "message": "Welcome to DevAlign AI API Server",
        "docs": "/docs",
        "health_check": f"{settings.API_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
