from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.health import router as health_router
from app.api.auth import router as auth_router

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
