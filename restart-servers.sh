#!/bin/bash

echo "Stopping existing servers..."
# Kill any existing PHP servers on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null

sleep 1

echo "Starting servers..."

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
    echo "API PID: $API_PID"
    echo "Web PID: $WEB_PID"
    echo ""
    echo "To stop: kill $API_PID $WEB_PID"
else
    echo "✗ Failed to start servers. Check log files."
    kill $API_PID $WEB_PID 2>/dev/null
    exit 1
fi
