# DevAlign AI — AI Project Planner Final Validation

## 1. Provider Implementation Matrix

DevAlign AI supports three distinct planning providers in `backend/app/services/ai_planning_provider.py`:

| Provider ID | Provider Type | Description | Local / Cloud | Requires API Key? | Fallback Provider | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`heuristic`** | Rule-Based Engine | Fast, offline, deterministic plan generator. **DEFAULT**. | Local Python | **NO** | N/A (Root Provider) | **VERIFIED WORKING** |
| **`ollama`** | Local LLM Engine | Connects to local Ollama server (`http://localhost:11434`). | Local CPU/GPU | **NO** | `HeuristicPlanningProvider` | **VERIFIED WORKING** |
| **`openai`** | Cloud LLM Engine | Connects to OpenAI REST API (`gpt-4o`). | Cloud Server | **YES** (`AI_API_KEY`) | `HeuristicPlanningProvider` | **VERIFIED WORKING** |

---

## 2. Fallback Behavior & Resiliency Truth

- **Missing API Key**: If `AI_PROVIDER=openai` is configured but `OPENAI_API_KEY` is empty, the provider logs a warning and falls back to `HeuristicPlanningProvider`.
- **Ollama Offline**: If `AI_PROVIDER=ollama` is configured but the local Ollama server is offline or not installed, the call catches the exception and falls back to `HeuristicPlanningProvider`.
- **Laptop Portability Guarantee**: A developer can run DevAlign AI on any laptop without Ollama or OpenAI keys. It will operate 100% cleanly using the Heuristic provider.

---

## 3. Plan Approval & Database Flow

```
1. User enters Project Requirements (Name, Description, Project Type, Granularity)
                                │
                                ▼
2. Backend generates Structured Plan JSON (Modules, Tasks, Skill Requirements, Weights)
                                │
                                ▼
3. Manager Reviews, Edits, or Adjusts Tasks in Frontend Wizard (/ai-planning)
                                │
                                ▼
4. Manager Clicks "Approve Plan" -> Backend Endpoint POST /api/ai-planning/apply
                                │
                                ▼
5. Real Database Project & Tasks Created in PostgreSQL -> Immediately Available for Baseline-v2 Developer Recommendation Engine
```
