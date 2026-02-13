# RAG with MongoDB

A NestJS-based RAG (Retrieval-Augmented Generation) application using MongoDB for vector storage, Hugging Face embeddings, and Ollama for chat. It supports:

- **User documents**: Upload PDF/DOCX/TXT/MD, chunk and embed for RAG.
- **Product catalog**: Admin-managed product index (single or bulk via queue) for semantic search.
- **RAG chat**: Context is retrieved from both the user’s documents and the global product catalog; responses are generated with Ollama (standard or SSE streaming).

Auth is JWT-based; document and chat endpoints require a logged-in user; product management is superadmin-only.

## Prerequisites

- Docker & Docker Compose
- (Optional) [Make](https://www.gnu.org/software/make/) — for the commands below

## Quick start

### 1. Start all services

```bash
make up
# or: docker compose up -d
```

This starts the API, **MongoDB**, **Redis** (for product indexing queue), Mongo Express, and **Ollama**. The API waits for MongoDB and Redis to be healthy.

### 2. Pull the Ollama model (required for chat)

The LLM model is not included in the image. Pull it after the stack is up:

```bash
make ollama-pull
# or: docker compose exec ollama ollama pull llama3.2
```

This pulls the default model (`llama3.2`). The first pull can take several minutes depending on your connection.

### 3. Wait for the API to be fully ready

After the API container is running:

- The **embedding model** (e.g. `Xenova/all-MiniLM-L6-v2`) loads on application startup. The first request that needs embeddings may be slow; give the app **a minute or two** after the health check passes before heavy use.
- **Ollama** must have the model pulled (step 2) for chat and streaming to work.

Check health:

```bash
curl -s http://localhost:3000/health
```

### 4. Optional: list Ollama models

```bash
make ollama-models
# or: docker compose exec ollama ollama list
```

## Makefile commands

| Command           | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `make up`         | Start all services (API, MongoDB, Redis, Mongo Express, Ollama)             |
| `make dev`        | Start only infra + Ollama (no API) for local development                   |
| `make down`       | Stop all services                                                            |
| `make ollama-pull`| Pull Ollama model `llama3.2` (run after `make up`)                          |
| `make ollama-models` | List installed Ollama models                                            |
| `make logs`       | Follow logs from all services                                               |
| `make build`      | Build the API Docker image                                                  |
| `make restart`    | Restart all services                                                        |
| `make clean`      | Stop everything and remove containers, volumes, images                     |

## Configuration

- Copy `.env.example` to `.env` and adjust as needed.
- **MongoDB**: `MONGODB_URI` for the app database.
- **Redis**: Required for the product-index queue (`REDIS_HOST`, `REDIS_PORT`). In Docker, the API uses `redis:6379`.
- **Ollama**: In Docker, the API uses `OLLAMA_BASE_URL=http://ollama:11434` (set in `compose.yaml`). For local runs, use `OLLAMA_BASE_URL=http://localhost:11434` and ensure Ollama is running and the model is pulled. Set `OLLAMA_MODEL` to the model name you pull (e.g. `llama3.2`, `phi3`, `gemma2:2b`).
- **Ollama model (low-spec devices)**: If your machine has limited RAM/CPU, use a smaller model for better speed and stability. Try one of these (pull with `ollama pull <name>`, then set `OLLAMA_MODEL=<name>` in `.env`):
  - **phi3** (~2B) — good balance of quality and size, ~2 GB RAM.
  - **gemma2:2b** — small, instruction-tuned; ~1.5 GB.
  - **qwen2:0.5b** or **qwen2:1.5b** — very light; 0.5B is minimal, 1.5B a bit better.
  - **llama3.2:1b** — smaller than default llama3.2 (3B); less RAM.
  - **tinyllama** — 1.1B, very fast on weak hardware.
  Larger models (e.g. llama3.2 3B, mistral 7B) give better answers but need more RAM; if you see slow responses or OOM, switch to one of the smaller models above.
- **JWT**: `JWT_SECRET` and `JWT_EXPIRES_IN` for auth. Superadmin users (for admin/product endpoints) are seeded via the app (see seed module).

## Documentation

- **[docs/RAG_FLOW.md](docs/RAG_FLOW.md)** — RAG flow, architecture (documents + product catalog + queue), and API behavior.

## Summary

1. Run **`make up`**, then **`make ollama-pull`** so chat works.
2. Allow a short delay after the API is up for the **embedding model** to load.
3. **Redis** must be running for bulk product indexing (queue).
4. Use the Makefile as the main reference for run, pull, and debug commands.
