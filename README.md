# RAG with MongoDB

A NestJS-based RAG (Retrieval-Augmented Generation) application using MongoDB for vector storage, Hugging Face embeddings, and Ollama for chat. Upload documents, chat over them with context-aware responses, and stream replies via SSE.

## Prerequisites

- Docker & Docker Compose
- (Optional) [Make](https://www.gnu.org/software/make/) — for the commands below

## Quick start

### 1. Start all services

```bash
make up
# or: docker compose up -d
```

This starts the API, MongoDB, Redis, Mongo Express, and **Ollama**. The API will be available once MongoDB and Redis are healthy.

### 2. Pull the Ollama model (required for chat)

The LLM model is **not** included in the image. Pull it after the stack is up:

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

| Command           | Description                                              |
|-------------------|----------------------------------------------------------|
| `make up`         | Start all services (API, MongoDB, Redis, Mongo Express, Ollama) |
| `make dev`        | Start only infra + Ollama (no API) for local development |
| `make down`       | Stop all services                                        |
| `make ollama-pull`| Pull Ollama model `llama3.2` (run after `make up`)       |
| `make ollama-models` | List installed Ollama models                         |
| `make logs`       | Follow logs from all services                            |
| `make build`      | Build the API Docker image                               |
| `make restart`    | Restart all services                                     |
| `make clean`      | Stop everything and remove containers, volumes, images   |

## Configuration

- Copy `.env.example` to `.env` and adjust as needed.
- **Ollama**: In Docker, the API uses `OLLAMA_BASE_URL=http://ollama:11434` (set in `compose.yaml`). For local runs, use `OLLAMA_BASE_URL=http://localhost:11434` and ensure Ollama is running and the model is pulled.

## Documentation

- **[docs/RAG_FLOW.md](docs/RAG_FLOW.md)** — RAG flow, architecture, and API behavior.

## Summary

1. Run **`make up`**, then **`make ollama-pull`** so chat works.
2. Allow a short delay after the API is up for the **embedding model** to load.
3. Use the Makefile as the main reference for run, pull, and debug commands.
