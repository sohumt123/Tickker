import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import os
# from price_service import PriceService

class PortfolioService:
    def __init__(self):
        self.price_service = PriceService()
        self.data_dir = "../data"
        self.transactions_file = os.path.join(self.data_dir, "transactions.json")
        self.portfolio_file = os.path.join(self.data_dir, "portfolio_history.json")
        
    async def process_fidelity_csv(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process Fidelity CSV and extract transaction data"""
        
        df['Run Date'] = pd.to_datetime(df['Run Date'])
        df['Settlement Date'] = pd.to_datetime(df['Settlement Date'])
        
        df = df.sort_values('Settlement Date')
        
        transactions = []
        symbols = set()
        
        for _, row in df.iterrows():
            transaction = {
                'date': row['Settlement Date'].strftime('%Y-%m-%d'),
                'action': row['Action'],
                'symbol': row['Symbol'],
                'quantity': float(row['Quantity']) if pd.notna(row['Quantity']) else 0,
                'price': float(row['Price ($)']) if pd.notna(row['Price ($)']) else 0,
                'amount': float(row['Amount ($)']) if pd.notna(row['Amount ($)']) else 0,
            }
            transactions.append(transaction)
            symbols.add(row['Symbol'])
        
        symbols = list(symbols)
        symbols = [s for s in symbols if pd.notna(s) and s != '']
        
        os.makedirs(self.data_dir, exist_ok=True)
        with open(self.transactions_file, 'w') as f:
            json.dump(transactions, f, indent=2)
        
        await self._rebuild_portfolio_history(transactions, symbols)
        
        return {
            'symbols': symbols,
            'transaction_count': len(transactions),
            'date_range': {
                'start': df['Settlement Date'].min().strftime('%Y-%m-%d'),
                'end': df['Settlement Date'].max().strftime('%Y-%m-%d')
            }
        }
    
    async def _rebuild_portfolio_history(self, transactions: List[Dict], symbols: List[str]):
        """Rebuild daily portfolio positions and values"""
        
        df_transactions = pd.DataFrame(transactions)
        df_transactions['date'] = pd.to_datetime(df_transactions['date'])
        
        start_date = df_transactions['date'].min()
        end_date = datetime.now().date()
        
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        
        portfolio_history = []
        current_positions = {}
        
        price_data = {}
        for symbol in symbols:
            if symbol and symbol != 'Cash' and symbol != '':
                try:
                    prices = await self.price_service.get_price_history(symbol, "max")
                    price_data[symbol] = prices
                except Exception as e:
                    print(f"Warning: Could not fetch prices for {symbol}: {e}")
        
        spy_prices = await self.price_service.get_price_history("SPY", "max")
        
        for date in date_range:
            date_str = date.strftime('%Y-%m-%d')
            
            day_transactions = df_transactions[df_transactions['date'].dt.date == date.date()]
            
            for _, trans in day_transactions.iterrows():
                symbol = trans['symbol']
                if symbol and symbol != 'Cash' and symbol != '':
                    if symbol not in current_positions:
                        current_positions[symbol] = 0
                    
                    if trans['action'] in ['Buy', 'Bought']:
                        current_positions[symbol] += trans['quantity']
                    elif trans['action'] in ['Sell', 'Sold']:
                        current_positions[symbol] -= trans['quantity']
            
            total_value = 0
            positions_detail = []
            
            for symbol, shares in current_positions.items():
                if shares > 0 and symbol in price_data:
                    price = self._get_price_for_date(price_data[symbol], date_str)
                    if price:
                        value = shares * price
                        total_value += value
                        positions_detail.append({
                            'symbol': symbol,
                            'shares': shares,
                            'price': price,
                            'value': value
                        })
            
            spy_price = self._get_price_for_date(spy_prices, date_str)
            
            portfolio_history.append({
                'date': date_str,
                'total_value': total_value,
                'spy_price': spy_price,
                'positions': positions_detail
            })
        
        with open(self.portfolio_file, 'w') as f:
            json.dump(portfolio_history, f, indent=2)
    
    def _get_price_for_date(self, price_data: Dict, date_str: str) -> Optional[float]:
        """Get price for a specific date, using closest available date if exact match not found"""
        if not price_data or 'prices' not in price_data:
            return None
        
        prices = price_data['prices']
        if date_str in prices:
            return prices[date_str]
        
        available_dates = sorted(prices.keys())
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        closest_date = None
        for date in available_dates:
            price_date = datetime.strptime(date, '%Y-%m-%d').date()
            if price_date <= target_date:
                closest_date = date
            else:
                break
        
        return prices.get(closest_date) if closest_date else None
    
    async def get_portfolio_history(self, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """Get portfolio history for charting"""
        if not os.path.exists(self.portfolio_file):
            return {"error": "No portfolio data found. Please upload a CSV first."}
        
        with open(self.portfolio_file, 'r') as f:
            history = json.load(f)
        
        if start_date:
            history = [h for h in history if h['date'] >= start_date]
        if end_date:
            history = [h for h in history if h['date'] <= end_date]
        
        return {"history": history}
    
    async def get_current_weights(self) -> Dict[str, Any]:
        """Get current portfolio weights by symbol"""
        if not os.path.exists(self.portfolio_file):
            return {"error": "No portfolio data found"}
        
        with open(self.portfolio_file, 'r') as f:
            history = json.load(f)
        
        if not history:
            return {"weights": []}
        
        latest = history[-1]
        positions = latest.get('positions', [])
        total_value = latest.get('total_value', 0)
        
        weights = []
        for pos in positions:
            if total_value > 0:
                weight = (pos['value'] / total_value) * 100
                weights.append({
                    'symbol': pos['symbol'],
                    'weight': round(weight, 2),
                    'value': pos['value'],
                    'shares': pos['shares']
                })
        
        weights.sort(key=lambda x: x['weight'], reverse=True)
        return {"weights": weights}
    
    async def get_recent_trades(self, limit: int = 10) -> Dict[str, Any]:
        """Get recent trades"""
        if not os.path.exists(self.transactions_file):
            return {"trades": []}
        
        with open(self.transactions_file, 'r') as f:
            transactions = json.load(f)
        
        recent = sorted(transactions, key=lambda x: x['date'], reverse=True)[:limit]
        return {"trades": recent}
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Calculate performance metrics vs SPY"""
        if not os.path.exists(self.portfolio_file):
            return {"error": "No portfolio data found"}
        
        with open(self.portfolio_file, 'r') as f:
            history = json.load(f)
        
        if len(history) < 2:
            return {"metrics": {}}
        
        df = pd.DataFrame(history)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        current_value = df['total_value'].iloc[-1]
        
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
            end_spy = period_data['spy_price'].iloc[-1]
            
            if start_value > 0 and start_spy > 0:
                portfolio_return = ((current_value - start_value) / start_value) * 100
                spy_return = ((end_spy - start_spy) / start_spy) * 100
                
                metrics[period_name] = {
                    'portfolio_return': round(portfolio_return, 2),
                    'spy_return': round(spy_return, 2),
                    'outperformance': round(portfolio_return - spy_return, 2)
                }
        
        return {"metrics": metrics}
    
    async def compare_with_spy(self) -> Dict[str, Any]:
        """Generate data for SPY comparison chart (Growth of $10k)"""
        if not os.path.exists(self.portfolio_file):
            return {"error": "No portfolio data found"}
        
        with open(self.portfolio_file, 'r') as f:
            history = json.load(f)
        
        if not history:
            return {"comparison": []}
        
        df = pd.DataFrame(history)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        initial_portfolio_value = df['total_value'].iloc[0]
        initial_spy_price = df['spy_price'].iloc[0]
        
        if initial_portfolio_value == 0 or initial_spy_price == 0:
            return {"comparison": []}
        
        comparison_data = []
        
        for _, row in df.iterrows():
            if row['spy_price'] > 0:
                portfolio_growth = (row['total_value'] / initial_portfolio_value) * 10000
                spy_growth = (row['spy_price'] / initial_spy_price) * 10000
                
                comparison_data.append({
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'portfolio': round(portfolio_growth, 2),
                    'spy': round(spy_growth, 2)
                })
        
        return {"comparison": comparison_data}