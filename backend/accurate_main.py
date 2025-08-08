from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import os
import yfinance as yf
import uvicorn
from sqlmodel import SQLModel, Field, Session, create_engine, select
import random
import string
from passlib.context import CryptContext
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

app = FastAPI(title="Stock Portfolio Visualizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Load environment variables
load_dotenv()

# Global storage for processed data
portfolio_data = {
    "transactions": [],
    "portfolio_history": [],
    "symbols": [],
    "price_cache": {}
}

# =====================
# Auth & Persistence
# =====================

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio.db")
# For SQLite, allow access across threads in the ASGI server
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, echo=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    name: str | None = None
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionRecord(SQLModel, table=True):
    __tablename__ = "transactions"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    date: str
    action: str
    symbol: str
    quantity: float
    price: float
    amount: float


class PortfolioHistoryRecord(SQLModel, table=True):
    __tablename__ = "portfolio_history"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    date: str
    total_value: float
    spy_price: float | None = None
    positions_json: str = Field(default="[]")


class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    display_name: str | None = None
    is_public: bool = Field(default=False)
    share_performance_only: bool = Field(default=False)
    anonymize_symbols: bool = Field(default=False)


class Group(SQLModel, table=True):
    __tablename__ = "groups"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    code: str = Field(index=True)
    owner_id: int = Field(index=True)
    is_public: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(index=True)
    user_id: int = Field(index=True)
    role: str = Field(default="member")
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    created_at: datetime


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    with Session(engine) as session:
        yield session


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise credentials_exception
    return user


@app.on_event("startup")
def on_startup_event():
    create_db_and_tables()

def _parse_number(value: Any) -> float:
    """Parse numbers that may contain commas, dollar signs, or parentheses negatives."""
    try:
        if pd.isna(value):
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        s = str(value).strip()
        if s == "":
            return 0.0
        # Parentheses indicate negative numbers in many broker CSVs
        negative = False
        if s.startswith("(") and s.endswith(")"):
            negative = True
            s = s[1:-1]
        # Remove currency/commas/whitespace
        s = s.replace("$", "").replace(",", "").replace("+", "")
        num = float(s)
        return -num if negative else num
    except Exception:
        return 0.0

def _parse_date(value: Any) -> datetime:
    """Best-effort date parsing for both Fidelity and Schwab formats.
    Always returns a valid datetime; falls back to now() if parsing fails.
    """
    if isinstance(value, datetime):
        return value
    try:
        ts = pd.to_datetime(value, errors="coerce")
        # If parsing failed, ts will be NaT
        if ts is pd.NaT or pd.isna(ts):
            raise ValueError("Invalid date")
        # Convert pandas Timestamp/array-like to python datetime
        if hasattr(ts, "to_pydatetime"):
            return ts.to_pydatetime()
        return datetime.fromtimestamp(pd.Timestamp(ts).timestamp())
    except Exception:
        return datetime.now()

def get_real_stock_data(symbol: str, start_date: datetime, end_date: datetime) -> Dict[str, float]:
    """Get real historical stock prices using yfinance"""
    try:
        # Cache key
        cache_key = f"{symbol}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        
        if cache_key in portfolio_data["price_cache"]:
            return portfolio_data["price_cache"][cache_key]
        
        print(f"Fetching real data for {symbol} from {start_date.date()} to {end_date.date()}")
        
        # Fetch data using yfinance
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date + timedelta(days=1))
        
        if hist.empty:
            print(f"No data found for {symbol}")
            return {}
        
        # Convert to our format
        prices = {}
        for date, row in hist.iterrows():
            date_str = date.strftime('%Y-%m-%d')
            prices[date_str] = float(row['Close'])
        
        # Cache the result
        portfolio_data["price_cache"][cache_key] = prices
        print(f"Got {len(prices)} days of data for {symbol}")
        
        return prices
        
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return {}

def get_trading_day(date_str: str) -> str:
    """Get the nearest prior trading day for a given date"""
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        
        # Check if it's a weekend, move to Friday
        while target_date.weekday() > 4:  # Monday=0, Sunday=6
            target_date -= timedelta(days=1)
        
        return target_date.strftime('%Y-%m-%d')
    except Exception as e:
        print(f"Error getting trading day for {date_str}: {e}")
        return date_str

def validate_baseline_date(baseline_date: str, portfolio_start_date: str) -> str:
    """Validate and adjust baseline date"""
    try:
        baseline_dt = datetime.strptime(baseline_date, '%Y-%m-%d')
        portfolio_start_dt = datetime.strptime(portfolio_start_date, '%Y-%m-%d')
        
        # Allow baseline before portfolio start for "what if" analysis
        # Don't allow baseline too far back (limit to 10 years for performance)
        ten_years_ago = datetime.now() - timedelta(days=10*365)
        if baseline_dt < ten_years_ago:
            return ten_years_ago.strftime('%Y-%m-%d')
        
        # Don't allow baseline too far in the future
        if baseline_dt > datetime.now():
            return portfolio_start_date
        
        # Get nearest trading day
        return get_trading_day(baseline_date)
    except Exception as e:
        print(f"Error validating baseline date {baseline_date}: {e}")
        return portfolio_start_date

def rebuild_portfolio_history():
    """Rebuild portfolio history from transactions using REAL stock prices"""
    if not portfolio_data["transactions"]:
        return
    
    print("Rebuilding portfolio history with REAL stock prices...")
    
    # Sort transactions by date
    sorted_transactions = sorted(portfolio_data["transactions"], key=lambda x: x['date'])
    
    start_date = datetime.strptime(sorted_transactions[0]['date'], '%Y-%m-%d')
    end_date = datetime.now()
    
    # Calculate final positions from all transactions
    final_positions = {}
    
    for trans in sorted_transactions:
        symbol = trans['symbol']
        if symbol and symbol != 'Cash':
            if symbol not in final_positions:
                final_positions[symbol] = 0
            
            if 'BOUGHT' in trans['action'] or 'Buy' in trans['action']:
                final_positions[symbol] += trans['quantity']
            elif 'SOLD' in trans['action'] or 'Sell' in trans['action']:
                final_positions[symbol] -= abs(trans['quantity'])
            elif 'REINVESTMENT' in trans['action']:
                final_positions[symbol] += trans['quantity']
    
    # Remove positions with 0 or negative shares
    final_positions = {k: v for k, v in final_positions.items() if v > 0}
    
    print(f"Final positions: {final_positions}")
    
    # Get REAL historical price data for all symbols
    price_data = {}
    symbols_to_fetch = list(final_positions.keys()) + ['SPY']
    
    for symbol in symbols_to_fetch:
        prices = get_real_stock_data(symbol, start_date, end_date)
        if prices:
            price_data[symbol] = prices
        else:
            print(f"Warning: Could not get real data for {symbol}")
    
    if not price_data:
        print("ERROR: Could not fetch any real price data!")
        return
    
    # Build portfolio history day by day
    portfolio_history = []
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        
        # Skip weekends for stock data
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue
        
        total_value = 0
        positions_detail = []
        
        # Calculate portfolio value using REAL prices
        for symbol, shares in final_positions.items():
            if symbol in price_data:
                # Get the most recent price at or before this date
                price = None
                check_date = current_date
                
                while price is None and check_date >= start_date:
                    check_date_str = check_date.strftime('%Y-%m-%d')
                    if check_date_str in price_data[symbol]:
                        price = price_data[symbol][check_date_str]
                        break
                    check_date -= timedelta(days=1)
                
                if price and price > 0:
                    value = shares * price
                    total_value += value
                    positions_detail.append({
                        'symbol': symbol,
                        'shares': shares,
                        'price': price,
                        'value': value
                    })
        
        # Get SPY price
        spy_price = None
        if 'SPY' in price_data:
            check_date = current_date
            while spy_price is None and check_date >= start_date:
                check_date_str = check_date.strftime('%Y-%m-%d')
                if check_date_str in price_data['SPY']:
                    spy_price = price_data['SPY'][check_date_str]
                    break
                check_date -= timedelta(days=1)
        
        if total_value > 0:  # Only add days where we have valid data
            portfolio_history.append({
                'date': date_str,
                'total_value': round(total_value, 2),
                'spy_price': spy_price or 450.0,
                'positions': positions_detail
            })
        
        current_date += timedelta(days=1)
    
    portfolio_data["portfolio_history"] = portfolio_history
    print(f"Built portfolio history with {len(portfolio_history)} days of REAL data")


def _get_or_create_profile(session: Session, user_id: int) -> UserProfile:
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile

@app.get("/")
async def root():
    return {"message": "Stock Portfolio Visualizer API with REAL DATA", "version": "2.0.0"}

class ProfileUpdate(BaseModel):
    display_name: str | None = None
    is_public: bool | None = None
    share_performance_only: bool | None = None
    anonymize_symbols: bool | None = None


class GroupCreate(BaseModel):
    name: str
    is_public: bool = True


class GroupJoin(BaseModel):
    code: str

@app.post("/api/auth/register", response_model=UserResponse)
async def register(payload: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=str(payload.email).lower(), name=payload.name or "", password_hash=get_password_hash(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at)


@app.post("/api/auth/login")
async def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == str(payload.email).lower())).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "name": user.name}}


@app.get("/api/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, email=current_user.email, name=current_user.name, created_at=current_user.created_at)

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...), current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Read with all columns as strings to preserve formatting (e.g., $1,234.56)
        df = pd.read_csv(pd.io.common.StringIO(contents.decode('utf-8')), dtype=str).fillna("")

        # Detect schema
        is_fidelity = all(col in df.columns for col in ['Run Date', 'Action', 'Symbol'])
        is_schwab = all(col in df.columns for col in ['Date', 'Action', 'Symbol']) and (
            'Amount' in df.columns or 'Amount ($)' in df.columns
        )

        if not (is_fidelity or is_schwab):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported CSV format. Expected Fidelity columns ['Run Date','Action','Symbol'] "
                    "or Schwab columns ['Date','Action','Symbol','Amount']."
                ),
            )

        transactions: List[Dict[str, Any]] = []
        symbols = set()

        if is_fidelity:
            for _, row in df.iterrows():
                symbol = str(row.get('Symbol', '')).strip()
                if symbol == "":
                    continue
                run_date = row.get('Run Date', '')
                settle_date = row.get('Settlement Date', '') if 'Settlement Date' in df.columns else ""
                date_dt = _parse_date(settle_date or run_date)
                transaction = {
                    'date': date_dt.strftime('%Y-%m-%d'),
                    'action': str(row.get('Action', '')).strip(),
                    'symbol': symbol,
                    'quantity': _parse_number(row.get('Quantity', '')),
                    'price': _parse_number(row.get('Price ($)', '')),
                    'amount': _parse_number(row.get('Amount ($)', '')),
                }
                transactions.append(transaction)
                symbols.add(symbol)
        else:  # Schwab
            # Normalize possible column name variants
            amount_col = 'Amount' if 'Amount' in df.columns else 'Amount ($)'
            price_col = 'Price' if 'Price' in df.columns else 'Price ($)'
            qty_col = 'Quantity' if 'Quantity' in df.columns else 'Qty'

            for _, row in df.iterrows():
                symbol = str(row.get('Symbol', '')).strip()
                # Keep cash movements too for completeness (symbol may be empty)
                action = str(row.get('Action', '')).strip()
                date_dt = _parse_date(row.get('Date', ''))
                transaction = {
                    'date': date_dt.strftime('%Y-%m-%d'),
                    'action': action,
                    'symbol': symbol,
                    'quantity': _parse_number(row.get(qty_col, '')),
                    'price': _parse_number(row.get(price_col, '')),
                    'amount': _parse_number(row.get(amount_col, '')),
                }
                # Only index symbols that look like tickers
                if symbol:
                    symbols.add(symbol)
                transactions.append(transaction)
        
        # Store the data globally (in-memory for current session)
        portfolio_data["transactions"] = transactions
        portfolio_data["symbols"] = list(symbols)

        # Persist raw transactions to DB for this user
        # Clear old records for idempotency
        session.exec(select(TransactionRecord).where(TransactionRecord.user_id == current_user.id))
        session.query(TransactionRecord).filter(TransactionRecord.user_id == current_user.id).delete()
        session.commit()
        to_insert = [
            TransactionRecord(
                user_id=current_user.id,
                date=t['date'],
                action=t['action'],
                symbol=t['symbol'],
                quantity=float(t['quantity'] or 0),
                price=float(t['price'] or 0),
                amount=float(t['amount'] or 0),
            ) for t in transactions
        ]
        session.add_all(to_insert)
        session.commit()
        
        # Clear cache for fresh data
        portfolio_data["price_cache"] = {}
        
        # Rebuild portfolio history with REAL prices
        rebuild_portfolio_history()

        # Persist portfolio history snapshots
        session.query(PortfolioHistoryRecord).filter(PortfolioHistoryRecord.user_id == current_user.id).delete()
        session.commit()
        for h in portfolio_data["portfolio_history"]:
            session.add(PortfolioHistoryRecord(
                user_id=current_user.id,
                date=h['date'],
                total_value=h['total_value'],
                spy_price=h.get('spy_price'),
                positions_json=json.dumps(h.get('positions', [])),
            ))
        session.commit()
        
        # Compute date range from parsed transactions
        try:
            dates = [datetime.strptime(t['date'], '%Y-%m-%d') for t in transactions]
            start_date = min(dates).strftime('%Y-%m-%d') if dates else None
            end_date = max(dates).strftime('%Y-%m-%d') if dates else None
        except Exception:
            start_date = None
            end_date = None

        return JSONResponse(content={
            "message": "CSV processed successfully with REAL stock data",
            "transactions_count": len(transactions),
            "symbols_found": list(symbols),
            "date_range": {"start": start_date, "end": end_date},
            "detected_format": "Fidelity" if is_fidelity else "Schwab",
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/portfolio/history")
async def get_portfolio_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    history = [
        {
            "date": r.date,
            "total_value": r.total_value,
            "spy_price": r.spy_price,
            "positions": json.loads(r.positions_json or "[]"),
        }
        for r in rows
    ]
    return JSONResponse(content={"history": history})

@app.get("/api/portfolio/weights")
async def get_portfolio_weights(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    if not rows:
        return JSONResponse(content={"weights": []})
    latest = max(rows, key=lambda r: r.date)
    positions = json.loads(latest.positions_json or "[]")
    total_value = latest.total_value

    # Calculate cost basis for each position from this user's transactions
    tx_rows = session.exec(select(TransactionRecord).where(TransactionRecord.user_id == current_user.id)).all()
    cost_basis: dict[str, dict[str, float]] = {}
    for r in tx_rows:
        symbol = r.symbol
        if symbol and symbol != 'Cash':
            if symbol not in cost_basis:
                cost_basis[symbol] = {'total_cost': 0.0, 'total_shares': 0.0}
            if 'BOUGHT' in r.action or 'Buy' in r.action:
                cost_basis[symbol]['total_cost'] += abs(r.amount)
                cost_basis[symbol]['total_shares'] += r.quantity
            elif 'SOLD' in r.action or 'Sell' in r.action:
                if cost_basis[symbol]['total_shares'] > 0:
                    avg_cost_per_share = cost_basis[symbol]['total_cost'] / cost_basis[symbol]['total_shares']
                    sold_cost = avg_cost_per_share * abs(r.quantity)
                    cost_basis[symbol]['total_cost'] -= sold_cost
                    cost_basis[symbol]['total_shares'] -= abs(r.quantity)
            elif 'REINVESTMENT' in r.action:
                cost_basis[symbol]['total_cost'] += abs(r.amount)
                cost_basis[symbol]['total_shares'] += r.quantity
    
    weights = []
    for pos in positions:
        if total_value > 0:
            weight = (pos['value'] / total_value) * 100
            
            # Calculate gain/loss percentage
            gain_loss_pct = 0
            if pos['symbol'] in cost_basis and cost_basis[pos['symbol']]['total_cost'] > 0:
                total_cost = cost_basis[pos['symbol']]['total_cost']
                current_value = pos['value']
                gain_loss_pct = ((current_value - total_cost) / total_cost) * 100
            
            weights.append({
                'symbol': pos['symbol'],
                'weight': round(weight, 2),
                'value': pos['value'],
                'shares': pos['shares'],
                'cost_basis': cost_basis.get(pos['symbol'], {}).get('total_cost', 0),
                'gain_loss_pct': round(gain_loss_pct, 2)
            })
    
    weights.sort(key=lambda x: x['weight'], reverse=True)
    return JSONResponse(content={"weights": weights})

@app.get("/api/portfolio/trades")
async def get_recent_trades(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(TransactionRecord).where(TransactionRecord.user_id == current_user.id)).all()
    recent = sorted([
        {
            'date': r.date,
            'action': r.action,
            'symbol': r.symbol,
            'quantity': r.quantity,
            'price': r.price,
            'amount': r.amount,
        } for r in rows
    ], key=lambda x: x['date'], reverse=True)[:20]
    return JSONResponse(content={"trades": recent})

@app.get("/api/performance")
async def get_performance_metrics(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    if not rows:
        return JSONResponse(content={"metrics": {}})
    history = [
        {"date": r.date, "total_value": r.total_value, "spy_price": r.spy_price}
        for r in rows
    ]
    df = pd.DataFrame(history)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    current_value = df['total_value'].iloc[-1]
    current_spy = df['spy_price'].iloc[-1]
    
    periods = {
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365
    }
    
    metrics = {}
    
    for period_name, days in periods.items():
        cutoff_date = df['date'].max() - timedelta(days=days)
        period_data = df[df['date'] >= cutoff_date]
        
        if len(period_data) < 2:
            continue
        
        start_value = period_data['total_value'].iloc[0]
        start_spy = period_data['spy_price'].iloc[0]
        
        if start_value > 0 and start_spy > 0:
            portfolio_return = ((current_value - start_value) / start_value) * 100
            spy_return = ((current_spy - start_spy) / start_spy) * 100
            
            metrics[period_name] = {
                'portfolio_return': round(portfolio_return, 2),
                'spy_return': round(spy_return, 2),
                'outperformance': round(portfolio_return - spy_return, 2)
            }
    
    return JSONResponse(content={"metrics": metrics})

@app.get("/api/comparison/spy")
async def get_spy_comparison(baseline_date: str = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    if not rows:
        return JSONResponse(content={"comparison": []})
    history = [
        {"date": r.date, "total_value": r.total_value, "spy_price": r.spy_price}
        for r in rows
    ]
    
    portfolio_start_date = history[0]['date']
    
    # Use provided baseline_date or default to portfolio start
    if baseline_date:
        baseline_date = validate_baseline_date(baseline_date, portfolio_start_date)
    else:
        baseline_date = portfolio_start_date
    
    # Always get extended data range to show proper comparison from baseline
    baseline_dt = datetime.strptime(baseline_date, '%Y-%m-%d')
    end_dt = datetime.strptime(history[-1]['date'], '%Y-%m-%d')
    
    # Get SPY data from baseline date
    spy_prices = get_real_stock_data("SPY", baseline_dt, datetime.now())
    if not spy_prices:
        return JSONResponse(content={"comparison": []})
    
    # Get baseline SPY price (what SPY was worth on baseline date)
    baseline_spy_price = spy_prices.get(baseline_date)
    if not baseline_spy_price:
        # Find nearest available price
        for date in sorted(spy_prices.keys()):
            if date >= baseline_date:
                baseline_spy_price = spy_prices[date]
                break
    
    if not baseline_spy_price:
        return JSONResponse(content={"comparison": []})
    
    # Get baseline portfolio composition (what portfolio would have been on baseline date)
    baseline_portfolio_price = None
    if baseline_date >= portfolio_start_date:
        # Portfolio existed at baseline - find its value
        portfolio_record = next((h for h in history if h['date'] >= baseline_date), None)
        if portfolio_record:
            baseline_portfolio_price = portfolio_record['total_value']
    
    # If portfolio didn't exist at baseline, we'll simulate it
    if not baseline_portfolio_price:
        baseline_portfolio_price = history[0]['total_value'] if history else 1.0
    
    comparison = []
    
    # Create date range from baseline to present
    current_date = baseline_dt
    while current_date <= end_dt:
        date_str = current_date.strftime('%Y-%m-%d')
        
        # Skip weekends
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue
        
        # Portfolio logic: Show what $10k invested in "your portfolio strategy" would be worth
        if date_str < portfolio_start_date:
            # Before portfolio existed - flat at $10k
            portfolio_value = 10000.0
        else:
            # Find matching portfolio record
            portfolio_record = next((h for h in history if h['date'] == date_str), None)
            if portfolio_record:
                # Calculate growth from baseline: ($10k * current_value / baseline_value)
                portfolio_growth = (portfolio_record['total_value'] / baseline_portfolio_price) * 10000
                portfolio_value = round(portfolio_growth, 2)
            else:
                # Use previous portfolio value
                if comparison:
                    portfolio_value = comparison[-1]['portfolio']
                else:
                    portfolio_value = 10000.0
        
        # SPY logic: Show what $10k invested in SPY at baseline would be worth
        spy_price = spy_prices.get(date_str)
        if spy_price:
            spy_growth = (spy_price / baseline_spy_price) * 10000
            spy_value = round(spy_growth, 2)
        else:
            # Use previous SPY value
            if comparison:
                spy_value = comparison[-1]['spy']
            else:
                spy_value = 10000.0
        
        comparison.append({
            'date': date_str,
            'portfolio': portfolio_value,
            'spy': spy_value
        })
        
        current_date += timedelta(days=1)
    
    return JSONResponse(content={"comparison": comparison})

@app.get("/api/search/stocks")
async def search_stocks(query: str):
    """Search and validate stock symbols using yfinance"""
    if not query or len(query.strip()) < 1 or len(query.strip()) > 10:
        return JSONResponse(content={"results": []})
    
    query = query.strip().upper()
    
    # Basic validation for stock symbol format
    import re
    if not re.match(r'^[A-Z0-9.-]+$', query):
        return JSONResponse(content={"results": []})
    
    try:
        # Try to get basic info for the symbol to validate it exists
        ticker = yf.Ticker(query)
        info = ticker.info
        
        # Check if we got valid data
        if not info or info.get('regularMarketPrice') is None:
            # Try to get recent history as fallback validation
            hist = ticker.history(period="5d")
            if hist.empty:
                return JSONResponse(content={"results": []})
        
        # Extract relevant information
        result = {
            "symbol": query,
            "name": info.get('longName', info.get('shortName', query)),
            "type": "stock",  # Default to stock, could be enhanced
            "exchange": info.get('exchange', ''),
            "currency": info.get('currency', 'USD'),
            "market_cap": info.get('marketCap'),
            "sector": info.get('sector', ''),
        }
        
        return JSONResponse(content={"results": [result]})
    
    except Exception as e:
        print(f"Error searching for symbol {query}: {e}")
        return JSONResponse(content={"results": []})

@app.get("/api/comparison/custom")
async def get_custom_comparison(symbols: str, baseline_date: str = None, start_date: str = None, end_date: str = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Get normalized growth comparison data for custom symbols along with portfolio and SPY"""
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    if not rows:
        return JSONResponse(content={"comparison": []})
    
    # Parse symbols
    symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
    if not symbol_list:
        return JSONResponse(content={"comparison": []})
    
    # Get portfolio history
    history = [
        {
            'date': r.date,
            'total_value': r.total_value,
            'spy_price': r.spy_price,
        } for r in rows
    ]
    if not history:
        return JSONResponse(content={"comparison": []})
    
    portfolio_start_date = history[0]['date']
    
    # Use provided baseline_date or default to portfolio start
    if baseline_date:
        baseline_date = validate_baseline_date(baseline_date, portfolio_start_date)
    else:
        baseline_date = portfolio_start_date
    
    # Determine the actual date range for data fetching
    actual_start_date = min(baseline_date, portfolio_start_date)
    
    # Filter by date range if provided (for display purposes)
    if start_date or end_date:
        filtered_history = []
        for day in history:
            if start_date and day['date'] < start_date:
                continue
            if end_date and day['date'] > end_date:
                continue
            filtered_history.append(day)
        display_history = filtered_history
    else:
        display_history = history
    
    # Get extended date range for data fetching
    start_dt = datetime.strptime(actual_start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(history[-1]['date'], '%Y-%m-%d')
    
    # Fetch custom symbol data from the extended range
    custom_data = {}
    for symbol in symbol_list:
        try:
            prices = get_real_stock_data(symbol, start_dt, end_dt)
            if prices:
                custom_data[symbol] = prices
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
    
    # Always get SPY data for proper baseline comparison
    spy_prices = get_real_stock_data("SPY", start_dt, end_dt)
    
    # Get baseline prices for all symbols (what they were worth on baseline date)
    baseline_spy_price = None
    baseline_custom_prices = {}
    
    # Get SPY baseline price
    if spy_prices:
        baseline_spy_price = spy_prices.get(baseline_date)
        if not baseline_spy_price:
            for date in sorted(spy_prices.keys()):
                if date >= baseline_date:
                    baseline_spy_price = spy_prices[date]
                    break
    elif display_history:
        baseline_spy_price = display_history[0]['spy_price']
    
    # Get baseline portfolio value (for normalization)
    baseline_portfolio_price = None
    if baseline_date >= portfolio_start_date:
        # Portfolio existed at baseline - find its value
        portfolio_record = next((h for h in display_history if h['date'] >= baseline_date), None)
        if portfolio_record:
            baseline_portfolio_price = portfolio_record['total_value']
    
    # If portfolio didn't exist at baseline, use first available value for proportional scaling
    if not baseline_portfolio_price:
        baseline_portfolio_price = display_history[0]['total_value'] if display_history else 1.0
    
    # Get custom symbol baseline prices
    for symbol in symbol_list:
        if symbol in custom_data:
            prices = custom_data[symbol]
            baseline_price = prices.get(baseline_date)
            if not baseline_price:
                for date in sorted(prices.keys()):
                    if date >= baseline_date:
                        baseline_price = prices[date]
                        break
            if baseline_price:
                baseline_custom_prices[symbol] = baseline_price
    
    # Build comparison data
    comparison = []
    
    # Create date range from baseline to end
    current_date = datetime.strptime(baseline_date, '%Y-%m-%d')
    end_date_dt = datetime.strptime(display_history[-1]['date'] if display_history else history[-1]['date'], '%Y-%m-%d')
    
    while current_date <= end_date_dt:
        date_str = current_date.strftime('%Y-%m-%d')
        
        comparison_point = {
            'date': date_str,
            'portfolio': 10000.0,  # Default
            'spy': 10000.0         # Default
        }
        
        # Portfolio logic: Show what $10k invested in "your portfolio strategy" at baseline would be worth
        if date_str < portfolio_start_date:
            # Before portfolio existed - flat at $10k
            comparison_point['portfolio'] = 10000.0
        else:
            # Find matching portfolio record
            portfolio_record = next((h for h in display_history if h['date'] == date_str), None)
            if portfolio_record and baseline_portfolio_price > 0:
                # Calculate growth from baseline: ($10k * current_value / baseline_value)
                portfolio_growth = (portfolio_record['total_value'] / baseline_portfolio_price) * 10000
                comparison_point['portfolio'] = round(portfolio_growth, 2)
            else:
                # Use previous portfolio value
                if comparison:
                    comparison_point['portfolio'] = comparison[-1]['portfolio']
                else:
                    comparison_point['portfolio'] = 10000.0
        
        # SPY logic: Show what $10k invested in SPY at baseline would be worth
        spy_price = None
        if spy_prices:
            spy_price = spy_prices.get(date_str)
        else:
            # Use portfolio history SPY data
            portfolio_record = next((h for h in display_history if h['date'] == date_str), None)
            if portfolio_record:
                spy_price = portfolio_record['spy_price']
        
        if spy_price and baseline_spy_price and baseline_spy_price > 0:
            spy_growth = (spy_price / baseline_spy_price) * 10000
            comparison_point['spy'] = round(spy_growth, 2)
        else:
            # Use previous SPY value
            if comparison:
                comparison_point['spy'] = comparison[-1]['spy']
            else:
                comparison_point['spy'] = 10000.0
        
        # Custom symbols logic: Show what $10k invested in each symbol at baseline would be worth
        for symbol in symbol_list:
            if symbol in baseline_custom_prices:
                symbol_price = custom_data[symbol].get(date_str)
                if symbol_price and baseline_custom_prices[symbol] > 0:
                    # Calculate growth from baseline: ($10k * current_price / baseline_price)
                    symbol_growth = (symbol_price / baseline_custom_prices[symbol]) * 10000
                    comparison_point[symbol.lower()] = round(symbol_growth, 2)
                else:
                    # Use previous value
                    if comparison and symbol.lower() in comparison[-1]:
                        comparison_point[symbol.lower()] = comparison[-1][symbol.lower()]
                    else:
                        comparison_point[symbol.lower()] = 10000.0
        
        comparison.append(comparison_point)
        current_date += timedelta(days=1)
    
    return JSONResponse(content={"comparison": comparison})

@app.get("/api/social/profiles")
async def list_public_profiles(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    profiles = session.exec(select(UserProfile).where(UserProfile.is_public == True)).all()
    users = {u.id: u for u in session.exec(select(User)).all()}
    data = []
    for p in profiles:
        u = users.get(p.user_id)
        if not u:
            continue
        data.append({
            "user_id": p.user_id,
            "display_name": p.display_name or (u.name or u.email.split("@")[0]),
            "share_performance_only": p.share_performance_only,
            "anonymize_symbols": p.anonymize_symbols,
        })
    return JSONResponse(content={"profiles": data})


@app.get("/api/social/profile")
async def get_my_profile(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = _get_or_create_profile(session, current_user.id)
    return {
        "display_name": p.display_name or (current_user.name or current_user.email.split("@")[0]),
        "is_public": p.is_public,
        "share_performance_only": p.share_performance_only,
        "anonymize_symbols": p.anonymize_symbols,
    }


@app.put("/api/social/profile")
async def update_my_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = _get_or_create_profile(session, current_user.id)
    if payload.display_name is not None:
        p.display_name = payload.display_name
    if payload.is_public is not None:
        p.is_public = payload.is_public
    if payload.share_performance_only is not None:
        p.share_performance_only = payload.share_performance_only
    if payload.anonymize_symbols is not None:
        p.anonymize_symbols = payload.anonymize_symbols
    session.add(p)
    session.commit()
    session.refresh(p)
    return {"ok": True}


def _authorize_view(session: Session, viewer_id: int, target_user_id: int) -> UserProfile | None:
    if viewer_id == target_user_id:
        return _get_or_create_profile(session, target_user_id)
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == target_user_id)).first()
    if not profile or not profile.is_public:
        raise HTTPException(status_code=403, detail="User profile is private")
    return profile


@app.get("/api/social/performance")
async def social_performance(user_id: int, baseline_date: str | None = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    profile = _authorize_view(session, current_user.id, user_id)
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == user_id)).all()
    if not rows:
        return JSONResponse(content={"comparison": []})
    history = sorted([{ "date": r.date, "total_value": r.total_value, "spy_price": r.spy_price } for r in rows], key=lambda x: x["date"]) 
    portfolio_start_date = history[0]['date']
    if baseline_date:
        baseline_date = validate_baseline_date(baseline_date, portfolio_start_date)
    else:
        baseline_date = portfolio_start_date
    baseline_value = next((h['total_value'] for h in history if h['date'] >= baseline_date), history[0]['total_value'])
    data = []
    for h in history:
        if h['date'] < baseline_date:
            continue
        value = round((h['total_value'] / baseline_value) * 10000, 2) if baseline_value > 0 else 10000.0
        data.append({"date": h['date'], "portfolio": value})
    return JSONResponse(content={"comparison": data})


@app.get("/api/social/weights")
async def social_weights(user_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    profile = _authorize_view(session, current_user.id, user_id)
    if profile.share_performance_only:
        return JSONResponse(content={"weights": []})
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == user_id)).all()
    if not rows:
        return JSONResponse(content={"weights": []})
    latest = max(rows, key=lambda r: r.date)
    positions = json.loads(latest.positions_json or "[]")
    if profile.anonymize_symbols:
        for idx, p in enumerate(positions, start=1):
            p['label'] = f"Holding {idx}"
            p.pop('symbol', None)
    return JSONResponse(content={"weights": positions, "as_of": latest.date})


@app.get("/api/social/comparison")
async def social_comparison(user_ids: str, baseline_date: str | None = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    ids = []
    for s in user_ids.split(','):
        s = s.strip()
        if not s:
            continue
        try:
            ids.append(int(s))
        except ValueError:
            continue
    if not ids:
        return JSONResponse(content={"series": {}})
    series: dict[int, list[dict]] = {}
    for uid in ids:
        _authorize_view(session, current_user.id, uid)
        rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == uid)).all()
        if not rows:
            series[uid] = []
            continue
        hist = sorted([{ "date": r.date, "total_value": r.total_value } for r in rows], key=lambda x: x["date"]) 
        start = hist[0]['date']
        base = baseline_date or start
        base_value = next((h['total_value'] for h in hist if h['date'] >= base), hist[0]['total_value'])
        points = []
        for h in hist:
            if h['date'] < base:
                continue
            v = round((h['total_value'] / base_value) * 10000, 2) if base_value > 0 else 10000.0
            points.append({"date": h['date'], "value": v})
        series[uid] = points
    return JSONResponse(content={"series": series})


# =====================
# Groups
# =====================

def _generate_group_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


@app.post("/api/groups")
async def create_group(payload: GroupCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    code = _generate_group_code()
    # Ensure unique code
    while session.exec(select(Group).where(Group.code == code)).first() is not None:
        code = _generate_group_code()
    g = Group(name=payload.name, code=code, owner_id=current_user.id, is_public=payload.is_public)
    session.add(g)
    session.commit()
    session.refresh(g)
    # auto-join as owner
    session.add(GroupMember(group_id=g.id, user_id=current_user.id, role="owner"))
    session.commit()
    return {"id": g.id, "name": g.name, "code": g.code, "is_public": g.is_public}


@app.post("/api/groups/join")
async def join_group(payload: GroupJoin, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    g = session.exec(select(Group).where(Group.code == payload.code.upper())).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = session.exec(select(GroupMember).where((GroupMember.group_id == g.id) & (GroupMember.user_id == current_user.id))).first()
    if existing:
        return {"ok": True, "id": g.id}
    session.add(GroupMember(group_id=g.id, user_id=current_user.id))
    session.commit()
    return {"ok": True, "id": g.id}


@app.get("/api/groups")
async def my_groups(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    memberships = session.exec(select(GroupMember).where(GroupMember.user_id == current_user.id)).all()
    group_ids = [m.group_id for m in memberships]
    groups = []
    if group_ids:
        for gid in group_ids:
            g = session.exec(select(Group).where(Group.id == gid)).first()
            if g:
                groups.append({"id": g.id, "name": g.name, "code": g.code, "is_public": g.is_public})
    return {"groups": groups}


@app.get("/api/groups/{group_id}/leaderboard")
async def group_leaderboard(group_id: int, baseline_date: str | None = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Ensure membership
    _ensure_group_membership(session, group_id, current_user.id)
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    leaderboard = []
    for m in members:
        # Within a group, show all members irrespective of public profile settings
        user = session.exec(select(User).where(User.id == m.user_id)).first()
        profile = _get_or_create_profile(session, m.user_id)
        rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == m.user_id)).all()
        if not rows:
            continue
        hist = sorted([{ "date": r.date, "total_value": r.total_value } for r in rows], key=lambda x: x["date"]) 
        start = hist[0]['date']
        base = baseline_date or start
        base_value = next((h['total_value'] for h in hist if h['date'] >= base), hist[0]['total_value'])
        last_value = hist[-1]['total_value']
        ret = ((last_value - base_value) / base_value) * 100 if base_value > 0 else 0.0
        display_name = (profile.display_name or user.name or user.email.split("@")[0]) if user else f"User {m.user_id}"
        leaderboard.append({"user_id": m.user_id, "name": display_name, "return_pct": round(ret, 2)})
    leaderboard.sort(key=lambda x: x['return_pct'], reverse=True)
    return {"leaderboard": leaderboard}


@app.get("/api/groups/{group_id}")
async def get_group(group_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    membership = session.exec(select(GroupMember).where((GroupMember.group_id == group_id) & (GroupMember.user_id == current_user.id))).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not in group")
    g = session.exec(select(Group).where(Group.id == group_id)).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    member_rows = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    members = []
    for m in member_rows:
        u = session.exec(select(User).where(User.id == m.user_id)).first()
        profile = _get_or_create_profile(session, m.user_id)
        display_name = (profile.display_name or (u.name if u else None) or (u.email.split("@")[0] if u else None)) or "User"
        is_public = bool(profile.is_public)
        members.append({"user_id": m.user_id, "name": display_name, "is_public": is_public})
    return {"id": g.id, "name": g.name, "code": g.code, "is_public": g.is_public, "members": members}


# ---- New: Group-scoped insights (override personal privacy within the group) ----

def _ensure_group_membership(session: Session, group_id: int, user_id: int) -> None:
    membership = session.exec(select(GroupMember).where((GroupMember.group_id == group_id) & (GroupMember.user_id == user_id))).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not in group")


def _compute_cost_basis(session: Session, user_id: int) -> dict[str, dict[str, float]]:
    tx_rows = session.exec(select(TransactionRecord).where(TransactionRecord.user_id == user_id)).all()
    cost_basis: dict[str, dict[str, float]] = {}
    for r in tx_rows:
        symbol = r.symbol
        if not symbol or symbol == 'Cash':
            continue
        if symbol not in cost_basis:
            cost_basis[symbol] = {'total_cost': 0.0, 'total_shares': 0.0}
        if 'BOUGHT' in r.action or 'Buy' in r.action:
            cost_basis[symbol]['total_cost'] += abs(r.amount)
            cost_basis[symbol]['total_shares'] += r.quantity
        elif 'SOLD' in r.action or 'Sell' in r.action:
            if cost_basis[symbol]['total_shares'] > 0:
                avg_cost_per_share = cost_basis[symbol]['total_cost'] / max(cost_basis[symbol]['total_shares'], 1e-9)
                sold_cost = avg_cost_per_share * abs(r.quantity)
                cost_basis[symbol]['total_cost'] -= sold_cost
                cost_basis[symbol]['total_shares'] -= abs(r.quantity)
        elif 'REINVESTMENT' in r.action:
            cost_basis[symbol]['total_cost'] += abs(r.amount)
            cost_basis[symbol]['total_shares'] += r.quantity
    return cost_basis


def _compute_badges(session: Session, user_id: int, positions: list[dict]) -> dict:
    # Largest trade by absolute amount
    tx_rows = session.exec(select(TransactionRecord).where(TransactionRecord.user_id == user_id)).all()
    largest_trade = None
    if tx_rows:
        largest = max(tx_rows, key=lambda t: abs(t.amount or 0))
        largest_trade = {
            "symbol": largest.symbol or "Cash",
            "action": largest.action,
            "amount": round(float(largest.amount or 0), 2),
            "date": largest.date,
        }

    # Best/Worst symbol by gain % using cost basis vs latest value
    cost_basis = _compute_cost_basis(session, user_id)
    perf_list: list[tuple[str, float]] = []
    for p in positions:
        sym = p.get('symbol')
        if not sym:
            continue
        basis = cost_basis.get(sym)
        if not basis or basis['total_cost'] <= 0:
            continue
        gain_pct = ((p.get('value', 0.0) - basis['total_cost']) / basis['total_cost']) * 100.0
        perf_list.append((sym, gain_pct))
    best_symbol = None
    worst_symbol = None
    if perf_list:
        best_symbol = {
            "symbol": max(perf_list, key=lambda x: x[1])[0],
            "gain_pct": round(max(perf_list, key=lambda x: x[1])[1], 2),
        }
        worst_symbol = {
            "symbol": min(perf_list, key=lambda x: x[1])[0],
            "gain_pct": round(min(perf_list, key=lambda x: x[1])[1], 2),
        }
    return {
        "largest_trade": largest_trade,
        "best_symbol": best_symbol,
        "worst_symbol": worst_symbol,
    }


@app.get("/api/groups/{group_id}/members/details")
async def group_members_details(group_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    data = []
    for m in members:
        user = session.exec(select(User).where(User.id == m.user_id)).first()
        # Latest snapshot
        rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == m.user_id)).all()
        if not rows:
            data.append({"user_id": m.user_id, "name": user.name or user.email.split("@")[0], "weights": [], "badges": {}})
            continue
        latest = max(rows, key=lambda r: r.date)
        positions = json.loads(latest.positions_json or "[]")
        total_value = latest.total_value or 0.0
        # enrich with weight pct
        enriched = []
        for p in positions:
            pct = (p.get('value', 0.0) / total_value * 100.0) if total_value > 0 else 0.0
            enriched.append({
                "symbol": p.get('symbol', ''),
                "shares": p.get('shares', 0.0),
                "value": p.get('value', 0.0),
                "weight": round(pct, 2),
            })
        enriched.sort(key=lambda x: x['weight'], reverse=True)
        badges = _compute_badges(session, m.user_id, positions)
        display_name = user.name or user.email.split("@")[0]
        data.append({"user_id": m.user_id, "name": display_name, "weights": enriched, "badges": badges})
    return {"members": data}


@app.get("/api/groups/{group_id}/comparison")
async def group_comparison(group_id: int, baseline_date: str | None = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    series: dict[int, list[dict]] = {}
    for m in members:
        rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == m.user_id)).all()
        if not rows:
            series[m.user_id] = []
            continue
        hist = sorted([{ "date": r.date, "total_value": r.total_value } for r in rows], key=lambda x: x["date"]) 
        start = hist[0]['date']
        base = baseline_date or start
        base_value = next((h['total_value'] for h in hist if h['date'] >= base), hist[0]['total_value'])
        points = []
        for h in hist:
            if h['date'] < base:
                continue
            v = round((h['total_value'] / base_value) * 10000, 2) if base_value > 0 else 10000.0
            points.append({"date": h['date'], "value": v})
        series[m.user_id] = points
    return {"series": series}
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)