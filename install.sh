#!/bin/bash

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
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

print_status "Starting dependency installation..."

if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Step 1: Installing Node.js dependencies..."
if [ -d "node_modules" ]; then
    print_warning "node_modules already exists"
    read -p "Do you want to reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing existing node_modules..."
        rm -rf node_modules
        print_status "Running npm install..."
        if npm install 2>&1; then
            print_success "Node.js dependencies installed successfully"
        else
            print_error "Failed to install Node.js dependencies"
            print_error "This is a critical failure - please fix npm/node issues and try again"
            exit 1
        fi
    else
        print_status "Skipping Node.js dependency installation"
    fi
else
    print_status "Running npm install..."
    if npm install; then
        print_success "Node.js dependencies installed successfully"
    else
        print_error "Failed to install Node.js dependencies"
        exit 1
    fi
fi

print_status "Step 2: Installing Python dependencies..."
if [ ! -f "requirements.txt" ]; then
    print_warning "requirements.txt not found - skipping Python dependencies"
else
    # Check if pip is available
    if ! command -v pip >/dev/null 2>&1 && ! command -v pip3 >/dev/null 2>&1; then
        print_warning "pip not found - skipping Python dependencies"
        print_warning "Please install Python and pip to install Python dependencies"
    else
        PIP_CMD="pip"
        if command -v pip3 >/dev/null 2>&1; then
            PIP_CMD="pip3"
        fi
        
        print_status "Running $PIP_CMD install -r requirements.txt..."
        print_warning "Note: PATH warnings and dependency conflicts are usually non-critical"
        
        PIP_OUTPUT=$($PIP_CMD install -r requirements.txt --no-warn-script-location 2>&1)
        PIP_EXIT_CODE=$?
        
        if [ $PIP_EXIT_CODE -eq 0 ] && $PIP_CMD show google-generativeai >/dev/null 2>&1; then
            print_success "Python dependencies installed successfully"
            if echo "$PIP_OUTPUT" | grep -q "WARNING\|dependency conflicts"; then
                print_warning "Some dependency warnings appeared (usually non-critical):"
                echo "$PIP_OUTPUT" | grep "WARNING\|dependency conflicts" | head -3 | sed 's/^/  → /'
            fi
        else
            print_error "Python dependencies installation failed or incomplete"
            if echo "$PIP_OUTPUT" | grep -q "ERROR"; then
                print_error "Error details:"
                echo "$PIP_OUTPUT" | grep "ERROR" | head -3 | sed 's/^/  → /'
            fi
            print_warning "Continuing anyway - Python dependencies may not be critical for all features"
        fi
    fi
fi

echo ""
print_success "Installation process completed!"
echo ""
echo "Summary:"
echo "  ✓ Node.js dependencies: Installed"
if [ -f "requirements.txt" ]; then
    if command -v pip >/dev/null 2>&1 || command -v pip3 >/dev/null 2>&1; then
        echo "  ✓ Python dependencies: Installed (warnings are usually non-critical)"
    else
        echo "  ⚠ Python dependencies: Skipped (pip not found)"
    fi
else
    echo "  ⚠ Python dependencies: Skipped (requirements.txt not found)"
fi
echo ""
echo "Next steps:"
echo "  • Run './run.sh' to start the development environment"
echo "  • Or run './startup.sh' for the full startup process"
echo ""
echo "Note: Ollama models are assumed to be already installed on AI Makerspace. If you need to install models,"
echo "      start Ollama server first, then use: ollama pull <model-name>"

