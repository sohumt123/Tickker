"""
Supabase client configuration for Tickker Portfolio Application
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_admin() -> Client:
    """Get Supabase client with admin privileges (service role key)"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables")
    
    return create_client(url, key)

def get_supabase_user(access_token: str = None) -> Client:
    """Get Supabase client for user operations (anon key with optional user token)"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")
    
    client = create_client(url, key)
    
    # Set the user's access token if provided
    if access_token:
        client.auth.set_session(access_token, "")
    
    return client