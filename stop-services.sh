#!/bin/bash

# Stop script for background services

echo "Stopping all development services..."

# Read PIDs from file and kill them
if [ -f .pids ]; then
    while read pid; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping process $pid"
            kill "$pid"
        fi
    done < .pids
    rm .pids
fi

# Also try to kill by process name as backup
pkill -f "ollama serve" 2>/dev/null || true
pkill -f "npm run start:local-api" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo "All services stopped!"
