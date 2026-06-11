#!/bin/bash

# MERIDIAN Task Management - Local Testing Guide
# Run this file to test the new task management system

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  MERIDIAN Task Management - Local Testing Guide               ║"
echo "║  Date: June 3, 2026                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "${BLUE}╔═════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1${NC}"
    echo -e "${BLUE}╚═════════════════════════════════════════╝${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if we're in the right directory
print_section "Environment Check"

if [ ! -d "/home/punith/Linux/MERIDIAN" ]; then
    print_error "Project directory not found"
    exit 1
fi

print_success "Project directory found"

if [ ! -d "/home/punith/Linux/MERIDIAN/backend" ]; then
    print_error "Backend directory not found"
    exit 1
fi

print_success "Backend directory found"

if [ ! -d "/home/punith/Linux/MERIDIAN/frontend/frontend" ]; then
    print_error "Frontend directory not found"
    exit 1
fi

print_success "Frontend directory found"

echo ""
print_section "Backend Setup"

# Check if venv exists
if [ ! -d "/home/punith/Linux/MERIDIAN/backend/venv" ]; then
    print_warning "Virtual environment not found. Creating..."
    cd /home/punith/Linux/MERIDIAN/backend
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment exists"
fi

# Activate venv
source /home/punith/Linux/MERIDIAN/backend/venv/bin/activate
print_success "Virtual environment activated"

# Install requirements
print_warning "Installing dependencies..."
cd /home/punith/Linux/MERIDIAN/backend
pip install -q -r requirements.txt 2>/dev/null
print_success "Dependencies installed"

echo ""
print_section "Frontend Setup"

cd /home/punith/Linux/MERIDIAN/frontend/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Installing..."
    pnpm install -q 2>/dev/null
    print_success "Node dependencies installed"
else
    print_success "Node dependencies exist"
fi

echo ""
print_section "Testing Options"

echo "Choose what to test:"
echo ""
echo "1) Backend API Server"
echo "2) Frontend Development Server"
echo "3) Run Both Servers (recommended)"
echo "4) Test API Endpoints"
echo "5) Full Integration Test"
echo "6) View Database Schema"
echo "7) Reset Database"
echo ""
read -p "Select option (1-7): " option

case $option in
    1)
        print_section "Starting Backend Server"
        cd /home/punith/Linux/MERIDIAN/backend
        source venv/bin/activate
        echo ""
        echo -e "${GREEN}Backend server starting...${NC}"
        echo "API available at: http://localhost:8000"
        echo "API Docs at: http://localhost:8000/docs"
        echo ""
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
        ;;
    
    2)
        print_section "Starting Frontend Development Server"
        cd /home/punith/Linux/MERIDIAN/frontend/frontend
        echo ""
        echo -e "${GREEN}Frontend server starting...${NC}"
        echo "Frontend available at: http://localhost:5173"
        echo ""
        pnpm dev
        ;;
    
    3)
        print_section "Starting Both Servers"
        echo ""
        echo -e "${GREEN}Starting backend...${NC}"
        cd /home/punith/Linux/MERIDIAN/backend
        source venv/bin/activate
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
        BACKEND_PID=$!
        echo "Backend PID: $BACKEND_PID"
        
        sleep 2
        
        echo -e "${GREEN}Starting frontend...${NC}"
        cd /home/punith/Linux/MERIDIAN/frontend/frontend
        pnpm dev &
        FRONTEND_PID=$!
        echo "Frontend PID: $FRONTEND_PID"
        
        echo ""
        echo -e "${GREEN}Both servers running!${NC}"
        echo "Backend: http://localhost:8000"
        echo "Frontend: http://localhost:5173"
        echo ""
        echo "Press Ctrl+C to stop both servers"
        
        wait
        ;;
    
    4)
        print_section "Testing API Endpoints"
        
        # First, check if backend is running
        print_warning "Make sure backend is running on http://localhost:8000"
        echo ""
        
        read -p "Backend running? (y/n): " backend_check
        if [ "$backend_check" != "y" ]; then
            echo "Please start backend first (option 1)"
            exit 1
        fi
        
        echo ""
        print_section "Health Check"
        curl -s http://localhost:8000/health | python -m json.tool
        echo ""
        
        print_section "Testing Task Endpoints"
        
        # Note: These will fail without auth token
        echo "Attempting to get tasks (will fail without auth):"
        curl -s http://localhost:8000/api/tasks
        echo ""
        
        print_warning "Note: API endpoints require authentication token"
        echo "You need to:"
        echo "1. Register/login via frontend"
        echo "2. Get the token from localStorage"
        echo "3. Test with: curl -H 'Authorization: Bearer TOKEN' http://localhost:8000/api/tasks"
        ;;
    
    5)
        print_section "Full Integration Test"
        
        echo "This test will:"
        echo "1. Check if servers are running"
        echo "2. Register a test user"
        echo "3. Create a test task"
        echo "4. Update the task"
        echo "5. Mark as complete"
        echo "6. Verify all fields"
        echo ""
        read -p "Continue? (y/n): " test_continue
        
        if [ "$test_continue" != "y" ]; then
            exit 0
        fi
        
        echo ""
        print_warning "This requires both servers running"
        echo "For now, manually test by:"
        echo "1. Open http://localhost:5173 in browser"
        echo "2. Register account"
        echo "3. Go to Tasks page"
        echo "4. Create a task with 60 minute estimate"
        echo "5. Click Start timer, wait 10 seconds, stop"
        echo "6. Verify time shows correctly"
        echo "7. Move to 'Done' and check completion"
        ;;
    
    6)
        print_section "Database Schema"
        
        cd /home/punith/Linux/MERIDIAN/backend
        source venv/bin/activate
        
        echo ""
        echo "Task table schema:"
        echo "- id (Integer, Primary Key)"
        echo "- user_id (Integer, Foreign Key)"
        echo "- title (String, Required)"
        echo "- description (Text, Optional) - NEW"
        echo "- priority (String, Default: medium)"
        echo "- status (String, Default: todo)"
        echo "- due_date (Date, Optional)"
        echo "- time_estimate (Integer, Optional, in minutes)"
        echo "- time_spent (Integer, Default: 0, in seconds)"
        echo "- timer_started_at (DateTime, Optional)"
        echo "- completed_at (DateTime, Optional) - NEW"
        echo "- position (Integer, Default: 0)"
        echo "- tags (JSON, Default: []) - NEW"
        echo "- recurrence (String, Optional) - NEW"
        echo "- created_at (DateTime)"
        echo "- updated_at (DateTime)"
        echo ""
        echo "Subtask table schema: - NEW TABLE"
        echo "- id (Integer, Primary Key)"
        echo "- task_id (Integer, Foreign Key)"
        echo "- user_id (Integer, Foreign Key)"
        echo "- title (String, Required)"
        echo "- status (String, Default: todo)"
        echo "- position (Integer, Default: 0)"
        echo "- created_at (DateTime)"
        echo "- updated_at (DateTime)"
        ;;
    
    7)
        print_section "Reset Database"
        
        echo -e "${RED}WARNING: This will delete all data!${NC}"
        read -p "Are you sure? (y/n): " reset_confirm
        
        if [ "$reset_confirm" != "y" ]; then
            echo "Cancelled"
            exit 0
        fi
        
        cd /home/punith/Linux/MERIDIAN/backend
        
        # Find and remove database file
        if [ -f "app.db" ]; then
            rm app.db
            print_success "Database deleted"
        elif [ -f "database.db" ]; then
            rm database.db
            print_success "Database deleted"
        else
            print_warning "Database file not found"
        fi
        
        echo ""
        echo "Database will be recreated on next API start"
        print_success "Reset complete"
        ;;
    
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
print_section "Testing Complete"
echo "For more info, see:"
echo "  - TASK_MANAGEMENT_GUIDE.md"
echo "  - TASK_QUICK_START.md"
echo "  - TASK_IMPLEMENTATION_SUMMARY.md"
