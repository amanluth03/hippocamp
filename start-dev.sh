#!/bin/bash

# Hippo Campus Development Startup Script
# Usage: ./start-dev.sh

echo "🦛 Starting Hippo Campus..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start PostgreSQL if not running
echo -e "${BLUE}Starting PostgreSQL...${NC}"
cd backend
docker-compose up -d
cd ..

# Wait for database
sleep 2

# Start backend in background
echo -e "${BLUE}Starting Backend API...${NC}"
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend in background
echo -e "${BLUE}Starting Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ Hippo Campus is running!${NC}"
echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  Service          │  URL                    │"
echo "├─────────────────────────────────────────────┤"
echo "│  Frontend         │  http://localhost:5173  │"
echo "│  Backend API      │  http://localhost:8000  │"
echo "│  API Docs         │  http://localhost:8000/docs │"
echo "└─────────────────────────────────────────────┘"
echo ""
echo "Press Ctrl+C to stop all services..."

# Handle shutdown
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done!'; exit 0" SIGINT SIGTERM

# Wait for processes
wait

