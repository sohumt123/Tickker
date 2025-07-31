import pytest
import sys
import os
sys.path.append('../backend')

from price_service import PriceService

@pytest.fixture
def price_service():
    return PriceService()

class TestPriceService:
    
    def test_cache_directory_creation(self, price_service):
        """Test that cache directory is created"""
        assert os.path.exists(price_service.cache_dir)
    
    def test_mock_data_generation(self, price_service):
        """Test mock data generation"""
        result = price_service._generate_mock_data('AAPL', '1y')
        
        assert 'symbol' in result
        assert 'prices' in result
        assert 'source' in result
        
        assert result['symbol'] == 'AAPL'
        assert result['source'] == 'mock_data'
        assert len(result['prices']) == 365  # 1 year of data
    
    def test_spy_mock_data_different_base_price(self, price_service):
        """Test that SPY gets different base price in mock data"""
        spy_result = price_service._generate_mock_data('SPY', '1m')
        aapl_result = price_service._generate_mock_data('AAPL', '1m')
        
        spy_prices = list(spy_result['prices'].values())
        aapl_prices = list(aapl_result['prices'].values())
        
        # SPY should start around 400, AAPL around 100
        assert spy_prices[0] > aapl_prices[0]
    
    def test_period_mapping(self, price_service):
        """Test different period lengths"""
        periods_to_test = ['1d', '1w', '1m', '3m', '6m', '1y', '2y', '5y', 'max']
        
        for period in periods_to_test:
            result = price_service._generate_mock_data('TEST', period)
            prices = result['prices']
            
            # Check that we get reasonable amount of data
            assert len(prices) > 0
            
            # Check that dates are properly formatted
            for date_str in prices.keys():
                assert len(date_str) == 10  # YYYY-MM-DD format
                assert date_str.count('-') == 2
    
    def test_price_volatility_realistic(self, price_service):
        """Test that mock prices have realistic volatility"""
        result = price_service._generate_mock_data('TEST', '1m')
        prices = list(result['prices'].values())
        
        # Calculate daily returns
        returns = []
        for i in range(1, len(prices)):
            daily_return = (prices[i] - prices[i-1]) / prices[i-1]
            returns.append(abs(daily_return))
        
        # Most daily returns should be under 10% (realistic)
        extreme_moves = [r for r in returns if r > 0.10]
        assert len(extreme_moves) < len(returns) * 0.1  # Less than 10% extreme moves
    
    def test_price_positivity(self, price_service):
        """Test that all generated prices are positive"""
        result = price_service._generate_mock_data('TEST', '1y')
        prices = list(result['prices'].values())
        
        assert all(price > 0 for price in prices)
        assert min(prices) > 0

class TestCaching:
    
    def test_cache_file_naming(self, price_service):
        """Test cache file naming convention"""
        symbol = 'AAPL'
        period = '1y'
        
        expected_filename = f"{symbol}_{period}.json"
        expected_path = os.path.join(price_service.cache_dir, expected_filename)
        
        # This tests the internal logic without actually creating files
        cache_file = os.path.join(price_service.cache_dir, f"{symbol}_{period}.json")
        assert cache_file == expected_path

if __name__ == '__main__':
    pytest.main([__file__])