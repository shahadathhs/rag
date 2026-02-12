.PHONY: help dev up down logs clean build restart

help:
	@echo "Available commands:"
	@echo "  make dev       - Start development environment (MongoDB, Redis, Mongo Express)"
	@echo "  make up        - Start all services including API"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs from all services"
	@echo "  make clean     - Remove all containers, volumes, and images"
	@echo "  make build     - Build the Docker image"
	@echo "  make restart   - Restart all services"

dev:
	docker compose up mongodb mongo-express redis -d

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
