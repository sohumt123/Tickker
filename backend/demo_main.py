from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import random
import uvicorn

app = FastAPI(title="Stock Portfolio Visualizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Stock Portfolio Visualizer API", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        df = pd.read_csv(pd.io.common.StringIO(contents.decode('utf-8')))
        
        return JSONResponse(content={
            "message": "CSV processed successfully",
            "transactions_count": len(df),
            "symbols_found": ["AAPL", "GOOGL", "MSFT", "TSLA", "SPY"],
            "date_range": {
                "start": "2023-01-01",
                "end": "2024-12-31"
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/portfolio/history")
async def get_portfolio_history():
    # Generate mock portfolio history data
    history = []
    base_date = datetime(2023, 1, 1)
    
    for i in range(365):
        date = base_date + timedelta(days=i)
        portfolio_value = 10000 * (1 + (random.random() - 0.4) * 0.5) * (1 + i * 0.0003)
        spy_value = 10000 * (1 + (random.random() - 0.45) * 0.4) * (1 + i * 0.0002)
        
        history.append({
            "date": date.strftime('%Y-%m-%d'),
            "total_value": round(portfolio_value, 2),
            "spy_price": round(spy_value, 2),
            "positions": [
                {"symbol": "AAPL", "shares": 50, "price": 180.0, "value": 9000},
                {"symbol": "GOOGL", "shares": 10, "price": 150.0, "value": 1500}
            ]
        })
    
    return JSONResponse(content={"history": history})

@app.get("/api/portfolio/weights")
async def get_portfolio_weights():
    weights = [
        {"symbol": "AAPL", "weight": 45.2, "value": 18080, "shares": 100.4},
        {"symbol": "GOOGL", "weight": 25.8, "value": 10320, "shares": 6.88},
        {"symbol": "MSFT", "weight": 15.3, "value": 6120, "shares": 18.0},
        {"symbol": "TSLA", "weight": 8.7, "value": 3480, "shares": 14.5},
        {"symbol": "SPY", "weight": 5.0, "value": 2000, "shares": 4.76}
    ]
    return JSONResponse(content={"weights": weights})

@app.get("/api/portfolio/trades")
async def get_recent_trades():
    trades = [
        {"date": "2024-07-30", "action": "Buy", "symbol": "AAPL", "quantity": 10, "price": 180.25, "amount": -1802.50},
        {"date": "2024-07-25", "action": "Sell", "symbol": "GOOGL", "quantity": 5, "price": 150.00, "amount": 750.00},
        {"date": "2024-07-20", "action": "Buy", "symbol": "MSFT", "quantity": 8, "price": 340.50, "amount": -2724.00}
    ]
    return JSONResponse(content={"trades": trades})

@app.get("/api/performance")
async def get_performance_metrics():
    metrics = {
        "1M": {"portfolio_return": 8.5, "spy_return": 6.2, "outperformance": 2.3},
        "3M": {"portfolio_return": 15.7, "spy_return": 12.1, "outperformance": 3.6},
        "6M": {"portfolio_return": 28.4, "spy_return": 18.9, "outperformance": 9.5},
        "1Y": {"portfolio_return": 45.2, "spy_return": 28.7, "outperformance": 16.5}
    }
    return JSONResponse(content={"metrics": metrics})

@app.get("/api/comparison/spy")
async def get_spy_comparison():
    comparison = []
    base_date = datetime(2023, 1, 1)
    
    for i in range(365):
        date = base_date + timedelta(days=i)
        portfolio_growth = 10000 * (1.0 + i * 0.0008 + random.random() * 0.02)
        spy_growth = 10000 * (1.0 + i * 0.0005 + random.random() * 0.015)
        
        comparison.append({
            "date": date.strftime('%Y-%m-%d'),
            "portfolio": round(portfolio_growth, 2),
            "spy": round(spy_growth, 2)
        })
    
    return JSONResponse(content={"comparison": comparison})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)