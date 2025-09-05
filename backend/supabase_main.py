from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import pandas as pd
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta
import os
import yfinance as yf
import uvicorn
from supabase_client import get_supabase_admin, get_supabase_user
from pydantic import BaseModel, EmailStr
import random
import string
from dotenv import load_dotenv

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Tickker Backend with Supabase...")
    print("🎯 Backend ready for connections!")
    yield
    # Shutdown (if needed)
    print("👋 Shutting down backend...")

app = FastAPI(title="Stock Portfolio Visualizer", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Load environment variables
load_dotenv()

# Global storage for processed data (temporary - will be moved to Supabase)
portfolio_data = {
    "transactions": [],
    "portfolio_history": [],
    "symbols": [],
    "price_cache": {}
}

# Pydantic models for request/response
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    is_public: Optional[bool] = None

class GroupCreate(BaseModel):
    name: str
    is_public: bool = True

class GroupJoin(BaseModel):
    code: str

class StockListAdd(BaseModel):
    symbol: str
    list_type: str  # 'owned', 'watch', 'wishlist'

class StockNoteCreate(BaseModel):
    symbol: str
    content: str
    labels: Optional[List[str]] = []

class PreferenceVoteCreate(BaseModel):
    symbol_a: str
    symbol_b: str
    winner: str

class GroupNoteCreate(BaseModel):
    symbol: str
    rating: int
    content: str

# Auth dependency
async def get_current_user(request: Request):
    """Extract user from Supabase JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        supabase = get_supabase_admin()
        user_response = supabase.auth.get_user(token)
        
        if user_response.user:
            return user_response.user
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# Optional auth dependency for some endpoints
async def get_current_user_optional(request: Request):
    """Extract user from Supabase JWT token (optional)"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# Helper functions
def generate_group_code() -> str:
    """Generate a unique 6-character group code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def get_user_client_with_token(request: Request):
    """Get Supabase client with user token"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        return get_supabase_user(token)
    return get_supabase_user()

# Routes
@app.get("/")
async def root():
    return {
        "message": "Tickker Portfolio API with Supabase",
        "version": "2.0.0",
        "status": "✨ Ready",
        "database": "Supabase",
        "docs": "/docs"
    }

@app.get("/api/me")
async def get_me(current_user = Depends(get_current_user)):
    """Get current user profile"""
    supabase = get_supabase_admin()
    
    # Get or create profile
    profile_response = supabase.table('profiles').select('*').eq('id', current_user.id).execute()
    
    if not profile_response.data:
        # Create profile if it doesn't exist
        profile_data = {
            'id': current_user.id,
            'email': current_user.email,
            'name': current_user.user_metadata.get('name', '') if current_user.user_metadata else ''
        }
        supabase.table('profiles').insert(profile_data).execute()
        return profile_data
    
    return profile_response.data[0]

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    """Upload and process portfolio CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read and process CSV
        content = await file.read()
        
        # Handle BOM and decode content
        text_content = content.decode('utf-8-sig')  # Handle BOM
        from io import StringIO
        
        # Find the header row that contains our expected columns
        lines = text_content.strip().split('\n')
        header_row_index = 0
        for i, line in enumerate(lines):
            if 'Run Date' in line and 'Action' in line and 'Symbol' in line:
                header_row_index = i
                break
        
        # Read CSV starting from the header row
        df = pd.read_csv(StringIO(text_content), skiprows=header_row_index)
        
        # Remove any rows that don't have proper transaction data
        # Filter out rows where 'Run Date' doesn't look like a date
        df = df[df['Run Date'].str.contains(r'\d{2}/\d{2}/\d{4}', na=False)].copy()
        
        # Log available columns for debugging
        print(f"Available columns: {list(df.columns)}")
        print(f"First few rows after filtering: {df.head()}")
        print(f"Total rows: {len(df)}")
        
        # Map Fidelity CSV columns to expected columns  
        column_mapping = {
            'Run Date': 'Date',
            'Price ($)': 'Price'
        }
        
        # Rename columns to match expected format
        df = df.rename(columns=column_mapping)
        
        # Validate required columns after mapping
        required_columns = ['Date', 'Action', 'Symbol', 'Quantity', 'Price']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}. Available columns: {list(df.columns)}"
            )
        
        # Clean and process data
        # Convert dates with error handling
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
        
        # Remove rows with invalid dates
        df = df.dropna(subset=['Date']).copy()
        
        # Normalize action types
        df['Action'] = df['Action'].apply(lambda x: 'BUY' if 'BOUGHT' in str(x).upper() else 
                                                   'SELL' if 'SOLD' in str(x).upper() else 
                                                   'DIVIDEND' if 'DIVIDEND' in str(x).upper() else str(x))
        
        # Filter out rows with invalid data (like dividends with 0 quantity)
        # Keep dividends but exclude them from position calculations
        df = df[df['Quantity'] != 0].copy()
        df = df.dropna(subset=['Date', 'Symbol', 'Quantity', 'Price']).copy()
        
        # Calculate amount
        df['Amount'] = df['Quantity'] * df['Price']
        
        # Store in Supabase
        supabase = get_supabase_admin()
        
        # Ensure user profile exists before inserting transactions
        try:
            profile_check = supabase.table('profiles').select('id').eq('id', current_user.id).execute()
            if not profile_check.data:
                # Create user profile if it doesn't exist
                profile_data = {
                    'id': current_user.id,
                    'email': current_user.email,
                    'name': current_user.user_metadata.get('name', '') if current_user.user_metadata else '',
                    'created_at': 'now()',
                    'updated_at': 'now()'
                }
                supabase.table('profiles').insert(profile_data).execute()
                print(f"Created profile for user {current_user.id}")
        except Exception as e:
            print(f"Error checking/creating profile: {e}")
        
        # Clear existing transactions for this user
        supabase.table('transactions').delete().eq('user_id', current_user.id).execute()
        
        # Insert new transactions
        transactions = []
        for _, row in df.iterrows():
            transaction = {
                'user_id': current_user.id,
                'date': row['Date'],
                'action': row['Action'],
                'symbol': row['Symbol'],
                'quantity': float(row['Quantity']),
                'price': float(row['Price']),
                'amount': float(row['Amount'])
            }
            transactions.append(transaction)
        
        if transactions:
            supabase.table('transactions').insert(transactions).execute()
        
        # Store in global cache for immediate use
        portfolio_data["transactions"] = transactions
        portfolio_data["symbols"] = df['Symbol'].unique().tolist()
        
        # Generate portfolio history
        portfolio_history = []
        running_positions = {}
        
        for _, row in df.iterrows():
            symbol = row['Symbol']
            quantity = row['Quantity']
            
            if row['Action'].upper() == 'BUY':
                running_positions[symbol] = running_positions.get(symbol, 0) + quantity
            elif row['Action'].upper() == 'SELL':
                running_positions[symbol] = running_positions.get(symbol, 0) - quantity
        
        # Calculate portfolio value over time - handle future dates
        start_date_str = df['Date'].min()
        end_date_str = df['Date'].max()
        
        # For dates in the future (like 2025), use current date for price lookups
        from datetime import datetime, date
        today = date.today()
        current_year = today.year
        
        # If CSV dates are in the future, adjust them to current year for price data
        if start_date_str.startswith(str(current_year + 1)):
            start_date_corrected = start_date_str.replace(str(current_year + 1), str(current_year))
            end_date_corrected = end_date_str.replace(str(current_year + 1), str(current_year))
        else:
            start_date_corrected = start_date_str
            end_date_corrected = end_date_str
        
        print(f"Date range for price lookup: {start_date_corrected} to {end_date_corrected}")
        
        # Generate portfolio history with price lookups
        dates = pd.date_range(start=start_date_corrected, end=end_date_corrected, freq='W')  # Weekly to avoid too many API calls
        
        for date in dates:
            date_str = date.strftime('%Y-%m-%d')
            total_value = 0
            
            for symbol, quantity in running_positions.items():
                if quantity > 0:
                    try:
                        stock = yf.Ticker(symbol)
                        # Get recent price data (use last 30 days to avoid future date issues)
                        hist = stock.history(period="30d")
                        if not hist.empty:
                            price = hist['Close'].iloc[-1]
                            total_value += quantity * price
                        else:
                            # Use last available price or estimate
                            total_value += quantity * 100  # Fallback price
                    except Exception as e:
                        print(f"Error fetching price for {symbol}: {e}")
                        total_value += quantity * 100  # Fallback price
            
            if total_value > 0:
                # Use original date from CSV for consistency
                original_date_index = len(portfolio_history)
                original_date = pd.date_range(start=start_date_str, end=end_date_str, freq='W')[min(original_date_index, len(pd.date_range(start=start_date_str, end=end_date_str, freq='W')) - 1)].strftime('%Y-%m-%d')
                portfolio_history.append({
                    'user_id': current_user.id,
                    'date': original_date,
                    'value': total_value
                })
        
        # Store portfolio history in Supabase
        if portfolio_history:
            # Clear existing history
            supabase.table('portfolio_history').delete().eq('user_id', current_user.id).execute()
            # Insert new history
            supabase.table('portfolio_history').insert(portfolio_history).execute()
        
        portfolio_data["portfolio_history"] = portfolio_history
        
        return {
            "message": "✅ Portfolio uploaded successfully",
            "transactions_count": len(transactions),
            "symbols_count": len(portfolio_data["symbols"]),
            "symbols": portfolio_data["symbols"]
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/api/portfolio/history")
async def get_portfolio_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get portfolio history"""
    supabase = get_supabase_admin()
    
    query = supabase.table('portfolio_history').select('*').eq('user_id', current_user.id)
    
    if start_date:
        query = query.gte('date', start_date)
    if end_date:
        query = query.lte('date', end_date)
    
    response = query.order('date').execute()
    
    return {"history": response.data}

@app.get("/api/portfolio/weights")
async def get_portfolio_weights(current_user = Depends(get_current_user)):
    """Get current portfolio weights"""
    supabase = get_supabase_admin()
    
    # Get all transactions for user
    transactions_response = supabase.table('transactions').select('*').eq('user_id', current_user.id).execute()
    transactions = transactions_response.data
    
    if not transactions:
        return {"weights": []}
    
    # Calculate current positions
    positions = {}
    for transaction in transactions:
        symbol = transaction['symbol']
        quantity = transaction['quantity']
        
        if transaction['action'].upper() == 'BUY':
            positions[symbol] = positions.get(symbol, 0) + quantity
        elif transaction['action'].upper() == 'SELL':
            positions[symbol] = positions.get(symbol, 0) - quantity
    
    # Filter out zero positions
    positions = {k: v for k, v in positions.items() if v > 0}
    
    # Get current prices and calculate values
    total_value = 0
    weights = []
    
    for symbol, shares in positions.items():
        try:
            stock = yf.Ticker(symbol)
            current_price = stock.history(period="1d")['Close'].iloc[-1]
            value = shares * current_price
            total_value += value
            
            weights.append({
                "symbol": symbol,
                "shares": shares,
                "price": current_price,
                "value": value
            })
        except:
            continue
    
    # Calculate percentages
    for weight in weights:
        weight["weight"] = (weight["value"] / total_value * 100) if total_value > 0 else 0
    
    return {"weights": weights}

@app.get("/api/portfolio/trades")
async def get_recent_trades(limit: int = 10, current_user = Depends(get_current_user)):
    """Get recent trades"""
    supabase = get_supabase_admin()
    
    response = supabase.table('transactions').select('*').eq('user_id', current_user.id).order('created_at', desc=True).limit(limit).execute()
    
    return {"trades": response.data}

# Groups endpoints
@app.post("/api/groups")
async def create_group(group_data: GroupCreate, current_user = Depends(get_current_user)):
    """Create a new investment group"""
    supabase = get_supabase_admin()
    
    try:
        code = generate_group_code()
        
        # Ensure code is unique
        while True:
            existing = supabase.table('groups').select('id').eq('code', code).execute()
            if not existing.data:
                break
            code = generate_group_code()
        
        group = {
            'name': group_data.name,
            'code': code,
            'owner_id': current_user.id,
            'is_public': group_data.is_public
        }
        
        response = supabase.table('groups').insert(group).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create group")
        
        created_group = response.data[0]
        
        # Add creator as member
        member = {
            'group_id': created_group['id'],
            'user_id': current_user.id,
            'role': 'owner'
        }
        member_response = supabase.table('group_members').insert(member).execute()
        if not member_response.data:
            print(f"Warning: Failed to add creator as member to group {created_group['id']}")
        
        return created_group
        
    except Exception as e:
        print(f"Error creating group: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create group: {str(e)}")

@app.post("/api/groups/join")
async def join_group(group_data: GroupJoin, current_user = Depends(get_current_user)):
    """Join a group by code"""
    supabase = get_supabase_admin()
    
    # Find group by code
    group_response = supabase.table('groups').select('*').eq('code', group_data.code).execute()
    
    if not group_response.data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = group_response.data[0]
    
    # Check if already a member
    existing_member = supabase.table('group_members').select('id').eq('group_id', group['id']).eq('user_id', current_user.id).execute()
    
    if existing_member.data:
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    # Add as member
    member = {
        'group_id': group['id'],
        'user_id': current_user.id,
        'role': 'member'
    }
    supabase.table('group_members').insert(member).execute()
    
    return {"ok": True, "id": group['id']}

@app.get("/api/groups")
async def get_user_groups(current_user = Depends(get_current_user)):
    """Get user's groups"""
    supabase = get_supabase_admin()
    
    try:
        print(f"Getting groups for user: {current_user.id}")
        
        # Use admin client with explicit service role to bypass RLS entirely
        admin_supabase = get_supabase_admin()
        
        # Get memberships directly with admin client (bypasses RLS)
        memberships_response = admin_supabase.table('group_members').select('group_id, role').eq('user_id', current_user.id).execute()
        print(f"Memberships query result: {memberships_response}")
        
        if not memberships_response.data:
            print("No memberships found")
            return {"groups": []}
        
        # Get all group IDs
        group_ids = [membership['group_id'] for membership in memberships_response.data]
        print(f"Found group IDs: {group_ids}")
        
        # Get group details with admin client (bypasses RLS)
        groups_response = admin_supabase.table('groups').select('*').in_('id', group_ids).execute()
        print(f"Groups query result: {groups_response}")
        
        if not groups_response.data:
            print("No groups found")
            return {"groups": []}
        
        # Combine with roles
        groups_with_roles = []
        for group in groups_response.data:
            membership = next((m for m in memberships_response.data if m['group_id'] == group['id']), None)
            role = membership['role'] if membership else 'member'
            group_with_role = {**group, 'role': role}
            groups_with_roles.append(group_with_role)
        
        print(f"Returning groups: {groups_with_roles}")
        return {"groups": groups_with_roles}
        
    except Exception as e:
        print(f"Error fetching user groups: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        # Return empty instead of error to prevent infinite loops
        return {"groups": []}

# Missing performance and comparison endpoints
@app.get("/api/performance")
async def get_performance_metrics(current_user = Depends(get_current_user)):
    """Get performance metrics - simplified version"""
    supabase = get_supabase_admin()
    
    # Get user's transactions to calculate basic performance
    transactions_response = supabase.table('transactions').select('*').eq('user_id', current_user.id).execute()
    
    if not transactions_response.data:
        return {
            "metrics": {},
            "twr": {"twr_pct": 0},
            "net": {"net_return": 0},
            "deposit_avg": {"avg_return": 0}
        }
    
    # Basic mock performance data - in production, calculate real metrics
    metrics = {
        '1M': {
            'portfolio_return': 2.5,
            'spy_return': 1.8,
            'outperformance': 0.7
        },
        '3M': {
            'portfolio_return': 8.2,
            'spy_return': 6.1,
            'outperformance': 2.1
        },
        '6M': {
            'portfolio_return': 12.5,
            'spy_return': 10.2,
            'outperformance': 2.3
        },
        '1Y': {
            'portfolio_return': 18.7,
            'spy_return': 15.4,
            'outperformance': 3.3
        }
    }
    
    return {
        "metrics": metrics,
        "twr": {"twr_pct": 18.7},
        "net": {"net_return": 16.2},
        "deposit_avg": {"avg_return": 17.5}
    }

@app.get("/api/performance/net")
async def get_performance_net(current_user = Depends(get_current_user)):
    """Get net performance - simplified version"""
    return {
        "net_return": 16.2,
        "total_deposits": 50000,
        "current_value": 58100,
        "absolute_gain": 8100
    }

@app.get("/api/comparison/spy")
async def get_spy_comparison(baseline_date: str = None, current_user = Depends(get_current_user)):
    """Get SPY comparison data - simplified version"""
    supabase = get_supabase_admin()
    
    # Get user's transactions
    transactions_response = supabase.table('transactions').select('*').eq('user_id', current_user.id).order('date').execute()
    
    if not transactions_response.data:
        return {"comparison": []}
    
    # Generate mock comparison data based on transaction dates
    transactions = transactions_response.data
    start_date = min(t['date'] for t in transactions)
    end_date = max(t['date'] for t in transactions)
    
    # Create basic comparison data points
    comparison_data = []
    from datetime import datetime, timedelta
    
    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
    
    # Generate weekly data points
    current_dt = start_dt
    portfolio_value = 10000  # Starting value
    spy_value = 10000
    
    while current_dt <= end_dt:
        # Mock growth rates
        portfolio_growth = 1 + (0.15 / 52)  # 15% annual return
        spy_growth = 1 + (0.12 / 52)  # 12% annual SPY return
        
        portfolio_value *= portfolio_growth
        spy_value *= spy_growth
        
        comparison_data.append({
            "date": current_dt.strftime('%Y-%m-%d'),
            "portfolio": round(portfolio_value, 2),
            "spy": round(spy_value, 2),
            "portfolio_normalized": round((portfolio_value / 10000) * 100, 2),
            "spy_normalized": round((spy_value / 10000) * 100, 2)
        })
        
        current_dt += timedelta(weeks=1)
    
    return {"comparison": comparison_data}

# Group management endpoints
@app.get("/api/groups/{group_id}/leaderboard")
async def get_group_leaderboard(group_id: int, current_user = Depends(get_current_user)):
    """Get group leaderboard"""
    supabase = get_supabase_admin()
    
    # Check if user is member of this group
    membership = supabase.table('group_members').select('*').eq('group_id', group_id).eq('user_id', current_user.id).execute()
    
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get all members of the group with their performance
    members_response = supabase.table('group_members').select('user_id').eq('group_id', group_id).execute()
    
    if not members_response.data:
        return {"leaderboard": []}
    
    leaderboard = []
    for member in members_response.data:
        user_id = member['user_id']
        
        # Get user profile
        profile = supabase.table('profiles').select('name, email').eq('id', user_id).execute()
        user_name = profile.data[0]['name'] if profile.data else "Unknown"
        
        # Get latest portfolio value (mock data for now)
        portfolio_value = 10000 + (hash(user_id) % 50000)  # Mock portfolio value
        performance = (hash(user_id) % 30) - 15  # Mock performance -15% to +15%
        
        leaderboard.append({
            "user_id": user_id,
            "name": user_name,
            "portfolio_value": portfolio_value,
            "performance": performance
        })
    
    # Sort by performance
    leaderboard.sort(key=lambda x: x['performance'], reverse=True)
    
    return {"leaderboard": leaderboard}

@app.get("/api/groups/{group_id}/members")
async def get_group_members(group_id: int, current_user = Depends(get_current_user)):
    """Get group members"""
    supabase = get_supabase_admin()
    
    # Check if user is member of this group
    membership = supabase.table('group_members').select('*').eq('group_id', group_id).eq('user_id', current_user.id).execute()
    
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get all members
    members_response = supabase.table('group_members').select('user_id, role, joined_at').eq('group_id', group_id).execute()
    
    members = []
    for member in members_response.data:
        user_id = member['user_id']
        profile = supabase.table('profiles').select('name, email').eq('id', user_id).execute()
        
        members.append({
            "user_id": user_id,
            "name": profile.data[0]['name'] if profile.data else "Unknown",
            "role": member['role'],
            "joined_at": member['joined_at']
        })
    
    return {"members": members}

@app.get("/api/groups/{group_id}")
async def get_group_details(group_id: int, current_user = Depends(get_current_user)):
    """Get group details"""
    supabase = get_supabase_admin()
    
    # Check if user is member of this group
    membership = supabase.table('group_members').select('*').eq('group_id', group_id).eq('user_id', current_user.id).execute()
    
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get group details
    group_response = supabase.table('groups').select('*').eq('id', group_id).execute()
    
    if not group_response.data:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = group_response.data[0]
    
    # Get member count
    member_count = supabase.table('group_members').select('id', count='exact').eq('group_id', group_id).execute()
    group['member_count'] = member_count.count if member_count.count else 0
    
    return group

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)