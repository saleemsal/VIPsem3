#!/bin/bash

# Startup script for the development environment
# This script starts all required services in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    # Try multiple methods to be more reliable
    local port_in_use=false
    
    # Method 1: Try lsof
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            port_in_use=true
        fi
    fi
    
    # Method 2: Try netstat
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            port_in_use=true
        fi
    fi
    
    # Method 3: Try ss
    if command -v ss >/dev/null 2>&1; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            port_in_use=true
        fi
    fi
    
    # Method 4: Try to connect to the port
    if command -v nc >/dev/null 2>&1; then
        if nc -z 127.0.0.1 $port 2>/dev/null; then
            port_in_use=true
        fi
    fi
    
    # Method 5: Try curl as last resort
    if command -v curl >/dev/null 2>&1; then
        if curl -s "http://127.0.0.1:$port" >/dev/null 2>&1; then
            port_in_use=true
        fi
    fi
    
    if [ "$port_in_use" = true ]; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to cleanup background processes on exit
cleanup() {
    print_status "Cleaning up background processes..."
    
    # Kill all background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Kill specific processes if they exist
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm run start:local-api" 2>/dev/null || true
    pkill -f "ollama serve" 2>/dev/null || true
    
    print_success "Cleanup completed"
    exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM

print_status "Starting development environment..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found - dependencies need to be installed"
    print_status "Running npm install..."
    
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        print_error "Please run 'npm install' manually and try again"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check if required ports are available
if check_port 8080; then
    print_warning "Port 8080 (Vite dev server) is already in use"
fi

if check_port 8787; then
    print_warning "Port 8787 (Local API) is already in use"
fi

if check_port 11434; then
    print_warning "Port 11434 (Ollama) is already in use"
fi

# Step 1: Start Ollama server
print_status "Step 1: Starting Ollama server..."

# Check if ollama directory exists
OLLAMA_DIR="/storage/ice-shared/vip-vp4/Fall2025/ollama-models"
if [ ! -d "$OLLAMA_DIR" ]; then
    print_error "Ollama directory not found: $OLLAMA_DIR"
    print_error "Please check the path and try again"
    exit 1
fi

# Function to test Ollama on a specific port
test_ollama_port() {
    local port=$1
    local base_url="http://127.0.0.1:$port"
    
    # Test basic connectivity
    if ! curl -s "$base_url" >/dev/null 2>&1; then
        return 1
    fi
    
    # Test API functionality
    if ! curl -s "$base_url/api/tags" >/dev/null 2>&1; then
        return 1
    fi
    
    # Test model generation
    if ! curl -s -X POST "$base_url/api/generate" \
        -H "Content-Type: application/json" \
        -d '{"model":"llama3.1:8b","prompt":"Hello","stream":false}' \
        | grep -q "response"; then
        return 1
    fi
    
    return 0
}

# Check if Ollama is already running on either port
print_status "Checking if Ollama is already running on port 11434 or 11435..."

OLLAMA_PORT=11434
OLLAMA_BASE_URL="http://127.0.0.1:11434"

if test_ollama_port 11434; then
    print_success "Ollama is working properly on port 11434 - using existing instance"
    print_status "This is normal when someone else is already running Ollama"
elif test_ollama_port 11435; then
    print_success "Ollama is working properly on port 11435 - using existing instance"
    print_status "Using fallback port 11435 (port 11434 was in use)"
    OLLAMA_PORT=11435
    OLLAMA_BASE_URL="http://127.0.0.1:11435"
else
    # No working Ollama found, need to start one
    print_status "No working Ollama instance found, starting new one..."
    
    # Check if port 11434 is free, otherwise use 11435
    if check_port 11434; then
        print_warning "Port 11434 is in use, using fallback port 11435"
        OLLAMA_PORT=11435
        OLLAMA_BASE_URL="http://127.0.0.1:11435"
        
        # Start Ollama on fallback port
        print_status "Starting Ollama on fallback port 11435..."
        (
            cd "$OLLAMA_DIR"
            module load ollama
            export OLLAMA_HOST=127.0.0.1:11435
            ollama serve
        ) &
        OLLAMA_PID=$!
        sleep 5
    else
        print_status "Port 11434 is free, starting Ollama on default port..."
        (
            cd "$OLLAMA_DIR"
            module load ollama
            ollama serve
        ) &
        OLLAMA_PID=$!
        sleep 5
    fi
    
    # Test the newly started Ollama
    print_status "Testing newly started Ollama..."
    if test_ollama_port $OLLAMA_PORT; then
        print_success "Ollama is now working on port $OLLAMA_PORT"
    else
        print_error "Failed to start Ollama properly"
        print_error "You may need to check Ollama installation or permissions"
    fi
fi

# Update environment variables for the local API
export OLLAMA_BASE_URL="$OLLAMA_BASE_URL"
print_status "Using Ollama at: $OLLAMA_BASE_URL"

# Step 2: Start local API
print_status "Step 2: Starting local API server..."

# Check if local API is already running
if check_port 8787; then
    print_warning "Local API server is already running on port 8787"
    print_status "Skipping local API startup - using existing instance"
    print_status "This is normal when someone else is already running the local API"
else
    # Start local API with the correct Ollama URL
    OLLAMA_BASE_URL="$OLLAMA_BASE_URL" npm run start:local-api &
    API_PID=$!
fi

# Step 3: Start Vite dev server
print_status "Step 3: Starting Vite development server..."

# Check if Vite dev server is already running
if check_port 8080; then
    print_warning "Vite dev server is already running on port 8080"
    print_status "Skipping Vite startup - using existing instance"
    print_status "This is normal when someone else is already running the dev server"
else
    npm run dev &
    VITE_PID=$!
fi

# Wait for services to be ready
print_status "Waiting for all services to be ready..."

# Wait for Ollama
if wait_for_service "$OLLAMA_BASE_URL" "Ollama server"; then
    print_success "Ollama server is running on $OLLAMA_BASE_URL"
else
    print_error "Failed to start Ollama server"
    cleanup
    exit 1
fi

# Wait for local API
if wait_for_service "http://127.0.0.1:8787" "Local API server"; then
    print_success "Local API server is running on http://127.0.0.1:8787"
else
    print_error "Failed to start local API server"
    cleanup
    exit 1
fi

# Wait for Vite dev server
if wait_for_service "http://127.0.0.1:8080" "Vite development server"; then
    print_success "Vite development server is running on http://127.0.0.1:8080"
else
    print_error "Failed to start Vite development server"
    cleanup
    exit 1
fi

print_success "All services are now running!"
echo ""
echo "Services:"
echo "  • Vite Dev Server: http://127.0.0.1:8080"
echo "  • Local API Server: http://127.0.0.1:8787"
echo "  • Ollama Server: $OLLAMA_BASE_URL"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep the script running and wait for user interrupt
wait
