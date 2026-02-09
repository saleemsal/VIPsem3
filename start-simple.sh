#!/bin/bash

# Simple startup script - starts all services in separate terminals
# This version opens each service in a new terminal window (Linux version)

echo "Starting development environment..."

# Function to open terminal (works on Linux)
open_terminal() {
    local command="$1"
    local title="$2"
    
    # Try different terminal emulators
    if command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal --title="$title" -- bash -c "$command; exec bash"
    elif command -v xterm >/dev/null 2>&1; then
        xterm -title "$title" -e bash -c "$command; exec bash" &
    elif command -v konsole >/dev/null 2>&1; then
        konsole --title "$title" -e bash -c "$command; exec bash" &
    else
        echo "No supported terminal emulator found. Starting in background..."
        bash -c "$command" &
    fi
}

# Start Ollama server in a new terminal
open_terminal "cd /storage/ice-shared/vip-vp4/Fall2025/ollama-models && module load ollama && ollama serve" "Ollama Server"

# Wait a moment for Ollama to start
sleep 2

# Start local API in a new terminal
open_terminal "cd '$(pwd)' && npm run start:local-api" "Local API Server"

# Wait a moment for API to start
sleep 2

# Start Vite dev server in a new terminal
open_terminal "cd '$(pwd)' && npm run dev" "Vite Dev Server"

echo "All services started in separate terminal windows!"
echo "Services:"
echo "  • Vite Dev Server: http://127.0.0.1:5173"
echo "  • Local API Server: http://127.0.0.1:3001"
echo "  • Ollama Server: http://127.0.0.1:11434"
