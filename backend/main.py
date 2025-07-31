from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import pandas as pd
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import logging

from portfolio_service import PortfolioService
from price_service import PriceService

load_dotenv()

app = FastAPI(title="Stock Portfolio Visualizer", version="1.0.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

portfolio_service = PortfolioService()
price_service = PriceService()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        
        result = await portfolio_service.process_fidelity_csv(df)
        
        return JSONResponse(content={
            "message": "CSV processed successfully",
            "transactions_count": len(df),
            "symbols_found": result["symbols"],
            "date_range": result["date_range"]
        })
    
    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

@app.get("/api/portfolio/history")
async def get_portfolio_history(start_date: str = None, end_date: str = None):
    try:
        history = await portfolio_service.get_portfolio_history(start_date, end_date)
        return JSONResponse(content=history)
    except Exception as e:
        logger.error(f"Error getting portfolio history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolio/weights")
async def get_portfolio_weights():
    try:
        weights = await portfolio_service.get_current_weights()
        return JSONResponse(content=weights)
    except Exception as e:
        logger.error(f"Error getting portfolio weights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolio/trades")
async def get_recent_trades(limit: int = 10):
    try:
        trades = await portfolio_service.get_recent_trades(limit)
        return JSONResponse(content=trades)
    except Exception as e:
        logger.error(f"Error getting recent trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/performance")
async def get_performance_metrics():
    try:
        metrics = await portfolio_service.get_performance_metrics()
        return JSONResponse(content=metrics)
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prices/{symbol}")
async def get_price_history(symbol: str, period: str = "1y"):
    try:
        prices = await price_service.get_price_history(symbol, period)
        return JSONResponse(content=prices)
    except Exception as e:
        logger.error(f"Error getting price history for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/comparison/spy")
async def get_spy_comparison():
    try:
        comparison = await portfolio_service.compare_with_spy()
        return JSONResponse(content=comparison)
    except Exception as e:
        logger.error(f"Error getting SPY comparison: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)