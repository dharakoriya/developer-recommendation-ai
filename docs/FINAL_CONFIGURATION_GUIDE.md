# DevAlign AI — Complete System Configuration Guide

## 1. Central Configuration Architecture

All system settings are loaded via Pydantic Settings in `backend/app/config.py` from `backend/.env`.

```env
# ==============================================================================
# DEVALIGN AI BACKEND ENVIRONMENT CONFIGURATION
# ==============================================================================

# Core Application Settings
PROJECT_NAME="DevAlign AI Backend"
ENVIRONMENT=development
API_PREFIX=/api
PORT=8000

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devalign_db

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Authentication & JWT Security
JWT_SECRET=devalign-secret-key-change-in-production-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Project Planner Provider Configuration
# Options: "heuristic" (Default, 0 API needed), "ollama" (Local Llama3), "openai" (GPT-4o)
AI_PROVIDER=heuristic
AI_MODEL=llama3
OLLAMA_HOST=http://localhost:11434
OPENAI_API_KEY=

# Active Production Recommendation Model
# Options: "baseline-v2" (Default 2.0 Compatibility Engine), "baseline-v1" (Legacy 6-Factor)
RECOMMENDATION_MODEL=baseline-v2
```

---

## 2. Frontend Configuration

In `frontend/.env.local` (or `frontend/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 3. Deployment Component Requirements

| Component | Status | Purpose | Fallback if Unavailable |
|---|---|---|---|
| **PostgreSQL 14+** | **REQUIRED** | Primary relational store | None (DB is mandatory) |
| **Python 3.11+ / FastAPI** | **REQUIRED** | Backend API & Business Services | None (Backend is mandatory) |
| **Node.js 18+ / Next.js 14**| **REQUIRED** | User Interface | None (Frontend is mandatory) |
| **Ollama (Local LLM)** | **OPTIONAL** | Local AI Project Planner with Llama3 | System automatically falls back to `heuristic` provider |
| **OpenAI API Key** | **OPTIONAL** | Cloud AI Project Planner with GPT-4o | System automatically falls back to `heuristic` provider |
| **Research ML Artifacts** | **OPTIONAL** | View ML metrics & SHAP charts | Only needed when testing `/research/ml` routes |
