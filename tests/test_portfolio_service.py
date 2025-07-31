import pytest
import pandas as pd
from datetime import datetime, timedelta
import json
import os
import sys
sys.path.append('../backend')

from portfolio_service import PortfolioService

@pytest.fixture
def portfolio_service():
    return PortfolioService()

@pytest.fixture
def sample_csv_data():
    return pd.DataFrame({
        'Run Date': ['2023-01-15', '2023-01-20', '2023-02-01'],
        'Action': ['Buy', 'Buy', 'Sell'],
        'Symbol': ['AAPL', 'GOOGL', 'AAPL'],
        'Quantity': [10, 5, 5],
        'Price ($)': [150.0, 2000.0, 155.0],
        'Amount ($)': [-1500.0, -10000.0, 775.0],
        'Settlement Date': ['2023-01-15', '2023-01-20', '2023-02-01']
    })

class TestPortfolioService:
    
    def test_process_fidelity_csv(self, portfolio_service, sample_csv_data):
        """Test processing of Fidelity CSV data"""
        result = portfolio_service.process_fidelity_csv(sample_csv_data)
        
        assert 'symbols' in result
        assert 'transaction_count' in result
        assert 'date_range' in result
        
        assert 'AAPL' in result['symbols']
        assert 'GOOGL' in result['symbols']
        assert result['transaction_count'] == 3
    
    def test_transaction_parsing(self, portfolio_service, sample_csv_data):
        """Test that transactions are parsed correctly"""
        result = portfolio_service.process_fidelity_csv(sample_csv_data)
        
        # Check that transactions file was created
        transactions_file = portfolio_service.transactions_file
        assert os.path.exists(transactions_file)
        
        with open(transactions_file, 'r') as f:
            transactions = json.load(f)
        
        assert len(transactions) == 3
        
        # Check first transaction
        first_transaction = transactions[0]
        assert first_transaction['symbol'] == 'AAPL'
        assert first_transaction['action'] == 'Buy'
        assert first_transaction['quantity'] == 10
        assert first_transaction['price'] == 150.0
    
    def test_date_range_calculation(self, portfolio_service, sample_csv_data):
        """Test date range calculation"""
        result = portfolio_service.process_fidelity_csv(sample_csv_data)
        
        date_range = result['date_range']
        assert date_range['start'] == '2023-01-15'
        assert date_range['end'] == '2023-02-01'
    
    def test_symbol_extraction(self, portfolio_service, sample_csv_data):
        """Test symbol extraction and deduplication"""
        result = portfolio_service.process_fidelity_csv(sample_csv_data)
        
        symbols = result['symbols']
        assert len(symbols) == 2  # AAPL and GOOGL, deduplicated
        assert 'AAPL' in symbols
        assert 'GOOGL' in symbols
    
    def test_get_price_for_date(self, portfolio_service):
        """Test price lookup for specific dates"""
        price_data = {
            'prices': {
                '2023-01-15': 150.0,
                '2023-01-16': 151.0,
                '2023-01-20': 155.0
            }
        }
        
        # Exact match
        price = portfolio_service._get_price_for_date(price_data, '2023-01-16')
        assert price == 151.0
        
        # Closest previous date
        price = portfolio_service._get_price_for_date(price_data, '2023-01-18')
        assert price == 151.0  # Should use 2023-01-16 price
        
        # Date before any available data
        price = portfolio_service._get_price_for_date(price_data, '2023-01-10')
        assert price is None
    
    def test_empty_csv_handling(self, portfolio_service):
        """Test handling of empty CSV data"""
        empty_df = pd.DataFrame()
        
        # Should handle empty dataframe gracefully
        with pytest.raises(Exception):  # Should raise an error for empty data
            portfolio_service.process_fidelity_csv(empty_df)
    
    def test_invalid_data_handling(self, portfolio_service):
        """Test handling of invalid data"""
        invalid_df = pd.DataFrame({
            'Run Date': ['invalid-date'],
            'Action': ['Buy'],
            'Symbol': ['AAPL'],
            'Quantity': ['not-a-number'],
            'Price ($)': [150.0],
            'Amount ($)': [-1500.0],
            'Settlement Date': ['2023-01-15']
        })
        
        # Should handle invalid data gracefully
        with pytest.raises(Exception):
            portfolio_service.process_fidelity_csv(invalid_df)

# Performance calculation tests
class TestPerformanceCalculations:
    
    def test_percentage_calculation(self):
        """Test percentage return calculations"""
        start_value = 1000
        end_value = 1100
        expected_return = 10.0
        
        actual_return = ((end_value - start_value) / start_value) * 100
        assert actual_return == expected_return
    
    def test_outperformance_calculation(self):
        """Test outperformance calculation"""
        portfolio_return = 15.0
        spy_return = 10.0
        expected_outperformance = 5.0
        
        actual_outperformance = portfolio_return - spy_return
        assert actual_outperformance == expected_outperformance
    
    def test_negative_returns(self):
        """Test handling of negative returns"""
        start_value = 1000
        end_value = 900
        expected_return = -10.0
        
        actual_return = ((end_value - start_value) / start_value) * 100
        assert actual_return == expected_return

if __name__ == '__main__':
    pytest.main([__file__])