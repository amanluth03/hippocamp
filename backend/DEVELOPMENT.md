# Backend Development Guide

## Quick Start

```bash
# 1. Start PostgreSQL
docker-compose up -d

# 2. Activate virtual environment
source venv/bin/activate

# 3. Run the server
uvicorn app.main:app --reload --port 8000
```

## Useful Commands

### Database

```bash
# Start PostgreSQL container
docker-compose up -d

# Stop PostgreSQL container
docker-compose down

# View database tables
docker exec hippocamp-db psql -U hippocamp -c "\dt"

# Connect to database interactively
docker exec -it hippocamp-db psql -U hippocamp
```

### Alembic (Database Migrations)

```bash
# Generate a new migration after changing models
alembic revision --autogenerate -m "description of changes"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current migration version
alembic current
```

### Python Environment

```bash
# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Add a new dependency
pip install <package-name>
pip freeze > requirements.txt  # Update requirements file
```

### API Server

```bash
# Run with auto-reload (development)
uvicorn app.main:app --reload --port 8000

# Run without auto-reload (production-like)
uvicorn app.main:app --port 8000

# API docs available at:
# - http://localhost:8000/docs (Swagger UI)
# - http://localhost:8000/redoc (ReDoc)
```

## Environment Variables

Copy `env.example` to `.env` and update values as needed:

```bash
cp env.example .env
```

## Switching to AWS RDS

When ready for production, update `.env`:

```
DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/hippocamp
```

Then run migrations against the production database:

```bash
alembic upgrade head
```

