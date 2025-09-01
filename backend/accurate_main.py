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


# =====================
# Weekly Groups Models
# =====================

class WeeklyUpload(SQLModel, table=True):
    __tablename__ = "weekly_uploads"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(index=True)
    user_id: int = Field(index=True)
    week_start: str = Field(index=True)  # YYYY-MM-DD (Monday of week)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    source: str | None = None  # fidelity | schwab | unknown
    transactions_count: int = Field(default=0)


class WeeklyTransaction(SQLModel, table=True):
    __tablename__ = "weekly_transactions"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(index=True)
    user_id: int = Field(index=True)
    week_start: str = Field(index=True)
    date: str
    action: str
    symbol: str
    quantity: float
    price: float
    amount: float


class WeeklyStats(SQLModel, table=True):
    __tablename__ = "weekly_stats"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(index=True)
    user_id: int = Field(index=True)
    week_start: str = Field(index=True)
    twr_week_pct: float = Field(default=0.0)
    start_value: float = Field(default=0.0)
    end_value: float = Field(default=0.0)
    invested_week: float = Field(default=0.0)
    pnl_week: float = Field(default=0.0)
    best_trade_json: str | None = None
    worst_trade_json: str | None = None
    badges_json: str | None = None


class PriceCacheDaily(SQLModel, table=True):
    __tablename__ = "price_cache_daily"
    id: int | None = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    date: str = Field(index=True)  # YYYY-MM-DD
    close: float = Field(default=0.0)


# =====================
# Social+ Models (lists, notes, votes, actions, streaks)
# =====================

class StockListItem(SQLModel, table=True):
    __tablename__ = "stock_list_items"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    symbol: str = Field(index=True)
    list_type: str = Field(index=True)  # owned | watch | wishlist
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StockNote(SQLModel, table=True):
    __tablename__ = "stock_notes"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    symbol: str = Field(index=True)
    content: str
    labels_json: str = Field(default="[]")
    screenshot_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PreferenceVote(SQLModel, table=True):
    __tablename__ = "preference_votes"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    symbol_a: str
    symbol_b: str
    winner: str  # symbol_a | symbol_b
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SocialAction(SQLModel, table=True):
    __tablename__ = "social_actions"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    type: str = Field(index=True)  # buy | sell | upload | note | join_group | create_group | add_watch | add_wishlist
    symbol: str | None = None
    quantity: float | None = None
    amount: float | None = None
    note: str | None = None
    group_id: int | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class StreakRecord(SQLModel, table=True):
    __tablename__ = "streaks"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    kind: str = Field(index=True)  # trade | visit
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_date: str | None = None  # YYYY-MM-DD


class GroupNote(SQLModel, table=True):
    __tablename__ = "group_notes"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(index=True)
    user_id: int = Field(index=True)
    symbol: str = Field(index=True)
    rating: int  # 1-10
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

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

def _get_week_bounds(week_start: str) -> tuple[str, str]:
    try:
        start_dt = datetime.strptime(week_start, '%Y-%m-%d')
        end_dt = start_dt + timedelta(days=6)
        # constrain end to prior trading day (Fri or earlier)
        end_str = get_trading_day(end_dt.strftime('%Y-%m-%d'))
        return (start_dt.strftime('%Y-%m-%d'), end_str)
    except Exception:
        return (week_start, week_start)

def _fetch_close_cached(session: Session, symbol: str, date: str) -> float | None:
    # Try cache
    rec = session.exec(select(PriceCacheDaily).where((PriceCacheDaily.symbol == symbol) & (PriceCacheDaily.date == date))).first()
    if rec:
        return rec.close
    # Fetch via yfinance around the date to ensure we hit a trading day
    try:
        dt = datetime.strptime(date, '%Y-%m-%d')
        hist = yf.Ticker(symbol).history(start=dt - timedelta(days=3), end=dt + timedelta(days=2))
        found = None
        for d, row in hist.iterrows():
            dstr = d.strftime('%Y-%m-%d')
            close = float(row['Close'])
            session.add(PriceCacheDaily(symbol=symbol, date=dstr, close=close))
            if dstr == date:
                found = close
        session.commit()
        return found
    except Exception as e:
        print(f"Price fetch error {symbol} {date}: {e}")
        return None

def _compute_user_weekly_portfolio_twr(session: Session, user_id: int, week_start: str) -> dict:
    """
    Compute portfolio time-weighted return for the specific week using
    PortfolioHistoryRecord equity values. Falls back to zeros if not enough data.
    """
    start_str, end_str = _get_week_bounds(week_start)
    rows = session.exec(
        select(PortfolioHistoryRecord)
        .where((PortfolioHistoryRecord.user_id == user_id) & (PortfolioHistoryRecord.date >= start_str) & (PortfolioHistoryRecord.date <= end_str))
        .order_by(PortfolioHistoryRecord.date)
    ).all()
    if not rows or len(rows) < 2:
        return {"start": start_str, "end": end_str, "start_value": 0.0, "end_value": 0.0, "twr_pct": 0.0, "gain_usd": 0.0}

    values = [float(r.total_value) for r in rows if r.total_value is not None]
    dates = [r.date for r in rows]
    if len(values) < 2 or values[0] <= 0:
        return {"start": dates[0] if dates else start_str, "end": dates[-1] if dates else end_str, "start_value": values[0] if values else 0.0, "end_value": values[-1] if values else 0.0, "twr_pct": 0.0, "gain_usd": 0.0}

    twr_factor = 1.0
    for i in range(1, len(values)):
        if values[i-1] > 0:
            r_t = (values[i] / values[i-1]) - 1.0
            twr_factor *= (1.0 + r_t)

    twr = twr_factor - 1.0
    start_val = values[0]
    end_val = values[-1]
    gain = end_val - start_val
    return {
        "start": dates[0],
        "end": dates[-1],
        "start_value": round(start_val, 2),
        "end_value": round(end_val, 2),
        "twr_pct": round(twr * 100.0, 4),
        "gain_usd": round(gain, 2),
    }

def _symbol_week_change(session: Session, symbol: str, week_start: str) -> dict:
    start_str, end_str = _get_week_bounds(week_start)
    # Use first trading day on/after week_start for start, and trading day for end
    start_close = None
    # Try exact start_str, else next trading day
    try:
        sdt = datetime.strptime(start_str, '%Y-%m-%d')
        # forward to Monday->Friday first trading day
        for i in range(0, 5):
            dtry = (sdt + timedelta(days=i)).strftime('%Y-%m-%d')
            start_close = _fetch_close_cached(session, symbol, dtry)
            if start_close:
                start_str = dtry
                break
    except Exception:
        pass
    end_close = _fetch_close_cached(session, symbol, end_str)
    pct = 0.0
    if start_close and end_close and start_close > 0:
        pct = (end_close - start_close) / start_close * 100.0
    return {"symbol": symbol, "start": start_str, "end": end_str, "start_close": start_close or 0.0, "end_close": end_close or 0.0, "pct": round(pct, 4)}

def _compute_weekly_badges(session: Session, group_id: int, user_id: int, week: str) -> dict:
    """Compute weekly badges for a user based on held/traded symbols and price changes.

    Returns a structure suitable for UI consumption:
    { "badges": [ {"key":..., "label":..., "emoji":..., "context":...}, ... ],
      "biggest_gainer": {symbol, pct} | None, "biggest_loser": {symbol, pct} | None }
    """
    # Determine symbols held at end of week
    start_str, end_str = _get_week_bounds(week)
    rec = session.exec(
        select(PortfolioHistoryRecord)
        .where((PortfolioHistoryRecord.user_id == user_id) & (PortfolioHistoryRecord.date <= end_str))
        .order_by(PortfolioHistoryRecord.date.desc())
    ).first()

    held_symbols: set[str] = set()
    if rec:
        try:
            for p in json.loads(rec.positions_json or '[]'):
                sym = (p.get('symbol') or '').upper().strip()
                if sym:
                    held_symbols.add(sym)
        except Exception:
            pass

    # Include traded symbols during the week
    weekly_rows = session.exec(select(WeeklyTransaction).where((WeeklyTransaction.group_id == group_id) & (WeeklyTransaction.user_id == user_id) & (WeeklyTransaction.week_start == week))).all()
    for r in weekly_rows:
        if r.symbol:
            held_symbols.add(r.symbol.upper())

    # Compute weekly change for each symbol in scope
    changes: dict[str, dict] = {}
    for sym in sorted(held_symbols):
        changes[sym] = _symbol_week_change(session, sym, week)

    # Biggest Winner / Loser (weekly)
    biggest_gainer = None
    biggest_loser = None
    if changes:
        biggest_gainer = max(changes.values(), key=lambda x: x.get('pct', 0.0))
        biggest_loser = min(changes.values(), key=lambda x: x.get('pct', 0.0))

    # Uh Oh (any stock down more than 10% this week; show worst one)
    uhoh = None
    for c in changes.values():
        if c.get('pct', 0.0) <= -10.0:
            if not uhoh or c.get('pct', 0.0) < uhoh.get('pct', 0.0):
                uhoh = c

    # ETF detection (simple curated list)
    etfs = {
        'SPY','QQQ','VOO','VTI','IWM','DIA','XLK','XLF','XLE','XLV','XLY','XLP','XLI','XLC','XLU','XLB','ARKK','ARKW','ARKG','SOXX','SMH'
    }
    only_etf = len(held_symbols) > 0 and all(sym in etfs for sym in held_symbols)

    # To The Moon (> 50% in a week on any symbol)
    to_the_moon = any(c.get('pct', 0.0) >= 50.0 for c in changes.values())

    # Always Up (beat the S&P weekly)
    spy_change = _symbol_week_change(session, 'SPY', week)
    user_week = _compute_user_weekly_portfolio_twr(session, user_id, week)
    always_up = False
    try:
        always_up = (user_week.get('twr_pct', 0.0) > (spy_change.get('pct', 0.0)))
    except Exception:
        always_up = False

    # Green Machine (all held symbols up) / Red Flag (all held symbols down)
    relevant = [changes[s] for s in held_symbols if s in changes]
    green_machine = len(relevant) > 0 and all(c.get('pct', 0.0) >= 0.0 for c in relevant)
    red_flag = len(relevant) > 0 and all(c.get('pct', 0.0) <= 0.0 for c in relevant)

    # YOLO stock (bought under $5 this week)
    yolo = False
    paper_hands = False
    for r in weekly_rows:
        action = (r.action or '').upper()
        if 'BUY' in action or 'BOUGHT' in action:
            if (r.price or 0.0) > 0 and float(r.price) < 5.0:
                yolo = True
        if ('SELL' in action or 'SOLD' in action) and r.symbol:
            sym = r.symbol.upper()
            ch = changes.get(sym)
            if ch and ch.get('pct', 0.0) > 0.0:
                paper_hands = True

    # Assemble badges
    badges: list[dict] = []
    if biggest_gainer:
        badges.append({
            "key": "biggest_winner", "label": "Biggest Winner", "emoji": "🏆",
            "context": f"{biggest_gainer['symbol']} +{biggest_gainer['pct']:.2f}%"
        })
    if biggest_loser and (not biggest_gainer or biggest_loser['symbol'] != biggest_gainer['symbol']):
        sign = '+' if biggest_loser['pct'] >= 0 else ''
        badges.append({
            "key": "biggest_loser", "label": "Biggest Loser", "emoji": "📉",
            "context": f"{biggest_loser['symbol']} {sign}{biggest_loser['pct']:.2f}%"
        })
    if only_etf:
        badges.append({"key": "risk_allergic", "label": "Risk Allergic", "emoji": "🛡️", "context": "Only ETFs this week"})
    if to_the_moon:
        badges.append({"key": "to_the_moon", "label": "To The Moon", "emoji": "🚀", "context": "> 50% on a stock"})
    if always_up:
        badges.append({"key": "always_up", "label": "Always Up", "emoji": "📈", "context": "Beat the S&P this week"})
    if green_machine:
        badges.append({"key": "green_machine", "label": "Green Machine", "emoji": "🟢", "context": "All positions green"})
    if red_flag:
        badges.append({"key": "red_flag", "label": "Red Flag", "emoji": "🚩", "context": "All positions red"})
    if yolo:
        badges.append({"key": "yolo", "label": "YOLO Stock", "emoji": "🎲", "context": "Bought under $5"})
    if paper_hands:
        badges.append({"key": "paper_hands", "label": "Paper Hands", "emoji": "🧻", "context": "Sold before it went up"})
    if uhoh:
        badges.append({
            "key": "uh_oh", "label": "Uh Oh", "emoji": "⚠️",
            "context": f"{uhoh['symbol']} {uhoh['pct']:.2f}% this week"
        })

    return {
        "badges": badges,
        "biggest_gainer": biggest_gainer,
        "biggest_loser": biggest_loser,
    }

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
        # Social feed action for upload
        session.add(SocialAction(user_id=current_user.id, type="upload"))
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

@app.get("/api/portfolio/status")
async def get_portfolio_status(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    tx = session.exec(select(TransactionRecord).where(TransactionRecord.user_id == current_user.id)).all()
    has_data = len(tx) > 0
    if not has_data:
        return JSONResponse(content={
            "has_portfolio_data": False,
            "transaction_count": 0,
            "positions_count": 0
        })
    # Compute TWR and latest portfolio value
    twr = _compute_time_weighted_return(session, current_user.id)
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id).order_by(PortfolioHistoryRecord.date)).all()
    latest_value = rows[-1].total_value if rows else 0.0
    latest_positions = json.loads(rows[-1].positions_json or "[]") if rows else []
    return JSONResponse(content={
        "has_portfolio_data": True,
        "transaction_count": len(tx),
        "positions_count": len(latest_positions),
        "current_return": twr.get("twr_pct", 0.0),
        "portfolio_value": latest_value,
        "twr": twr
    })

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
    # Log actions and streaks
    for r in rows[-5:]:
        if r.action:
            action_type = 'buy' if ('BUY' in r.action.upper()) else ('sell' if 'SELL' in r.action.upper() else 'other')
            if action_type != 'other':
                session.add(SocialAction(user_id=current_user.id, type=action_type, symbol=r.symbol, quantity=r.quantity, amount=r.amount))
                _increment_streak(session, current_user.id, 'trade')
    session.commit()
    return JSONResponse(content={"trades": recent})

@app.get("/api/performance")
async def get_performance_metrics(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    if not rows:
        return JSONResponse(content={"metrics": {}, "twr": {"twr_pct": 0}})
    # Use TWR for portfolio return baseline
    twr_all = _compute_time_weighted_return(session, current_user.id)
    current_return = twr_all.get("twr_pct", 0.0)
    metrics = {
        '1M': {
            'portfolio_return': round(current_return, 2),
            'spy_return': 5.0,
            'outperformance': round(current_return - 5.0, 2)
        },
        '3M': {
            'portfolio_return': round(current_return, 2),
            'spy_return': 8.0,
            'outperformance': round(current_return - 8.0, 2)
        },
        '6M': {
            'portfolio_return': round(current_return, 2),
            'spy_return': 12.0,
            'outperformance': round(current_return - 12.0, 2)
        },
        '1Y': {
            'portfolio_return': round(current_return, 2),
            'spy_return': 20.0,
            'outperformance': round(current_return - 20.0, 2)
        }
    }
    # Also compute contribution-adjusted and deposit-averaged returns
    net = _compute_contribution_adjusted_return(session, current_user.id)
    depavg = _compute_deposit_averaged_return(session, current_user.id)
    return JSONResponse(content={"metrics": metrics, "twr": twr_all, "net": net, "deposit_avg": depavg})
    
@app.get("/api/performance/net")
async def get_contribution_adjusted_return(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    net = _compute_contribution_adjusted_return(session, current_user.id)
    return JSONResponse(content=net)

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
    baseline_date = (
        validate_baseline_date(baseline_date, portfolio_start_date)
        if baseline_date else portfolio_start_date
    )
    
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



@app.get("/api/debug/user/{user_id}/transactions")
async def debug_user_transactions(user_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Debug endpoint to see what transactions are being included/excluded"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Can only debug your own transactions")
    
    # Get all transactions
    all_transactions = session.exec(
        select(TransactionRecord).where(TransactionRecord.user_id == user_id).order_by(TransactionRecord.date.desc())
    ).all()
    
    included_transactions = []
    excluded_transactions = []
    
    for tx in all_transactions:
        tx_data = {
            "date": tx.date,
            "action": tx.action,
            "symbol": tx.symbol,
            "quantity": tx.quantity,
            "price": tx.price,
            "amount": tx.amount
        }
        
        if _is_stock_transaction(tx.action, tx.symbol):
            included_transactions.append(tx_data)
        else:
            excluded_transactions.append(tx_data)
    
    # Calculate normalized performance
    positions = _get_user_positions(session, user_id)
    normalized_perf = _compute_normalized_portfolio_performance(session, user_id, positions)
    
    return {
        "total_transactions": len(all_transactions),
        "included_count": len(included_transactions),
        "excluded_count": len(excluded_transactions),
        "included_transactions": included_transactions[:10],  # Show first 10
        "excluded_transactions": excluded_transactions[:10],  # Show first 10
        "normalized_performance": normalized_perf,
        "current_positions": positions
    }


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
        
        # Use time-weighted return as ranking return
        twr_kwargs = {"start_date": baseline_date} if baseline_date else {}
        twr = _compute_time_weighted_return(session, m.user_id, **twr_kwargs)
        ret = twr.get("twr_pct", 0.0)
        
        display_name = (profile.display_name or user.name or user.email.split("@")[0]) if user else f"User {m.user_id}"
        leaderboard.append({
            "user_id": m.user_id, 
            "name": display_name, 
            "return_pct": round(ret, 2),
            "normalized_value": 0,
            "total_invested": 0
        })
    
    leaderboard.sort(key=lambda x: x['return_pct'], reverse=True)
    
    # Record social action for visit
    session.add(SocialAction(user_id=current_user.id, type="visit_leaderboard", group_id=group_id))
    _increment_streak(session, current_user.id, 'visit')
    session.commit()
    
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

def _is_stock_transaction(action: str, symbol: str) -> bool:
    """
    Determine if a transaction is a legitimate stock/ETF trade (not a money transfer).
    Excludes all types of money transfers, deposits, and withdrawals.
    """
    if not symbol or symbol in ["Cash", "CASH"]:
        return False
    
    # Explicit exclusions
    excluded_actions = {
        "Cash Transfer", "Bank Transfer", "MoneyLink Transfer", "Deposit", 
        "Withdrawal", "Transfer", "Wire Transfer", "ACH Transfer", 
        "Electronic Funds Transfer"
    }
    
    if action in excluded_actions:
        return False
    
    # Pattern-based exclusions (case-insensitive)
    action_lower = action.lower()
    excluded_patterns = ["transfer", "deposit", "withdrawal"]
    
    for pattern in excluded_patterns:
        if pattern in action_lower:
            return False
    
    return True


def _ensure_group_membership(session: Session, group_id: int, user_id: int) -> None:
    membership = session.exec(select(GroupMember).where((GroupMember.group_id == group_id) & (GroupMember.user_id == user_id))).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not in group")


def _compute_cost_basis(session: Session, user_id: int) -> dict[str, dict[str, float]]:
    # Get all transactions for the user, then filter programmatically
    all_tx_rows = session.exec(
        select(TransactionRecord).where(TransactionRecord.user_id == user_id)
    ).all()
    
    # Filter to only stock transactions (exclude money transfers)
    tx_rows = [tx for tx in all_tx_rows if _is_stock_transaction(tx.action, tx.symbol)]
    
    print(f"DEBUG user_id={user_id}: total_transactions={len(all_tx_rows)}, stock_transactions={len(tx_rows)}")
    excluded_tx = [tx for tx in all_tx_rows if not _is_stock_transaction(tx.action, tx.symbol)]
    print(f"DEBUG user_id={user_id}: excluded_transactions examples: {[(tx.action, tx.symbol, tx.amount) for tx in excluded_tx[:5]]}")
    print(f"DEBUG user_id={user_id}: included_transactions examples: {[(tx.action, tx.symbol, tx.amount) for tx in tx_rows[:5]]}")
    
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


def _get_user_positions(session: Session, user_id: int) -> list[dict]:
    """Get current user positions from portfolio_data or calculate from transactions"""
    # First check if user has data in the global portfolio_data
    global portfolio_data
    if user_id in portfolio_data:
        return portfolio_data[user_id]
    
    # If not in portfolio_data, calculate from transactions
    cost_basis = _compute_cost_basis(session, user_id)
    positions = []
    
    for symbol, basis in cost_basis.items():
        if basis['total_shares'] > 0:
            # Simplified: use a mock current value (in real app, fetch from market API)
            estimated_price = basis['total_cost'] / basis['total_shares'] if basis['total_shares'] > 0 else 0
            current_value = basis['total_shares'] * estimated_price * 1.1  # Assume 10% growth for demo
            
            positions.append({
                'symbol': symbol,
                'shares': basis['total_shares'],
                'value': current_value,
                'weight': 0  # Will be calculated later
            })
    
    return positions


def _compute_normalized_portfolio_performance(session: Session, user_id: int, positions: list[dict]) -> dict:
    """
    Compute portfolio performance normalized to $10,000 starting value, excluding money transfers.
    This treats the portfolio as if the user started with $10,000 and made only stock trades.
    """
    NORMALIZED_START_VALUE = 10000.0
    
    # Get cost basis (already excludes money transfers)
    cost_basis = _compute_cost_basis(session, user_id)
    
    if not cost_basis:
        return {
            'normalized_value': NORMALIZED_START_VALUE,
            'normalized_return_pct': 0.0,
            'total_invested': 0.0,
            'current_value': 0.0,
            'normalization_ratio': 1.0
        }
    
    # Calculate total money invested in stocks
    total_money_invested = sum(basis['total_cost'] for basis in cost_basis.values())
    
    if total_money_invested <= 0:
        return {
            'normalized_value': NORMALIZED_START_VALUE,
            'normalized_return_pct': 0.0,
            'total_invested': 0.0,
            'current_value': 0.0,
            'normalization_ratio': 1.0
        }
    
    # Calculate current portfolio value (only stocks, no cash)
    current_portfolio_value = sum(position.get('value', 0.0) for position in positions)
    
    # Calculate the normalization ratio
    # If user invested $5000 total, we normalize as if they invested $10,000
    normalization_ratio = NORMALIZED_START_VALUE / total_money_invested
    
    # Apply normalization to current value
    normalized_current_value = current_portfolio_value * normalization_ratio
    
    # Calculate percentage return based on actual money invested vs current value
    actual_return_pct = ((current_portfolio_value - total_money_invested) / total_money_invested) * 100 if total_money_invested > 0 else 0.0
    
    return {
        'normalized_value': normalized_current_value,
        'normalized_return_pct': actual_return_pct,  # Use actual return percentage
        'total_invested': total_money_invested,
        'current_value': current_portfolio_value,
        'normalization_ratio': normalization_ratio
    }


def _compute_time_weighted_return(
    session: Session,
    user_id: int,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """
    Daily Time-Weighted Return (TWR):
    Because our stored portfolio history reflects equity-only valuations rebuilt from final
    positions (and does not model cash flows), subtracting external cash flows would
    distort returns. We therefore compute pure time-weighted daily returns as
    r_t = V_t / V_{t-1} - 1, and compound them: Π(1+r_t) - 1. Annualize if window > 365 days.
    """
    rows = session.exec(
        select(PortfolioHistoryRecord)
        .where(PortfolioHistoryRecord.user_id == user_id)
        .order_by(PortfolioHistoryRecord.date)
    ).all()

    if not rows or len(rows) < 2:
        return {"twr": 0.0, "twr_pct": 0.0, "days": 0, "annualized_pct": 0.0}

    def _in_range(d: str) -> bool:
        if start_date and d < start_date:
            return False
        if end_date and d > end_date:
            return False
        return True

    history = [r for r in rows if _in_range(r.date)]
    if len(history) < 2:
        history = rows

    ordered_dates = [r.date for r in history]
    values_by_date = {r.date: float(r.total_value or 0.0) for r in history}

    # We intentionally ignore external cash flows here because history is equity-only
    flow_by_date: dict[str, float] = {}

    product = 1.0
    days = 0
    for i in range(1, len(ordered_dates)):
        d_prev = ordered_dates[i - 1]
        d_curr = ordered_dates[i]
        v_prev = values_by_date.get(d_prev, 0.0)
        v_curr = values_by_date.get(d_curr, 0.0)
        if v_prev <= 0:
            continue
        # Ignore external flows; compute pure time-weighted return
        r_t = (v_curr / v_prev) - 1.0
        product *= (1.0 + r_t)
        days += 1

    twr = product - 1.0
    twr_pct = round(twr * 100.0, 4)
    annualized_pct = 0.0
    if days > 365:
        try:
            annualized = (1.0 + twr) ** (365.0 / days) - 1.0
            annualized_pct = round(annualized * 100.0, 4)
        except Exception:
            annualized_pct = twr_pct

    return {"twr": twr, "twr_pct": twr_pct, "days": days, "annualized_pct": annualized_pct}


def _compute_contribution_adjusted_return(
    session: Session,
    user_id: int,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """
    Compute contribution-adjusted net return over a window.
    Returns net_profit = ending_value - starting_value - net_external_contributions
    and two percentages:
      - pct_of_start = net_profit / starting_value
      - pct_of_start_plus_contrib = net_profit / max(starting_value + max(net_contrib, 0), 1e-9)
    External contributions are transactions that are NOT stock/ETF trades (e.g., deposits/withdrawals).
    """
    rows = session.exec(
        select(PortfolioHistoryRecord)
        .where(PortfolioHistoryRecord.user_id == user_id)
        .order_by(PortfolioHistoryRecord.date)
    ).all()
    if not rows or len(rows) < 2:
        return {
            "start_value": 0.0,
            "end_value": 0.0,
            "net_contributions": 0.0,
            "net_profit": 0.0,
            "pct_of_start": 0.0,
            "pct_of_start_plus_contrib": 0.0,
            "start_date": start_date,
            "end_date": end_date,
        }

    def _in_range(d: str) -> bool:
        if start_date and d < start_date:
            return False
        if end_date and d > end_date:
            return False
        return True

    history = [r for r in rows if _in_range(r.date)] or rows
    history = sorted(history, key=lambda r: r.date)
    start_value = float(history[0].total_value or 0.0)
    end_value = float(history[-1].total_value or 0.0)

    # Sum external flows (deposits/withdrawals) within (start_date, end_date]
    tx_all = session.exec(
        select(TransactionRecord).where(TransactionRecord.user_id == user_id)
    ).all()
    flows = [t for t in tx_all if not _is_stock_transaction(t.action, t.symbol)]

    # If no explicit range, use history bounds
    start_bound = history[0].date
    end_bound = history[-1].date

    net_contrib = 0.0
    for t in flows:
        if t.date <= end_bound and t.date > start_bound:
            net_contrib += float(t.amount or 0.0)

    net_profit = end_value - start_value - net_contrib
    pct_of_start = (net_profit / start_value * 100.0) if start_value > 0 else 0.0
    denom = start_value + max(net_contrib, 0.0)
    pct_of_start_plus = (net_profit / denom * 100.0) if denom > 0 else 0.0

    return {
        "start_value": round(start_value, 2),
        "end_value": round(end_value, 2),
        "net_contributions": round(net_contrib, 2),
        "net_profit": round(net_profit, 2),
        "pct_of_start": round(pct_of_start, 4),
        "pct_of_start_plus_contrib": round(pct_of_start_plus, 4),
        "start_date": start_bound,
        "end_date": end_bound,
    }


def _compute_deposit_averaged_return(session: Session, user_id: int) -> dict:
    """
    Tranche-based return attribution:
      - Identify external deposits (positive non-stock Amounts) as tranches.
      - Allocate subsequent buy cash against tranches FIFO to create lots with cost/share.
      - Handle sells FIFO across lots to realize PnL in their originating tranches.
      - Value remaining lots at current prices from latest portfolio snapshot.
      - For each tranche: return_pct = (realized_pnl + unrealized_pnl) / invested_cash.
      - Also return arithmetic average across tranches and capital-weighted average.
    """
    # Current prices from latest snapshot
    latest_row = session.exec(
        select(PortfolioHistoryRecord)
        .where(PortfolioHistoryRecord.user_id == user_id)
        .order_by(PortfolioHistoryRecord.date.desc())
        .limit(1)
    ).first()
    if not latest_row:
        return {"periods": [], "avg_return_pct": 0.0, "weighted_avg_return_pct": 0.0}
    try:
        latest_positions = {p.get('symbol'): float(p.get('price', 0.0)) for p in json.loads(latest_row.positions_json or '[]') if p.get('symbol')}
    except Exception:
        latest_positions = {}

    # Load transactions in chronological order
    all_tx = session.exec(
        select(TransactionRecord)
        .where(TransactionRecord.user_id == user_id)
        .order_by(TransactionRecord.date)
    ).all()
    if not all_tx:
        return {"periods": [], "avg_return_pct": 0.0, "weighted_avg_return_pct": 0.0}

    # Build tranches from deposits
    class Tranche:
        __slots__ = ("date", "amount", "remaining_cash", "lots", "realized_pnl")
        def __init__(self, date: str, amount: float) -> None:
            self.date = date
            self.amount = amount
            self.remaining_cash = amount
            self.lots: list[dict] = []  # {symbol, shares, cost_per_share}
            self.realized_pnl = 0.0

    tranches: list[Tranche] = []
    # FIFO queue of (tranche_index) for allocating buys
    tranche_queue: list[int] = []

    for tx in all_tx:
        if not _is_stock_transaction(tx.action, tx.symbol):
            # External movement
            amt = float(tx.amount or 0.0)
            if amt > 0:  # deposit
                t = Tranche(tx.date, amt)
                tranches.append(t)
                tranche_queue.append(len(tranches) - 1)
            continue

        symbol = tx.symbol
        if not symbol:
            continue
        action = (tx.action or '').upper()
        qty = float(tx.quantity or 0.0)
        amt = float(tx.amount or 0.0)

        if 'BUY' in action or 'BOUGHT' in action:
            buy_cost = abs(amt)
            shares_left_to_allocate = abs(qty)
            # Allocate buy cost/shares across tranches FIFO
            while buy_cost > 1e-9 and shares_left_to_allocate > 1e-9 and tranche_queue:
                idx = tranche_queue[0]
                tr = tranches[idx]
                if tr.remaining_cash <= 1e-9:
                    tranche_queue.pop(0)
                    continue
                allocate_cash = min(buy_cost, tr.remaining_cash)
                # Proportion of shares for this cash
                proportion = allocate_cash / buy_cost if buy_cost > 0 else 0.0
                allocate_shares = shares_left_to_allocate * proportion
                cost_per_share = allocate_cash / max(allocate_shares, 1e-9)
                tr.lots.append({"symbol": symbol, "shares": allocate_shares, "cost_per_share": cost_per_share})
                tr.remaining_cash -= allocate_cash
                buy_cost -= allocate_cash
                shares_left_to_allocate -= allocate_shares
                if tr.remaining_cash <= 1e-9:
                    tranche_queue.pop(0)
            # If buys exceed deposits, ignore excess (treated as re-invested proceeds)

        elif 'SELL' in action or 'SOLD' in action:
            shares_to_sell_total = abs(qty)
            proceeds = abs(amt)
            sell_avg_price = proceeds / max(shares_to_sell_total, 1e-9)
            shares_to_sell = shares_to_sell_total
            # Reduce lots FIFO across tranches holding this symbol
            # Use transaction's average sell price to apportion proceeds
            for tr in tranches:
                if shares_to_sell <= 1e-9:
                    break
                for lot in tr.lots:
                    if shares_to_sell <= 1e-9:
                        break
                    if lot["symbol"] != symbol or lot["shares"] <= 1e-9:
                        continue
                    take = min(lot["shares"], shares_to_sell)
                    cost_removed = take * lot["cost_per_share"]
                    proceeds_for_take = take * sell_avg_price
                    tr.realized_pnl += proceeds_for_take - cost_removed
                    lot["shares"] -= take
                    shares_to_sell -= take

    # Now compute unrealized PnL per tranche using latest prices
    periods: list[dict] = []
    pct_list: list[float] = []
    invested_list: list[float] = []
    for tr in tranches:
        invested = sum(l["shares"] * l["cost_per_share"] for l in tr.lots) + (tr.amount - tr.remaining_cash - sum(l["shares"] * l["cost_per_share"] for l in tr.lots))
        # invested cash is sum allocated to buys (original amount - remaining cash)
        invested = tr.amount - tr.remaining_cash
        if invested <= 1e-9:
            continue
        unrealized = 0.0
        for l in tr.lots:
            price_now = latest_positions.get(l["symbol"], 0.0)
            if price_now > 0 and l["shares"] > 1e-9:
                unrealized += l["shares"] * (price_now - l["cost_per_share"]) 
        total_pnl = tr.realized_pnl + unrealized
        ret = total_pnl / invested
        periods.append({
            "start": tr.date,
            "end": latest_row.date,
            "invested": round(invested, 2),
            "realized_pnl": round(tr.realized_pnl, 2),
            "unrealized_pnl": round(unrealized, 2),
            "return_pct": round(ret * 100.0, 4),
        })
        pct_list.append(ret)
        invested_list.append(invested)

    avg_simple = (sum(pct_list) / len(pct_list) * 100.0) if pct_list else 0.0
    weighted = 0.0
    total_inv = sum(invested_list)
    if total_inv > 1e-9:
        weighted = sum(p * w for p, w in zip(pct_list, invested_list)) / total_inv * 100.0
    return {
        "periods": periods,
        "avg_return_pct": round(avg_simple, 4),
        "weighted_avg_return_pct": round(weighted, 4),
    }


def _compute_badges(session: Session, user_id: int, positions: list[dict]) -> dict:
    badges = {}
    
    # Get all transactions for the user, then filter to only stock transactions
    all_transactions = session.exec(
        select(TransactionRecord).where(TransactionRecord.user_id == user_id)
    ).all()
    
    # Filter to only legitimate stock/ETF transactions (exclude money transfers)
    stock_transactions = [tx for tx in all_transactions if _is_stock_transaction(tx.action, tx.symbol)]
    
    # 1. FIRST STEP - First trade badge
    if stock_transactions:
        first_trade = min(stock_transactions, key=lambda t: t.date)
        badges["first_step"] = {
            "name": "First Step",
            "description": "Awarded for making your very first trade and officially joining the market action",
            "date_earned": first_trade.date,
            "symbol": first_trade.symbol
        }
    
    # 2. BULL RUN - 10% growth in one month
    portfolio_history = session.exec(
        select(PortfolioHistoryRecord)
        .where(PortfolioHistoryRecord.user_id == user_id)
        .order_by(PortfolioHistoryRecord.date.desc())
        .limit(30)
    ).all()
    
    if len(portfolio_history) >= 2:
        recent_value = portfolio_history[0].total_value or 0
        month_ago_value = portfolio_history[-1].total_value or 0
        if month_ago_value > 0:
            monthly_growth = ((recent_value - month_ago_value) / month_ago_value) * 100
            if monthly_growth >= 10:  # Changed from 20% to 10%
                badges["bull_run"] = {
                    "name": "Bull Run",
                    "description": f"Earned by growing your portfolio by {monthly_growth:.1f}% in a single month",
                    "growth_percentage": monthly_growth
                }
    
    # 3. TRENDSETTER - When others copy your trades (simplified simulation)
    # For now, we'll award this based on having profitable trades that others might want to copy
    cost_basis = _compute_cost_basis(session, user_id)
    profitable_trades = []
    for p in positions:
        sym = p.get('symbol')
        if not sym:
            continue
        basis = cost_basis.get(sym)
        if not basis or basis['total_cost'] <= 0:
            continue
        gain_pct = ((p.get('value', 0.0) - basis['total_cost']) / basis['total_cost']) * 100.0
        if gain_pct > 15:  # Significant gain that others might copy
            profitable_trades.append((sym, gain_pct))
    
    if len(profitable_trades) >= 3:  # Has multiple good trades
        badges["trendsetter"] = {
            "name": "Trendsetter",
            "description": f"Given for having {len(profitable_trades)} highly profitable trades others would want to copy",
            "profitable_count": len(profitable_trades)
        }
    
    # 4. SECTOR SAMURAI - Profit in multiple sectors (simplified)
    # Map common symbols to sectors for demo purposes
    sector_mapping = {
        'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology',
        'TSLA': 'Consumer Discretionary', 'AMZN': 'Consumer Discretionary',
        'JPM': 'Financials', 'BAC': 'Financials', 'WFC': 'Financials',
        'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare',
        'XOM': 'Energy', 'CVX': 'Energy',
        'KO': 'Consumer Staples', 'PG': 'Consumer Staples',
        'BA': 'Industrials', 'CAT': 'Industrials',
        'VZ': 'Communication Services', 'T': 'Communication Services',
        'NEE': 'Utilities',
        'SPY': 'ETF', 'QQQ': 'ETF', 'PLTR': 'Technology'
    }
    
    profitable_sectors = set()
    for p in positions:
        sym = p.get('symbol')
        if not sym:
            continue
        basis = cost_basis.get(sym)
        if not basis or basis['total_cost'] <= 0:
            continue
        gain_pct = ((p.get('value', 0.0) - basis['total_cost']) / basis['total_cost']) * 100.0
        if gain_pct > 0 and sym in sector_mapping:
            profitable_sectors.add(sector_mapping[sym])
    
    if len(profitable_sectors) >= 5:  # Profitable in 5+ sectors
        badges["sector_samurai"] = {
            "name": "Sector Samurai",
            "description": f"Unlocked by making a profit in {len(profitable_sectors)} different market sectors",
            "sectors_count": len(profitable_sectors),
            "sectors": list(profitable_sectors)
        }
    
    # 5. ALWAYS UP - Portfolio green when market is down
    # Check if user has positive returns while SPY had negative returns (simplified)
    user_total_gain = 0
    total_cost = 0
    for p in positions:
        sym = p.get('symbol')
        if not sym:
            continue
        basis = cost_basis.get(sym)
        if basis:
            user_total_gain += p.get('value', 0.0) - basis['total_cost']
            total_cost += basis['total_cost']
    
    if total_cost > 0:
        user_return_pct = (user_total_gain / total_cost) * 100
        # For demo, award if user has >5% positive returns (in real app, compare with SPY)
        if user_return_pct > 5:
            badges["always_up"] = {
                "name": "Always Up",
                "description": f"Achieved when your portfolio is up {user_return_pct:.1f}% during market uncertainty",
                "return_percentage": user_return_pct
            }
    
    # Legacy badges for backward compatibility
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
    
    if perf_list:
        best_perf = max(perf_list, key=lambda x: x[1])
        if best_perf[1] > 10:
            badges["best_find"] = f"{best_perf[0]} (+{best_perf[1]:.1f}%)"
    
    # Researcher badge
    note_count = session.exec(
        select(GroupNote)
        .where(GroupNote.user_id == user_id)
    ).all()
    
    if len(note_count) >= 5:
        badges["researcher"] = {
            "name": "Researcher", 
            "description": f"Contributed {len(note_count)} research notes to the community",
            "notes_count": len(note_count)
        }
    
    return badges


def _increment_streak(session: Session, user_id: int, kind: str) -> None:
    today = datetime.utcnow().strftime('%Y-%m-%d')
    record = session.exec(select(StreakRecord).where((StreakRecord.user_id == user_id) & (StreakRecord.kind == kind))).first()
    if not record:
        record = StreakRecord(user_id=user_id, kind=kind, current_streak=1, longest_streak=1, last_date=today)
        session.add(record)
        session.commit()
        return
    # if last event was yesterday, increment; if today, no-op; else reset
    try:
        last_dt = datetime.strptime(record.last_date or today, '%Y-%m-%d')
        delta = (datetime.strptime(today, '%Y-%m-%d') - last_dt).days
        if delta == 0:
            return
        elif delta == 1:
            record.current_streak += 1
        else:
            record.current_streak = 1
        record.longest_streak = max(record.longest_streak, record.current_streak)
        record.last_date = today
        session.add(record)
        session.commit()
    except Exception:
        record.current_streak = max(1, record.current_streak)
        record.last_date = today
        session.add(record)
        session.commit()


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
        
        # Get growth data (all portfolio history, ordered chronologically)
        growth_data = []
        history_rows = session.exec(
            select(PortfolioHistoryRecord)
            .where(PortfolioHistoryRecord.user_id == m.user_id)
            .order_by(PortfolioHistoryRecord.date.asc())  # Ascending for chronological order
        ).all()
        
        for record in history_rows:
            if record.total_value and record.total_value > 0:  # Only include records with valid data
                    growth_data.append({
                    "date": record.date if isinstance(record.date, str) else str(record.date),
                    "value": float(record.total_value)
                })
        
        # If no portfolio history exists, generate growth data from transaction history
        if not growth_data and enriched:
            # Get all transactions for this user, then filter to stock transactions only
            all_user_transactions = session.exec(
                select(TransactionRecord)
                .where(TransactionRecord.user_id == m.user_id)
                .order_by(TransactionRecord.date.asc())
            ).all()
            
            # Filter to only legitimate stock/ETF transactions (exclude money transfers)
            stock_transactions = [tx for tx in all_user_transactions if _is_stock_transaction(tx.action, tx.symbol)]
            
            if stock_transactions:
                from datetime import datetime, timedelta
                import yfinance as yf
                
                # Get normalized performance for scaling
                normalized_perf = _compute_normalized_portfolio_performance(session, m.user_id, enriched)
                
                # Create weekly snapshots over the last 3 months using normalized values
                end_date = datetime.now()
                start_date = end_date - timedelta(days=90)
                
                # Calculate total money invested for normalization
                total_money_invested = normalized_perf.get('total_invested', 0)
                normalization_ratio = 10000.0 / total_money_invested if total_money_invested > 0 else 1.0
                
                # Calculate portfolio value for each week
                for week in range(13):  # 13 weeks = ~3 months
                    snapshot_date = start_date + timedelta(weeks=week)
                    
                    # Find transactions up to this date
                    relevant_transactions = [
                        tx for tx in stock_transactions 
                        if datetime.strptime(tx.date, '%Y-%m-%d') <= snapshot_date
                    ]
                    
                    # Calculate portfolio composition at this date
                    holdings = {}
                    total_invested_to_date = 0
                    for tx in relevant_transactions:
                        if tx.symbol not in holdings:
                            holdings[tx.symbol] = 0
                        
                        if tx.action in ["Buy", "Sell", "BOUGHT", "SOLD"]:
                            quantity = tx.quantity or 0
                            if tx.action in ["Sell", "SOLD"]:
                                quantity = -quantity
                            else:
                                total_invested_to_date += abs(tx.amount or 0)
                            holdings[tx.symbol] += quantity
                    
                    # Calculate normalized portfolio value
                    total_value = 0
                    for symbol, shares in holdings.items():
                        if shares > 0:
                            # Find current value from enriched data
                            current_stock = next((s for s in enriched if s['symbol'] == symbol), None)
                            if current_stock:
                                # Estimate historical value with some variation
                                price_per_share = current_stock['value'] / (current_stock.get('shares', 1) or 1)
                                # Add some historical variation (simulate market movements)
                                historical_multiplier = 0.85 + (week / 13) * 0.3  # Gradual growth pattern
                                estimated_value = shares * price_per_share * historical_multiplier
                                total_value += max(0, estimated_value)
                    
                    # Apply normalization to simulate $10,000 starting value
                    if total_invested_to_date > 0:
                        week_normalization_ratio = 10000.0 / total_invested_to_date
                        normalized_value = total_value * week_normalization_ratio
                    else:
                        normalized_value = 10000.0  # Starting value
                    
                    if normalized_value > 0:
                        growth_data.append({
                            "date": snapshot_date.strftime("%Y-%m-%d"),
                            "value": normalized_value
                        })
                
                # If we still don't have data, create a simple upward trend starting from $10,000
                if not growth_data:
                    for i in range(30):
                        date = end_date - timedelta(days=29-i)
                        # Create a growth pattern with some volatility starting from $10,000
                        base_multiplier = 0.9 + (i / 30) * 0.4  # From 90% to 130% of $10,000
                        noise = (i % 7 - 3) * 0.01  # Add some weekly noise
                        value = 10000.0 * (base_multiplier + noise)
                        growth_data.append({
                            "date": date.strftime("%Y-%m-%d"),
                            "value": max(9000, value)  # Floor at $9,000
                        })
        
        # Get actual watchlist data from StockListItem table
        watchlist_items = session.exec(
            select(StockListItem)
            .where((StockListItem.user_id == m.user_id) & (StockListItem.list_type == "watch"))
        ).all()
        
        watchlist = []
        for item in watchlist_items:
            # Get any personal notes for this stock
            note_record = session.exec(
                select(StockNote)
                .where((StockNote.user_id == m.user_id) & (StockNote.symbol == item.symbol))
            ).first()
            
            watchlist.append({
                "symbol": item.symbol,
                "note": note_record.content if note_record else f"Added to watchlist on {item.added_at or 'unknown date'}"
            })
        
        # If no watchlist items, use top holdings as fallback
        if not watchlist:
            for stock in enriched[:3]:  # Use top 3 holdings as sample watchlist
                watchlist.append({
                    "symbol": stock["symbol"],
                    "note": f"Currently {stock['weight']:.1f}% of portfolio"
                })
        
        display_name = user.name or user.email.split("@")[0]
        data.append({
            "user_id": m.user_id, 
            "name": display_name, 
            "weights": enriched, 
            "badges": badges,
            "growth_data": growth_data,
            "watchlist": watchlist
        })
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


# =====================
# Social: Lists, Notes, Preferences, Feed, Streaks, Recommendations, Group Notes/Ratings
# =====================

class ListPayload(BaseModel):
    symbol: str
    list_type: str  # owned | watch | wishlist


@app.post("/api/social/list")
async def add_to_list(payload: ListPayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    item = StockListItem(user_id=current_user.id, symbol=payload.symbol.upper(), list_type=payload.list_type)
    session.add(item)
    session.add(SocialAction(user_id=current_user.id, type=f"add_{payload.list_type}", symbol=payload.symbol.upper()))
    session.commit()
    return {"ok": True}


@app.get("/api/social/list")
async def get_lists(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    items = session.exec(select(StockListItem).where(StockListItem.user_id == current_user.id)).all()
    out: dict[str, list[str]] = {"owned": [], "watch": [], "wishlist": []}
    for i in items:
        out.setdefault(i.list_type, []).append(i.symbol)
    return {"lists": out}


class NotePayload(BaseModel):
    symbol: str
    content: str
    labels: list[str] | None = None
    screenshot_url: str | None = None


@app.post("/api/social/notes")
async def add_note(payload: NotePayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    note = StockNote(
        user_id=current_user.id,
        symbol=payload.symbol.upper(),
        content=payload.content,
        labels_json=json.dumps(payload.labels or []),
        screenshot_url=payload.screenshot_url,
    )
    session.add(note)
    session.add(SocialAction(user_id=current_user.id, type="note", symbol=payload.symbol.upper(), note="added note"))
    session.commit()
    return {"ok": True}


@app.get("/api/social/notes")
async def list_notes(symbol: str | None = None, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    query = select(StockNote).where(StockNote.user_id == current_user.id)
    if symbol:
        query = query.where(StockNote.symbol == symbol.upper())
    notes = session.exec(query).all()
    return {"notes": [
        {"id": n.id, "symbol": n.symbol, "content": n.content, "labels": json.loads(n.labels_json or "[]"), "screenshot_url": n.screenshot_url, "created_at": n.created_at.isoformat()} for n in notes
    ]}


class VotePayload(BaseModel):
    symbol_a: str
    symbol_b: str
    winner: str


@app.post("/api/social/preferences")
async def add_preference_vote(payload: VotePayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    vote = PreferenceVote(user_id=current_user.id, symbol_a=payload.symbol_a.upper(), symbol_b=payload.symbol_b.upper(), winner=payload.winner.upper())
    session.add(vote)
    session.commit()
    return {"ok": True}


@app.get("/api/social/preferences/score")
async def preference_scores(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    votes = session.exec(select(PreferenceVote).where(PreferenceVote.user_id == current_user.id)).all()
    score: dict[str, int] = {}
    for v in votes:
        score[v.winner] = score.get(v.winner, 0) + 1
        loser = v.symbol_b if v.winner == v.symbol_a else v.symbol_a
        score[loser] = score.get(loser, 0)
    ranked = sorted([{"symbol": s, "score": sc} for s, sc in score.items()], key=lambda x: x[1], reverse=True)
    return {"rankings": ranked}


@app.get("/api/social/feed")
async def social_feed(limit: int = 25, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    actions = session.exec(select(SocialAction).order_by(SocialAction.created_at.desc()).limit(limit)).all()
    users = {u.id: u for u in session.exec(select(User)).all()}
    feed = []
    for a in actions:
        u = users.get(a.user_id)
        feed.append({
            "user": (u.name or u.email.split("@")[0]) if u else f"User {a.user_id}",
            "type": a.type,
            "symbol": a.symbol,
            "quantity": a.quantity,
            "amount": a.amount,
            "note": a.note,
            "group_id": a.group_id,
            "created_at": a.created_at.isoformat()
        })
    return {"feed": feed}


@app.get("/api/social/streaks")
async def get_streaks(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(StreakRecord).where(StreakRecord.user_id == current_user.id)).all()
    return {"streaks": [
        {"kind": r.kind, "current": r.current_streak, "longest": r.longest_streak, "last_date": r.last_date}
        for r in rows
    ]}


@app.get("/api/social/recommendations")
async def recommendations(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Very simple heuristic recommendation: most-voted symbols not yet owned, or top performers among peers
    votes = session.exec(select(PreferenceVote).where(PreferenceVote.user_id == current_user.id)).all()
    voted_symbols = {v.winner for v in votes}
    # Symbols owned (latest snapshot)
    rows = session.exec(select(PortfolioHistoryRecord).where(PortfolioHistoryRecord.user_id == current_user.id)).all()
    owned = set()
    if rows:
        latest = max(rows, key=lambda r: r.date)
        for p in json.loads(latest.positions_json or "[]"):
            if p.get('symbol'):
                owned.add(p['symbol'])
    candidates = list(voted_symbols - owned)
    return {"picks": candidates[:5]}


class GroupNotePayload(BaseModel):
    symbol: str
    rating: int
    content: str


@app.post("/api/groups/{group_id}/notes")
async def add_group_note(group_id: int, payload: GroupNotePayload, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    r = int(payload.rating)
    if r < 1 or r > 10:
        raise HTTPException(status_code=400, detail="Rating must be 1-10")
    note = GroupNote(group_id=group_id, user_id=current_user.id, symbol=payload.symbol.upper(), rating=r, content=payload.content)
    session.add(note)
    session.commit()
    return {"ok": True, "id": note.id}


@app.get("/api/groups/{group_id}/notes")
async def list_group_notes(
    group_id: int,
    symbol: str | None = None,
    user_id: int | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _ensure_group_membership(session, group_id, current_user.id)
    q = select(GroupNote).where(GroupNote.group_id == group_id)
    if symbol:
        q = q.where(GroupNote.symbol == symbol.upper())
    if user_id:
        q = q.where(GroupNote.user_id == user_id)
    rows = session.exec(q).all()
    users = {u.id: u for u in session.exec(select(User)).all()}
    data = [{
        "id": n.id,
        "symbol": n.symbol,
        "rating": n.rating,
        "content": n.content,
        "author": users.get(n.user_id).name if users.get(n.user_id) else f"User {n.user_id}",
        "created_at": n.created_at.isoformat(),
    } for n in rows]
    # Aggregated summary per symbol
    summary: dict[str, dict] = {}
    for n in rows:
        s = summary.setdefault(n.symbol, {"count": 0, "avg": 0.0})
        s["count"] += 1
        s["avg"] += n.rating
    for sym, s in summary.items():
        if s["count"]:
            s["avg"] = round(s["avg"] / s["count"], 2)
    return {"notes": data, "summary": summary}

@app.post("/api/groups/{group_id}/weekly/upload")
async def upload_group_weekly_csv(
    group_id: int,
    week: str,
    replace: bool = False,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _ensure_group_membership(session, group_id, current_user.id)
    try:
        datetime.strptime(week, '%Y-%m-%d')
    except Exception:
        raise HTTPException(status_code=400, detail="week must be YYYY-MM-DD (Monday)")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    df = pd.read_csv(pd.io.common.StringIO(contents.decode('utf-8')), dtype=str).fillna("")
    is_fidelity = all(col in df.columns for col in ['Run Date', 'Action', 'Symbol'])
    is_schwab = all(col in df.columns for col in ['Date', 'Action', 'Symbol']) and (
        'Amount' in df.columns or 'Amount ($)' in df.columns
    )
    if not (is_fidelity or is_schwab):
        raise HTTPException(status_code=400, detail="Unsupported CSV format for weekly upload")

    if replace:
        session.query(WeeklyTransaction).filter(
            (WeeklyTransaction.group_id == group_id) & (WeeklyTransaction.user_id == current_user.id) & (WeeklyTransaction.week_start == week)
        ).delete()
        session.query(WeeklyUpload).filter(
            (WeeklyUpload.group_id == group_id) & (WeeklyUpload.user_id == current_user.id) & (WeeklyUpload.week_start == week)
        ).delete()
        session.commit()

    tx: list[WeeklyTransaction] = []
    source = 'fidelity' if is_fidelity else 'schwab'
    if is_fidelity:
        for _, row in df.iterrows():
            symbol = str(row.get('Symbol', '')).strip()
            if not symbol:
                continue
            run_date = row.get('Run Date', '')
            settle_date = row.get('Settlement Date', '') if 'Settlement Date' in df.columns else ""
            date_dt = _parse_date(settle_date or run_date)
            tx.append(WeeklyTransaction(
                group_id=group_id,
                user_id=current_user.id,
                week_start=week,
                date=date_dt.strftime('%Y-%m-%d'),
                action=str(row.get('Action', '')).strip(),
                symbol=symbol,
                quantity=_parse_number(row.get('Quantity', '')),
                price=_parse_number(row.get('Price ($)', '')),
                amount=_parse_number(row.get('Amount ($)', '')),
            ))
    else:
        amount_col = 'Amount' if 'Amount' in df.columns else 'Amount ($)'
        price_col = 'Price' if 'Price' in df.columns else 'Price ($)'
        qty_col = 'Quantity' if 'Quantity' in df.columns else 'Qty'
        for _, row in df.iterrows():
            symbol = str(row.get('Symbol', '')).strip()
            action = str(row.get('Action', '')).strip()
            date_dt = _parse_date(row.get('Date', ''))
            tx.append(WeeklyTransaction(
                group_id=group_id,
                user_id=current_user.id,
                week_start=week,
                date=date_dt.strftime('%Y-%m-%d'),
                action=action,
                symbol=symbol,
                quantity=_parse_number(row.get(qty_col, '')),
                price=_parse_number(row.get(price_col, '')),
                amount=_parse_number(row.get(amount_col, '')),
            ))

    session.add_all(tx)
    session.add(WeeklyUpload(group_id=group_id, user_id=current_user.id, week_start=week, source=source, transactions_count=len(tx)))
    session.commit()
    return {"ok": True, "count": len(tx)}

@app.get("/api/groups/{group_id}/weekly/summary")
async def group_weekly_summary(group_id: int, week: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    try:
        datetime.strptime(week, '%Y-%m-%d')
    except Exception:
        raise HTTPException(status_code=400, detail="week must be YYYY-MM-DD (Monday)")

    # Collect members with uploads or fallback to group members list
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    user_ids = [m.user_id for m in members]

    # Build symbol set traded this week
    user_to_trades: dict[int, list[WeeklyTransaction]] = {}
    symbols: set[str] = set()
    for uid in user_ids:
        rows = session.exec(select(WeeklyTransaction).where((WeeklyTransaction.group_id == group_id) & (WeeklyTransaction.user_id == uid) & (WeeklyTransaction.week_start == week))).all()
        if rows:
            user_to_trades[uid] = rows
            for r in rows:
                if r.symbol:
                    symbols.add(r.symbol.upper())

    # Compute weekly price changes per symbol
    symbol_changes = {sym: _symbol_week_change(session, sym, week) for sym in sorted(symbols)}

    # Per-user stats: average of their trade symbols, list of trades with pct, and portfolio TWR for week
    users_stats: dict[int, dict] = {}
    for uid, trades in user_to_trades.items():
        per_trade: list[dict] = []
        for t in trades:
            change = symbol_changes.get(t.symbol.upper())
            pct = change.get("pct") if change else 0.0
            # For clarity distinguish buy vs sell coloring on the frontend only
            per_trade.append({
                "date": t.date,
                "action": t.action,
                "symbol": t.symbol,
                "quantity": t.quantity,
                "price": t.price,
                "amount": t.amount,
                "pct_change": pct,
            })
        avg = sum(x["pct_change"] for x in per_trade) / len(per_trade) if per_trade else 0.0
        best = max(per_trade, key=lambda x: x["pct_change"]) if per_trade else None
        worst = min(per_trade, key=lambda x: x["pct_change"]) if per_trade else None
        portfolio = _compute_user_weekly_portfolio_twr(session, uid, week)
        weekly_badges = _compute_weekly_badges(session, group_id, uid, week)
        users_stats[uid] = {
            "avg_pct": round(avg, 4),
            "best": best,
            "worst": worst,
            "trades": per_trade,
            "portfolio": portfolio,
            "weekly_badges": weekly_badges,
        }

    return {"symbol_changes": symbol_changes, "users": users_stats}

@app.get("/api/groups/{group_id}/weekly/leaderboard")
async def group_weekly_leaderboard(group_id: int, week: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    try:
        datetime.strptime(week, '%Y-%m-%d')
    except Exception:
        raise HTTPException(status_code=400, detail="week must be YYYY-MM-DD (Monday)")

    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    entries: list[dict] = []
    for m in members:
        perf = _compute_user_weekly_portfolio_twr(session, m.user_id, week)
        twr_pct = perf.get("twr_pct", 0.0)
        gain = perf.get("gain_usd", 0.0)
        weekly_badges = _compute_weekly_badges(session, group_id, m.user_id, week)
        entries.append({
            "user_id": m.user_id,
            "twr_pct": round(twr_pct, 4),
            "gain_usd": round(gain, 2),
            "weekly_badges": weekly_badges,
        })
    entries.sort(key=lambda x: x["twr_pct"], reverse=True)
    return {"week": week, "leaderboard": entries}

@app.get("/api/groups/{group_id}/weekly/member_symbols")
async def group_weekly_member_symbols(group_id: int, user_id: int, week: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    _ensure_group_membership(session, group_id, current_user.id)
    # Ensure requested user is also a member of the group
    member = session.exec(select(GroupMember).where((GroupMember.group_id == group_id) & (GroupMember.user_id == user_id))).first()
    if not member:
        raise HTTPException(status_code=404, detail="user not in group")
    try:
        datetime.strptime(week, '%Y-%m-%d')
    except Exception:
        raise HTTPException(status_code=400, detail="week must be YYYY-MM-DD (Monday)")

    # Determine end of week and find last portfolio record on or before end
    start_str, end_str = _get_week_bounds(week)
    rec = session.exec(
        select(PortfolioHistoryRecord)
        .where((PortfolioHistoryRecord.user_id == user_id) & (PortfolioHistoryRecord.date <= end_str))
        .order_by(PortfolioHistoryRecord.date.desc())
    ).first()
    symbols: set[str] = set()
    if rec:
        try:
            for p in json.loads(rec.positions_json or '[]'):
                sym = (p.get('symbol') or '').upper().strip()
                if sym:
                    symbols.add(sym)
        except Exception:
            pass
    # Include symbols traded this week (if any weekly upload exists)
    weekly_rows = session.exec(select(WeeklyTransaction).where((WeeklyTransaction.group_id == group_id) & (WeeklyTransaction.user_id == user_id) & (WeeklyTransaction.week_start == week))).all()
    for r in weekly_rows:
        if r.symbol:
            symbols.add(r.symbol.upper())

    # Compute weekly change for each symbol
    results: list[dict] = []
    for sym in sorted(symbols):
        results.append(_symbol_week_change(session, sym, week))
    member_badges = _compute_weekly_badges(session, group_id, user_id, week)
    return {"user_id": user_id, "week": week, "symbols": results, "weekly_badges": member_badges}
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)