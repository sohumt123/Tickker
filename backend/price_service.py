import requests
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import json
import time

class PriceService:
    def __init__(self):
        self.alpha_vantage_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.polygon_key = os.getenv("POLYGON_API_KEY")
        self.cache_dir = "../data/price_cache"
        os.makedirs(self.cache_dir, exist_ok=True)
        
    async def get_price_history(self, symbol: str, period: str = "1y") -> Dict[str, Any]:
        """Get price history for a symbol with caching"""
        
        cache_file = os.path.join(self.cache_dir, f"{symbol}_{period}.json")
        
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                
            cache_time = datetime.fromisoformat(cached_data.get('cached_at', '2000-01-01'))
            if datetime.now() - cache_time < timedelta(hours=4):
                return cached_data['data']
        
        try:
            if self.alpha_vantage_key:
                data = await self._fetch_alpha_vantage(symbol, period)
            else:
                data = await self._fetch_yahoo_finance(symbol, period)
            
            cache_entry = {
                'cached_at': datetime.now().isoformat(),
                'symbol': symbol,
                'period': period,
                'data': data
            }
            
            with open(cache_file, 'w') as f:
                json.dump(cache_entry, f, indent=2)
            
            return data
            
        except Exception as e:
            print(f"Error fetching prices for {symbol}: {e}")
            if os.path.exists(cache_file):
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                return cached_data['data']
            return {"error": str(e), "prices": {}}
    
    async def _fetch_alpha_vantage(self, symbol: str, period: str) -> Dict[str, Any]:
        """Fetch data from Alpha Vantage API"""
        
        function = "TIME_SERIES_DAILY"
        if period in ["max", "5y"]:
            function = "TIME_SERIES_DAILY"
        
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': function,
            'symbol': symbol,
            'apikey': self.alpha_vantage_key,
            'outputsize': 'full' if period in ["max", "5y", "2y"] else 'compact'
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if "Error Message" in data:
            raise Exception(f"Alpha Vantage error: {data['Error Message']}")
        
        if "Note" in data:
            raise Exception("API rate limit exceeded")
        
        time_series_key = "Time Series (Daily)"
        if time_series_key not in data:
            raise Exception(f"Unexpected API response format for {symbol}")
        
        time_series = data[time_series_key]
        
        prices = {}
        for date_str, daily_data in time_series.items():
            prices[date_str] = float(daily_data['4. close'])
        
        return {
            'symbol': symbol,
            'prices': prices,
            'source': 'alpha_vantage'
        }
    
    async def _fetch_yahoo_finance(self, symbol: str, period: str) -> Dict[str, Any]:
        """Fallback to Yahoo Finance (free alternative)"""
        
        period_map = {
            "1d": "1d",
            "1w": "5d", 
            "1m": "1mo",
            "3m": "3mo",
            "6m": "6mo",
            "1y": "1y",
            "2y": "2y",
            "5y": "5y",
            "max": "max"
        }
        
        yahoo_period = period_map.get(period, "1y")
        
        try:
            import yfinance as yf
            
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=yahoo_period)
            
            if hist.empty:
                raise Exception(f"No data found for symbol {symbol}")
            
            prices = {}
            for date, row in hist.iterrows():
                date_str = date.strftime('%Y-%m-%d')
                prices[date_str] = float(row['Close'])
            
            return {
                'symbol': symbol,
                'prices': prices,
                'source': 'yahoo_finance'
            }
            
        except ImportError:
            return await self._fetch_free_api(symbol, period)
    
    async def _fetch_free_api(self, symbol: str, period: str) -> Dict[str, Any]:
        """Fallback to free financial API"""
        
        end_date = datetime.now()
        
        period_days = {
            "1d": 1,
            "1w": 7,
            "1m": 30,
            "3m": 90,
            "6m": 180,
            "1y": 365,
            "2y": 730,
            "5y": 1825,
            "max": 3650
        }
        
        days = period_days.get(period, 365)
        start_date = end_date - timedelta(days=days)
        
        url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
        
        params = {}
        if self.polygon_key:
            params['apikey'] = self.polygon_key
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') != 'OK':
                raise Exception(f"Polygon API error: {data.get('error', 'Unknown error')}")
            
            prices = {}
            for result in data.get('results', []):
                date = datetime.fromtimestamp(result['t'] / 1000).strftime('%Y-%m-%d')
                prices[date] = float(result['c'])  # close price
            
            return {
                'symbol': symbol,
                'prices': prices,
                'source': 'polygon'
            }
            
        except Exception as e:
            return await self._generate_mock_data(symbol, period)
    
    async def _generate_mock_data(self, symbol: str, period: str) -> Dict[str, Any]:
        """Generate mock price data for development/testing"""
        
        print(f"Warning: Generating mock data for {symbol} - please add API keys for real data")
        
        import random
        
        end_date = datetime.now()
        
        period_days = {
            "1d": 1,
            "1w": 7,
            "1m": 30,
            "3m": 90,
            "6m": 180,
            "1y": 365,
            "2y": 730,
            "5y": 1825,
            "max": 3650
        }
        
        days = period_days.get(period, 365)
        
        base_price = 100.0 if symbol != "SPY" else 400.0
        prices = {}
        
        for i in range(days):
            date = end_date - timedelta(days=days-i)
            date_str = date.strftime('%Y-%m-%d')
            
            if i == 0:
                price = base_price
            else:
                prev_price = list(prices.values())[-1]
                change = random.uniform(-0.03, 0.03)  # ±3% daily change
                price = prev_price * (1 + change)
            
            prices[date_str] = round(price, 2)
        
        return {
            'symbol': symbol,
            'prices': prices,
            'source': 'mock_data'
        }