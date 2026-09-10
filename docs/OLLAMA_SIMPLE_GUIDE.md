# DevAlign AI — Ollama & Local AI Simple Guide

## Executive Overview

DevAlign AI includes an **AI Project Planner** that breaks down project ideas into structured engineering tasks, modules, estimated hours, required developer skills, and task weight classifications.

To power this project planning capability, DevAlign supports **three provider options**:

1. **Heuristic Rule-Based Engine (`"heuristic"`)**: Pure Python rule-based generator. Fast, offline, deterministic, and requires no external AI. **DEFAULT PROVIDER**.
2. **Ollama Local LLM (`"ollama"`)**: Runs open-source Large Language Models (such as `llama3`, `mistral`, or `codellama`) locally on the user's computer using Ollama runtime.
3. **OpenAI Cloud Models (`"openai"`)**: Connects to OpenAI's cloud API (`gpt-4o`) over HTTP. Requires an active OpenAI API key.

---

## Difference Between OpenAI and Ollama

| Dimension | OpenAI | Ollama |
| :--- | :--- | :--- |
| **Execution Environment** | Cloud (OpenAI Servers) | **Local Computer (User's Laptop/PC)** |
| **Internet Required** | Yes | **No (Runs 100% Offline once model downloaded)** |
| **API Key Required** | Yes (`OPENAI_API_KEY`) | **No** |
| **Cost** | Paid per API token | **100% Free & Open-Source** |
| **Data Privacy** | Prompts sent to cloud | **100% Private (Data never leaves laptop)** |
| **Resource Usage** | Zero local CPU/GPU load | Uses local RAM and CPU/GPU |

---

## Ollama Fallback Architecture & Resilience

DevAlign is built so that **no feature ever crashes if external dependencies are missing**:

```
           ┌─────────────────────────────────────────┐
           │     User Requests AI Project Plan       │
           └────────────────────┬────────────────────┘
                                │
                      Is AI_PROVIDER = "ollama"?
                                │
               ┌────────────────┴────────────────┐
             YES                                 NO
               │                                 │
     Is Ollama Service Active?             Use Heuristic Engine
    (http://localhost:11434)                     │
               │                                 │
         ┌─────┴─────┐                           │
        YES          NO                          │
         │           │                           │
  Execute Local   Fallback to                    │
   Llama3 Model   Heuristic Engine ──────────────┤
         │           │                           │
         └─────┬─────┘                           │
               ▼                                 ▼
      Return Structured Delivery Plan JSON to Manager
```

---

## Portable Laptop Scenario

When moving DevAlign AI to a new laptop:

- **Scenario A (Ollama Installed)**:
  1. Install Ollama from `https://ollama.com`.
  2. Run `ollama pull llama3`.
  3. Set `AI_PROVIDER=ollama` in `backend/.env`.
  4. DevAlign uses local `llama3` model for project planning.

- **Scenario B (Ollama NOT Installed or Model Missing)**:
  1. Set `AI_PROVIDER=heuristic` in `backend/.env` (or leave default).
  2. DevAlign generates full structured plans instantly using the Heuristic Engine.
  3. **Result**: Zero crashes, zero errors, 100% application stability.

---

## Is Ollama connected to the Recommendation Engine?

**NO.**
The Developer Recommendation Engine (`baseline-v2`) is completely separate from Ollama. Baseline-v2 uses exact mathematical matching algorithms operating directly on PostgreSQL developer profiles and task skill matrices. Ollama is **only** used for optional AI Project Planning.
