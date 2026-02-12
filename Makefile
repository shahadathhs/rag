.PHONY: help dev up down logs clean build restart ollama-pull ollama-models

help:
	@echo "Available commands:"
	@echo "  make dev           - Start development environment (MongoDB, Redis, Mongo Express, Ollama)"
	@echo "  make up            - Start all services including API"
	@echo "  make down          - Stop all services"
	@echo "  make logs          - View logs from all services"
	@echo "  make clean         - Remove all containers, volumes, and images"
	@echo "  make build         - Build the Docker image"
	@echo "  make restart       - Restart all services"
	@echo "  make ollama-pull   - Pull Ollama model (llama3.2)"
	@echo "  make ollama-models - List installed Ollama models"

dev:
	docker compose up mongodb mongo-express redis ollama -d

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v --rmi all

build:
	docker compose build

restart:
	docker compose restart

ollama-pull:
	@echo "Pulling llama3.2 model..."
	docker compose exec ollama ollama pull llama3.2

ollama-models:
	@echo "Installed Ollama models:"
	docker compose exec ollama ollama list
