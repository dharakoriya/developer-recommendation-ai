# DevAlign AI — Backend

Python FastAPI backend for DevAlign AI system.

## Setup Instructions

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate virtual environment:
   - **Windows PowerShell**: `.\venv\Scripts\Activate.ps1`
   - **Linux/macOS**: `source venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

5. Run development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Verification Endpoint

- Health Check: `http://localhost:8000/api/health`
- Interactive API Docs: `http://localhost:8000/docs`
