#!/bin/bash

# Deployment script for AI Slate
# This script builds the frontend and starts the FastAPI server

set -e  # Exit on any error

echo "🚀 Starting AI Slate deployment..."

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: main.py not found. Please run this script from the project root."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found."
    exit 1
fi

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend dependencies already installed"
fi

# Build the frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Check if build was successful
if [ ! -d "frontend/build" ]; then
    echo "❌ Error: Frontend build failed. Build directory not found."
    exit 1
fi

echo "✅ Frontend built successfully"

# Start the FastAPI server
echo "🌟 Starting FastAPI server..."
echo "📱 Frontend will be served at: http://localhost:8000"
echo "🔌 WebSocket endpoint: ws://localhost:8000/ws/{session_id}"
echo "❤️  Health check: http://localhost:8000/health"

uv run python main.py
