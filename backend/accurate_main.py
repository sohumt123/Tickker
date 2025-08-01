from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import os
import yfinance as yf
import uvicorn

app = FastAPI(title="Stock Portfolio Visualizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for processed data
portfolio_data = {
    "transactions": [],
    "portfolio_history": [],
    "symbols": [],
    "price_cache": {}
}

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

@app.get("/")
async def root():
    return {"message": "Stock Portfolio Visualizer API with REAL DATA", "version": "2.0.0"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        df = pd.read_csv(pd.io.common.StringIO(contents.decode('utf-8')))
        
        # Clean up the data
        df = df.dropna(subset=['Run Date', 'Action', 'Symbol'])
        df['Run Date'] = pd.to_datetime(df['Run Date'])
        df['Settlement Date'] = pd.to_datetime(df['Settlement Date'])
        
        # Process transactions
        transactions = []
        symbols = set()
        
        for _, row in df.iterrows():
            if pd.notna(row['Symbol']) and row['Symbol'] != '':
                # Use Settlement Date if available, otherwise Run Date
                date = row['Settlement Date'] if pd.notna(row['Settlement Date']) else row['Run Date']
                
                transaction = {
                    'date': date.strftime('%Y-%m-%d'),
                    'action': str(row['Action']),
                    'symbol': str(row['Symbol']),
                    'quantity': float(row['Quantity']) if pd.notna(row['Quantity']) else 0,
                    'price': float(row['Price ($)']) if pd.notna(row['Price ($)']) else 0,
                    'amount': float(row['Amount ($)']) if pd.notna(row['Amount ($)']) else 0,
                }
                transactions.append(transaction)
                symbols.add(str(row['Symbol']))
        
        # Store the data globally
        portfolio_data["transactions"] = transactions
        portfolio_data["symbols"] = list(symbols)
        
        # Clear cache for fresh data
        portfolio_data["price_cache"] = {}
        
        # Rebuild portfolio history with REAL prices
        rebuild_portfolio_history()
        
        return JSONResponse(content={
            "message": "CSV processed successfully with REAL stock data",
            "transactions_count": len(transactions),
            "symbols_found": list(symbols),
            "date_range": {
                "start": df['Run Date'].min().strftime('%Y-%m-%d'),
                "end": df['Run Date'].max().strftime('%Y-%m-%d')
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/portfolio/history")
async def get_portfolio_history():
    if not portfolio_data["portfolio_history"]:
        return JSONResponse(content={"history": []})
    
    return JSONResponse(content={"history": portfolio_data["portfolio_history"]})

@app.get("/api/portfolio/weights")
async def get_portfolio_weights():
    if not portfolio_data["portfolio_history"]:
        return JSONResponse(content={"weights": []})
    
    # Get latest portfolio state
    latest = portfolio_data["portfolio_history"][-1]
    positions = latest.get('positions', [])
    total_value = latest.get('total_value', 0)
    
    # Calculate cost basis for each position from transactions
    cost_basis = {}
    for trans in portfolio_data["transactions"]:
        symbol = trans['symbol']
        if symbol and symbol != 'Cash':
            if symbol not in cost_basis:
                cost_basis[symbol] = {'total_cost': 0, 'total_shares': 0}
            
            if 'BOUGHT' in trans['action'] or 'Buy' in trans['action']:
                cost_basis[symbol]['total_cost'] += abs(trans['amount'])
                cost_basis[symbol]['total_shares'] += trans['quantity']
            elif 'SOLD' in trans['action'] or 'Sell' in trans['action']:
                # For sales, reduce cost basis proportionally
                if cost_basis[symbol]['total_shares'] > 0:
                    avg_cost_per_share = cost_basis[symbol]['total_cost'] / cost_basis[symbol]['total_shares']
                    sold_cost = avg_cost_per_share * abs(trans['quantity'])
                    cost_basis[symbol]['total_cost'] -= sold_cost
                    cost_basis[symbol]['total_shares'] -= abs(trans['quantity'])
            elif 'REINVESTMENT' in trans['action']:
                cost_basis[symbol]['total_cost'] += abs(trans['amount'])
                cost_basis[symbol]['total_shares'] += trans['quantity']
    
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
async def get_recent_trades():
    if not portfolio_data["transactions"]:
        return JSONResponse(content={"trades": []})
    
    # Return most recent 20 trades
    recent = sorted(portfolio_data["transactions"], key=lambda x: x['date'], reverse=True)[:20]
    return JSONResponse(content={"trades": recent})

@app.get("/api/performance")
async def get_performance_metrics():
    if not portfolio_data["portfolio_history"]:
        return JSONResponse(content={"metrics": {}})
    
    df = pd.DataFrame(portfolio_data["portfolio_history"])
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
async def get_spy_comparison():
    if not portfolio_data["portfolio_history"]:
        return JSONResponse(content={"comparison": []})
    
    history = portfolio_data["portfolio_history"]
    if not history:
        return JSONResponse(content={"comparison": []})
    
    # Normalize to $10k starting value using REAL data
    initial_portfolio = history[0]['total_value']
    initial_spy = history[0]['spy_price']
    
    if initial_portfolio == 0 or initial_spy == 0:
        return JSONResponse(content={"comparison": []})
    
    comparison = []
    for record in history:
        portfolio_growth = (record['total_value'] / initial_portfolio) * 10000
        spy_growth = (record['spy_price'] / initial_spy) * 10000
        
        comparison.append({
            'date': record['date'],
            'portfolio': round(portfolio_growth, 2),
            'spy': round(spy_growth, 2)
        })
    
    return JSONResponse(content={"comparison": comparison})

@app.get("/api/search/stocks")
async def search_stocks(query: str):
    """Search and validate stock symbols using yfinance"""
    if not query or len(query.strip()) < 1:
        return JSONResponse(content={"results": []})
    
    query = query.strip().upper()
    
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
async def get_custom_comparison(symbols: str, start_date: str = None, end_date: str = None):
    """Get normalized growth comparison data for custom symbols along with portfolio and SPY"""
    if not portfolio_data["portfolio_history"]:
        return JSONResponse(content={"comparison": []})
    
    # Parse symbols
    symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
    if not symbol_list:
        return JSONResponse(content={"comparison": []})
    
    # Get portfolio history for date range
    history = portfolio_data["portfolio_history"]
    if not history:
        return JSONResponse(content={"comparison": []})
    
    # Filter by date range if provided
    if start_date or end_date:
        filtered_history = []
        for day in history:
            if start_date and day['date'] < start_date:
                continue
            if end_date and day['date'] > end_date:
                continue
            filtered_history.append(day)
        history = filtered_history
    
    if not history:
        return JSONResponse(content={"comparison": []})
    
    # Get date range from portfolio history
    start_dt = datetime.strptime(history[0]['date'], '%Y-%m-%d')
    end_dt = datetime.strptime(history[-1]['date'], '%Y-%m-%d')
    
    # Fetch custom symbol data
    custom_data = {}
    for symbol in symbol_list:
        try:
            prices = get_real_stock_data(symbol, start_dt, end_dt)
            if prices:
                custom_data[symbol] = prices
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
    
    # Build comparison data
    comparison = []
    initial_portfolio = history[0]['total_value']
    initial_spy = history[0]['spy_price']
    
    # Get initial prices for custom symbols
    initial_custom = {}
    first_date = history[0]['date']
    for symbol, prices in custom_data.items():
        # Find the closest date to portfolio start
        closest_price = None
        for date in sorted(prices.keys()):
            closest_price = prices[date]
            if date >= first_date:
                break
        if closest_price:
            initial_custom[symbol] = closest_price
    
    for day in history:
        date = day['date']
        
        # Portfolio and SPY (existing logic)
        portfolio_growth = (day['total_value'] / initial_portfolio) * 10000 if initial_portfolio > 0 else 10000
        spy_growth = (day['spy_price'] / initial_spy) * 10000 if initial_spy > 0 else 10000
        
        comparison_point = {
            'date': date,
            'portfolio': round(portfolio_growth, 2),
            'spy': round(spy_growth, 2)
        }
        
        # Add custom symbols
        for symbol in symbol_list:
            if symbol in custom_data and symbol in initial_custom:
                symbol_price = custom_data[symbol].get(date)
                if symbol_price and initial_custom[symbol] > 0:
                    symbol_growth = (symbol_price / initial_custom[symbol]) * 10000
                    comparison_point[symbol.lower()] = round(symbol_growth, 2)
                else:
                    # Use previous value or skip
                    if comparison and symbol.lower() in comparison[-1]:
                        comparison_point[symbol.lower()] = comparison[-1][symbol.lower()]
        
        comparison.append(comparison_point)
    
    return JSONResponse(content={"comparison": comparison})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)