#!/bin/bash

# Tickker Frontend Startup Script
# This script starts the Next.js frontend with Supabase integration

echo "🚀 Starting Tickker Frontend (Next.js + Supabase)..."

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
else
    echo "✅ Node.js dependencies found."
fi

# Check if .env.local file exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "   Please create a .env.local file with your Supabase credentials."
    echo "   See SUPABASE_MIGRATION_GUIDE.md for details."
    echo ""
fi

# Install Supabase client if not already installed
echo "🔧 Ensuring @supabase/supabase-js is installed..."
npm install @supabase/supabase-js --silent

# Start the development server
echo "🌟 Starting frontend development server on http://localhost:3000..."
echo "   Press Ctrl+C to stop the server"
echo ""
npm run dev