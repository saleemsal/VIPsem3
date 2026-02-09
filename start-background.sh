#!/bin/bash

# Background startup script - starts all services in the background
# Use this if you want everything running in the background

echo "Starting development environment in background..."

# Start Ollama server in background
(
    cd /storage/ice-shared/vip-vp4/Fall2025/ollama-models
    module load ollama
    ollama serve
) > ollama.log 2>&1 &
OLLAMA_PID=$!

echo "Started Ollama server (PID: $OLLAMA_PID)"

# Wait a moment for Ollama to start
sleep 3

# Start local API in background
npm run start:local-api > api.log 2>&1 &
API_PID=$!

echo "Started local API server (PID: $API_PID)"

# Wait a moment for API to start
sleep 2

# Start Vite dev server in background
npm run dev > vite.log 2>&1 &
VITE_PID=$!

echo "Started Vite dev server (PID: $VITE_PID)"

# Save PIDs to a file for easy cleanup
echo "$OLLAMA_PID" > .pids
echo "$API_PID" >> .pids
echo "$VITE_PID" >> .pids

echo ""
echo "All services started in background!"
echo "Services:"
echo "  • Vite Dev Server: http://127.0.0.1:5173"
echo "  • Local API Server: http://127.0.0.1:3001"
echo "  • Ollama Server: http://127.0.0.1:11434"
echo ""
echo "Logs:"
echo "  • Ollama: ollama.log"
echo "  • API: api.log"
echo "  • Vite: vite.log"
echo ""
echo "To stop all services, run: ./stop-services.sh"
