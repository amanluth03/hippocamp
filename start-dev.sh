#!/bin/bash

# Hippo Campus Development Startup Script
# Usage: ./start-dev.sh [--network]
#   --network: Expose servers to local network for mobile testing

echo "🦛 Starting Hippo Campus..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check for network flag
NETWORK_MODE=false
if [[ "$1" == "--network" ]]; then
    NETWORK_MODE=true
    echo -e "${YELLOW}📱 Network mode enabled - accessible from other devices${NC}"
fi

# Get local IP for network mode
LOCAL_IP=""
if $NETWORK_MODE; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
    if [[ -z "$LOCAL_IP" ]]; then
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    fi
fi

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
if $NETWORK_MODE; then
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
else
    uvicorn app.main:app --reload --port 8000 &
fi
BACKEND_PID=$!
cd ..

# Start frontend in background
echo -e "${BLUE}Starting Frontend...${NC}"
cd frontend
if $NETWORK_MODE; then
    npm run dev -- --host &
else
    npm run dev &
fi
FRONTEND_PID=$!
cd ..

# Wait for servers to start
sleep 3

echo ""
echo -e "${GREEN}✅ Hippo Campus is running!${NC}"
echo ""
if $NETWORK_MODE && [[ -n "$LOCAL_IP" ]]; then
    echo "┌────────────────────────────────────────────────────────┐"
    echo "│  Service          │  URL                               │"
    echo "├────────────────────────────────────────────────────────┤"
    echo "│  Frontend         │  http://localhost:5173             │"
    echo "│  Frontend (📱)    │  http://$LOCAL_IP:5173        │"
    echo "│  Backend API      │  http://localhost:8000             │"
    echo "│  Backend API (📱) │  http://$LOCAL_IP:8000        │"
    echo "│  API Docs         │  http://localhost:8000/docs        │"
    echo "└────────────────────────────────────────────────────────┘"
    echo ""
    echo -e "${YELLOW}📱 To test on your phone, open: http://$LOCAL_IP:5173${NC}"
else
    echo "┌─────────────────────────────────────────────┐"
    echo "│  Service          │  URL                    │"
    echo "├─────────────────────────────────────────────┤"
    echo "│  Frontend         │  http://localhost:5173  │"
    echo "│  Backend API      │  http://localhost:8000  │"
    echo "│  API Docs         │  http://localhost:8000/docs │"
    echo "└─────────────────────────────────────────────┘"
    echo ""
    echo -e "Tip: Use ${YELLOW}./start-dev.sh --network${NC} for mobile testing"
fi
echo ""
echo "Press Ctrl+C to stop all services..."

# Handle shutdown
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done!'; exit 0" SIGINT SIGTERM

# Wait for processes
wait

