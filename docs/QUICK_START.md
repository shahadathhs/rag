# RAG System - Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and pnpm
- (Optional) NVIDIA GPU for faster Ollama inference

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
MONGODB_URI=mongodb://admin:password@localhost:27017/rag?authSource=admin
MONGODB_USER=admin
MONGODB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
PORT=3000

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# RAG Configuration
CHUNK_SIZE=500
CHUNK_OVERLAP=100
TOP_K_CHUNKS=5
```

### 3. Start Services

```bash
# Start all services (MongoDB, Redis, Ollama)
make up

# Pull Ollama model (first time only)
make ollama-pull

# Verify Ollama models
make ollama-models
```

### 4. Run Application

```bash
# Development mode
make dev

# Or directly
pnpm dev
```

## Usage

### API Endpoints

#### Authentication

```bash
# Register
POST http://localhost:3000/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

# Login
POST http://localhost:3000/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Document Upload

```bash
# Upload document (PDF, DOCX, TXT, MD)
POST http://localhost:3000/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <your-file>
```

#### RAG Chat

```bash
# Create conversation
POST http://localhost:3000/chat/conversations
Authorization: Bearer <token>
{
  "title": "My Research Chat",
  "documentIds": ["doc-id-1", "doc-id-2"]
}

# Send message
POST http://localhost:3000/chat
Authorization: Bearer <token>
{
  "conversationId": "conv-id",
  "message": "What is the main topic?"
}

# Stream response (SSE)
POST http://localhost:3000/chat/stream
Authorization: Bearer <token>
{
  "conversationId": "conv-id",
  "message": "Summarize the document"
}
```

## Makefile Commands

```bash
make help           # Show all available commands
make up             # Start all services
make down           # Stop all services
make logs           # View logs
make clean          # Remove containers and volumes
make dev            # Run development server
make db-shell       # Open MongoDB shell
make redis-cli      # Open Redis CLI
make ollama-pull    # Pull Ollama model
make ollama-models  # List Ollama models
```

## Troubleshooting

### Build Segmentation Fault

The `pnpm build` command may fail with a segmentation fault due to transformers.js loading ML models during compilation. This is expected and doesn't affect runtime. Use `pnpm dev` to run the application.

### Ollama Not Responding

```bash
# Check Ollama container
docker compose logs ollama

# Restart Ollama
docker compose restart ollama

# Pull model again
make ollama-pull
```

### MongoDB Connection Issues

```bash
# Check MongoDB logs
docker compose logs mongodb

# Verify connection string in .env
# Make sure MONGODB_URI matches your credentials
```

## Documentation

- **Flow Documentation**: `docs/RAG_FLOW.md` - Complete system flows with sequence diagrams
- **API Documentation**: http://localhost:3000/api (Swagger UI when running)

## Architecture

```
User → API → Document Processor → Embedding Service (transformers.js)
                                 ↓
                              MongoDB (384-d vectors)
                                 ↓
User → API → RAG Chat → Vector Search → Ollama LLM → Response
```

## Features

✅ Local embeddings (no API keys)  
✅ Local LLM via Ollama  
✅ PDF, DOCX, TXT, MD support  
✅ Vector similarity search  
✅ Streaming responses  
✅ Source tracking & citations  
✅ Conversation management

## Next Steps

1. Upload your first document
2. Create a conversation
3. Ask questions about your documents
4. Explore the flow documentation for detailed understanding
