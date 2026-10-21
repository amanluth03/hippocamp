# Hippo Campus 🦛
thehippocampus.net

A photo sharing and memory saving application for capturing and reliving event moments.

## Features

- **Event Albums** - Create events and invite friends to share photos
- **Flashbacks** - Get "on this day" memory notifications
- **Interactive Feed** - Browse photos from all your events

## Tech Stack

- **Frontend**: React + TypeScript + Vite (PWA)
- **Backend**: Python + FastAPI
- **Database**: PostgreSQL
- **Cloud**: AWS (S3, RDS, ECS)

## Project Structure

```
hippocamp/
├── frontend/          # React PWA
├── backend/           # FastAPI API
└── infrastructure/    # Terraform AWS configs
```

## Development

### Quick Start

```bash
# One command to start everything:
./start-dev.sh
```

Or start services manually:

```bash
# Terminal 1 - Database
cd backend && docker-compose up -d

# Terminal 2 - Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### Access the App

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### Stopping Services

- **Frontend/Backend**: Press `Ctrl+C` in their terminals
- **Database**: You can leave it running! Docker uses minimal resources when idle. Stop with `cd backend && docker-compose down` if needed.
