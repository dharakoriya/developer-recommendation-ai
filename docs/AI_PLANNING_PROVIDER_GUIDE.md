# AI Planning Provider Guide

DevAlign AI supports multiple AI planning providers to generate task breakdowns, module architectures, and effort estimates. This document explains the available providers and how they are configured.

## Provider Overview

1. **Heuristic Rule-Based Engine (`heuristic`)**
   - **Type**: Rule-Based Heuristic
   - **Description**: A highly deterministic, offline-capable engine that uses project properties, technology stack, and keywords to build out tasks.
   - **When to use**: When you need instant, deterministic plans without relying on external APIs, or when working offline.

2. **OpenAI (`openai`)**
   - **Type**: Generative AI
   - **Description**: Uses OpenAI's LLMs (like `gpt-4o-mini`) via API to generate dynamic, highly contextual project plans.
   - **When to use**: When you want more creative, nuanced task generation and have an active API key.

3. **Ollama (`ollama`)**
   - **Type**: Generative AI
   - **Description**: Uses local LLMs (like `llama3`) running via Ollama. It communicates locally and does not require a paid API key.
   - **When to use**: When you want the benefits of Generative AI while keeping data completely local and private.

## Configuration

Providers are configured via environment variables:

```env
# Define the active provider: heuristic, openai, or ollama
AI_PROVIDER=heuristic

# Define the specific model (applies to OpenAI and Ollama)
AI_MODEL=llama3

# Optional: Set the host for Ollama (default is http://localhost:11434)
OLLAMA_HOST=http://localhost:11434

# Required if AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

## Provider Transparency UI

DevAlign AI emphasizes transparency in AI generation. 
- In the **Plan Overview**, a badge clearly labels whether the plan was generated via `Rule-Based Heuristic` or `Generative AI`.
- The exact model name and prompt version are recorded and displayed to ensure traceability and auditability.

---

**For a complete beginner-friendly tutorial on running AI locally without API keys, please read the [Local AI & Ollama Beginner Guidebook](file:///d:/Custom%20Project/dhara/devalign-ai/docs/LOCAL_AI_OLLAMA_GUIDE.md).**
