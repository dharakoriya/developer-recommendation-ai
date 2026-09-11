# OLLAMA BEGINNER SETUP AND TEST GUIDE — Local AI Installation & Fallback Protocol

This guide provides beginner-friendly instructions for setting up Ollama, running local open-source LLMs, and understanding the AI planner fallback architecture in DevAlign AI.

---

## 1. Frequently Asked Questions for Beginners

- **What is Ollama?**: An open-source local application that lets you run Large Language Models (like Llama 3 or Mistral) directly on your laptop.
- **Is it free?**: YES, 100% free and open-source.
- **Does it require internet?**: Internet is only needed once to download the model file. After downloading, it runs 100% offline.
- **Does it require an API key?**: NO.
- **What happens if Ollama is NOT installed?**: DevAlign AI automatically falls back to our built-in **Heuristic Provider**. The application will never fail or crash due to missing AI components.

---

## 2. Installation Instructions for a Fresh Windows Laptop

```bash
# 1. Download Ollama installer from https://ollama.com/download/windows
# 2. Run the installer and complete setup.

# 3. Open Windows PowerShell or Command Prompt and download Llama 3 model:
ollama run llama3

# 4. Verify Ollama API daemon is running by visiting in browser:
http://localhost:11434/api/tags
```

---

## 3. Provider Architecture in DevAlign AI

```
AI Project Planner (/ai-planning)
       │
       ├──> 1. Check if OPENAI_API_KEY exists in .env --> (Use OpenAI Provider)
       ├──> 2. Check if Ollama daemon is reachable on http://localhost:11434 --> (Use Ollama Provider)
       └──> 3. Otherwise --> (Use Heuristic Fallback Provider)
```
