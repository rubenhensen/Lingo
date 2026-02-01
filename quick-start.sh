#!/bin/bash

echo "========================================="
echo "  Lingo TV Show Format - Quick Start"
echo "========================================="
echo ""

# Step 1: Create config files
echo "Step 1: Creating config files..."
if [ ! -f "api/config.php" ]; then
    cp api/config.example.php api/config.php
    echo "✓ Created api/config.php"
else
    echo "✓ api/config.php already exists"
fi

if [ ! -f "website/js/config.js" ]; then
    # Update API_URL to use port 8000 for API and localhost for relative paths
    echo 'const API_URL = "http://localhost:8000/";' > website/js/config.js
    echo "✓ Created website/js/config.js"
else
    echo "✓ website/js/config.js already exists"
fi

# Step 2: Install composer dependencies
echo ""
echo "Step 2: Installing PHP dependencies..."
if [ ! -d "api/vendor" ]; then
    cd api
    if command -v composer &> /dev/null; then
        composer install
        cd ..
        echo "✓ Composer dependencies installed"
    else
        echo "⚠ Composer not found. Please install composer first:"
        echo "  https://getcomposer.org/download/"
        exit 1
    fi
else
    echo "✓ Dependencies already installed"
fi

# Step 3: Words loaded from CSV
echo ""
echo "Step 3: Loading words from CSV files"
echo "✓ Words will be loaded from parsers/ directory"
echo "  (No database setup needed!)"
echo ""

# Step 4: Start servers
echo ""
echo "========================================="
echo "  Starting Servers..."
echo "========================================="
echo ""
echo "Starting API server on http://localhost:8000"
echo "Starting Website on http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Kill any existing PHP servers on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start API server in background
cd api
php -S localhost:8000 -t . index.php > ../api-server.log 2>&1 &
API_PID=$!
cd ..

# Start website server in background
cd website
php -S localhost:8001 -t . > ../web-server.log 2>&1 &
WEB_PID=$!
cd ..

# Wait a moment for servers to start
sleep 2

# Check if servers started successfully
if ps -p $API_PID > /dev/null && ps -p $WEB_PID > /dev/null; then
    echo "✓ Servers started successfully!"
    echo ""
    echo "========================================="
    echo "  🎮 OPEN YOUR BROWSER TO:"
    echo "     http://localhost:8001"
    echo "========================================="
    echo ""
    echo "Logs:"
    echo "  API: api-server.log"
    echo "  Web: web-server.log"
    echo ""

    # Wait for user interrupt
    trap "echo ''; echo 'Stopping servers...'; kill $API_PID $WEB_PID 2>/dev/null; echo 'Servers stopped.'; exit 0" INT

    # Keep script running
    while true; do
        sleep 1
    done
else
    echo "✗ Failed to start servers. Check the log files for errors."
    kill $API_PID $WEB_PID 2>/dev/null
    exit 1
fi
