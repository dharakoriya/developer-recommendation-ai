# Milestone 24.5 Verification Guide

This guide walks through verifying the AI Planning Provider transparency features and local planning support introduced in Milestone 24.5.

## 1. Provider Transparency API Verification

Ensure the backend exposes the available providers correctly.
1. Run the backend server.
2. Send a request to the providers endpoint:
   ```bash
   curl http://localhost:8000/api/v1/ai-planning/providers
   ```
   (Note: Ensure you include a valid auth token if testing manually via curl)
3. The response should contain an array of `AIProviderInfo` objects, including `heuristic`, `openai`, and `ollama`. The `is_active` field will reflect whether the relevant configuration (e.g., API key, active Ollama host) is present.

## 2. Frontend Transparency UI

1. Open the DevAlign AI frontend.
2. Navigate to **AI Project Planner**.
3. In the right-hand **AI Planning Preview** card, you should see a badge showing the currently active provider (e.g., `Heuristic Rule-Based Engine`).
4. Generate a new AI Project Plan.
5. Once redirected to the Plan Overview, verify the newly added transparency badge below the project description. It should display:
   - "Planned by: 🧠 Rule-Based Heuristic" (or Generative AI).
   - "Model: heuristic-v1".
   - "Prompt: v1.0".

## 3. Fallback and Graceful Degradation

If the active provider (e.g., OpenAI or Ollama) fails due to missing keys or an unreachable host, the system is designed to seamlessly fall back to the `HeuristicPlanningProvider`.
- To test this, set `AI_PROVIDER=ollama` but ensure Ollama is not running.
- Generate a plan.
- The plan will successfully generate. Check the Plan Overview badge; it will report `ai_provider` as `ollama-fallback-heuristic`, ensuring transparency about the failure and fallback.
