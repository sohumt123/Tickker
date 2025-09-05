#!/usr/bin/env python3
"""
Setup script for Tickker SupaBase migration
"""
import os
import sys

def create_env_file():
    """Create .env file with Supabase configuration"""
    
    print("🔧 Setting up Supabase environment configuration...")
    
    # TickkerInvest project details
    supabase_url = "https://pvxjdipdmpbualddelbj.supabase.co"
    supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2eGpkaXBkbXBidWFsZGRlbGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MzU4NDksImV4cCI6MjA3MjMxMTg0OX0.umG4sdmdcwWr3vsUvuHNDTTQsTyfL73D5ZpaosuGSH8"
    
    env_content = f"""# Supabase Configuration for TickkerInvest Project
SUPABASE_URL={supabase_url}
SUPABASE_ANON_KEY={supabase_anon_key}

# You need to add your service key from:
# https://supabase.com/dashboard/project/pvxjdipdmpbualddelbj/settings/api
SUPABASE_SERVICE_KEY=your_service_key_here

# Instructions:
# 1. Go to: https://supabase.com/dashboard/project/pvxjdipdmpbualddelbj/settings/api
# 2. Copy the "service_role" secret key
# 3. Replace "your_service_key_here" above with your actual service key
"""

    # Create backend .env file
    backend_env_path = "backend/.env"
    os.makedirs(os.path.dirname(backend_env_path), exist_ok=True)
    
    with open(backend_env_path, 'w') as f:
        f.write(env_content)
    
    print(f"✅ Created {backend_env_path}")
    
    # Create frontend .env.local file
    frontend_env_content = f"""# Supabase Configuration for Frontend
NEXT_PUBLIC_SUPABASE_URL={supabase_url}
NEXT_PUBLIC_SUPABASE_ANON_KEY={supabase_anon_key}

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
"""
    
    frontend_env_path = "frontend/.env.local"
    os.makedirs(os.path.dirname(frontend_env_path), exist_ok=True)
    
    with open(frontend_env_path, 'w') as f:
        f.write(frontend_env_content)
    
    print(f"✅ Created {frontend_env_path}")
    
    print("\n⚠️  IMPORTANT: You still need to:")
    print("1. Get your service key from: https://supabase.com/dashboard/project/pvxjdipdmpbualddelbj/settings/api")
    print("2. Replace 'your_service_key_here' in backend/.env with your actual service key")
    print("3. The service key is the 'service_role' secret key, NOT the anon key")

def main():
    print("🚀 Tickker Supabase Setup")
    print("=" * 50)
    
    # Change to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    try:
        create_env_file()
        print("\n✨ Setup completed!")
        print("\nNext steps:")
        print("1. Update your service key in backend/.env")
        print("2. Start the backend: cd backend && python supabase_main.py")
        print("3. Start the frontend: cd frontend && npm run dev")
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()