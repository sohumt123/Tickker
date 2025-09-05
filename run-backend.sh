#!/bin/bash

# Tickker Backend Startup Script
# This script starts the Supabase-powered FastAPI backend

echo "🚀 Starting Tickker Backend (Supabase)..."

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "✅ Virtual environment created."
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Please create a .env file with your Supabase credentials."
    echo "   See SUPABASE_MIGRATION_GUIDE.md for details."
    echo ""
fi

# Start the Supabase backend
echo "🌟 Starting Supabase backend on http://localhost:8000..."
echo "   Press Ctrl+C to stop the server"
echo ""
python supabase_main.py