# Stock Portfolio Visualizer

A modern web application that compares your Fidelity brokerage portfolio performance against the S&P 500 (SPY) through interactive charts and comprehensive analytics.

![Portfolio Visualizer Screenshot](docs/screenshot.png)

## ✨ Features

- **📊 Growth Comparison**: Interactive "Growth of $10k" chart overlaying your portfolio vs SPY
- **🥧 Portfolio Allocation**: Visual breakdown of current positions with weights and values  
- **📈 Performance Metrics**: 1M, 3M, 6M, and 1Y comparison analytics vs SPY
- **💼 Trade History**: Detailed transaction table with filtering and insights
- **📱 Mobile Responsive**: Optimized for desktop, tablet, and mobile viewing
- **🎨 Modern UI**: Clean, professional interface with smooth animations
- **🔒 Secure**: No API keys committed, environment-based configuration

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sohumt123/Stock-Visualizer-Fidelity.git
   cd Stock-Visualizer-Fidelity
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Copy environment template and add your API keys
   cp ../.env.example .env
   # Edit .env with your Alpha Vantage/Polygon API keys (optional)
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the development servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📂 Project Structure

```
Stock-Visualizer-Fidelity/
├── backend/                 # FastAPI backend
│   ├── main.py             # API routes and server
│   ├── portfolio_service.py # Portfolio data processing
│   ├── price_service.py    # Stock price data fetching
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── utils/            # Utilities and API client
│   └── types/            # TypeScript definitions
├── data/                  # Data storage
│   ├── .gitkeep          # Keep directory in git
│   └── price_cache/      # Cached price data
├── tests/                # Unit tests
└── docs/                 # Documentation
```

## 📊 Usage

### 1. Export Your Fidelity Data

1. Log into your Fidelity account
2. Navigate to **Account Positions** → **Activity & Orders** 
3. Select **History** and set date range to cover your full investment period
4. Click **Download** and choose **CSV** format
5. Save as `Accounts_History.csv`

### 2. Upload and Analyze

1. Open the Portfolio Visualizer at `http://localhost:3000`
2. Drag and drop your `Accounts_History.csv` file
3. Wait for processing (usually 30-60 seconds)
4. Explore your performance across four main views:
   - **Overview**: Growth of $10k comparison chart
   - **Allocation**: Current portfolio weights and distribution
   - **Trades**: Recent transaction history and summaries
   - **Performance**: Periodic performance metrics vs SPY

## 🎨 Design System

### Color Palette
- **Primary**: Slate grays (#0f172a to #f8fafc) for professional appearance
- **Success**: Green tones (#22c55e) for positive returns
- **Danger**: Red tones (#ef4444) for negative returns
- **Accents**: Blue, violet, amber for data visualization

### Typography
- **Primary**: Inter (clean, readable sans-serif)
- **Code**: JetBrains Mono (for numerical data)

### Layout Principles
- **Mobile-first**: Responsive design starting from 320px
- **Card-based**: Elevated surfaces with subtle shadows
- **Consistent spacing**: 4px base unit with 8px/16px/24px increments
- **Accessibility**: WCAG-AA contrast ratios and keyboard navigation

## 🔧 API Configuration

### Stock Price Data Sources

The app supports multiple data sources (in order of preference):

1. **Alpha Vantage** (recommended)
   - Sign up at [alphavantage.co](https://www.alphavantage.co)
   - Add `ALPHA_VANTAGE_API_KEY=your_key` to `.env`

2. **Polygon.io** (backup)  
   - Sign up at [polygon.io](https://polygon.io)
   - Add `POLYGON_API_KEY=your_key` to `.env`

3. **Mock Data** (development)
   - Automatically used if no API keys provided
   - Generates realistic price movements for testing

### Environment Variables

```bash
# .env file
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
POLYGON_API_KEY=your_polygon_key
DATABASE_URL=sqlite:///./portfolio.db
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests  
```bash
cd frontend
npm test
```

### Test Coverage
- Portfolio data processing: ✅ 90%+
- Price data fetching: ✅ 85%+
- API endpoints: ✅ 80%+

## 🔒 Security & Privacy

- **No data stored permanently**: Your financial data stays local
- **API keys protected**: Environment variables only, never committed
- **CORS configured**: Restricts API access to your frontend
- **Input validation**: CSV parsing with error handling
- **No external tracking**: Your portfolio data never leaves your machine

## 🛠️ Development

### Adding New Features

1. **Backend changes**: Add routes to `main.py`, business logic to services
2. **Frontend changes**: Create components in `components/`, add to main navigation
3. **Testing**: Add tests for new functionality
4. **Documentation**: Update README and inline comments

### Code Style

- **Backend**: Black formatting, type hints preferred
- **Frontend**: ESLint + Prettier, functional components with hooks
- **Commits**: Conventional commits (feat:, fix:, docs:)

## 📈 Performance Metrics Explained

- **Portfolio Return**: Your actual gains/losses over the period
- **SPY Return**: S&P 500 ETF performance over the same period  
- **Outperformance**: Portfolio return minus SPY return
  - Positive = You beat the market 🎉
  - Negative = Market outperformed you 📉

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the code style
4. Add tests for new functionality
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📋 Roadmap

- [ ] Support for multiple brokerages (Schwab, E*TRADE, etc.)
- [ ] Advanced analytics (Sharpe ratio, max drawdown, etc.)
- [ ] Portfolio optimization suggestions
- [ ] Export reports to PDF
- [ ] Real-time price updates
- [ ] Multi-portfolio comparison

## ⚠️ Disclaimer

This tool is for educational and analytical purposes only. It is not financial advice. Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/sohumt123/Stock-Visualizer-Fidelity/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sohumt123/Stock-Visualizer-Fidelity/discussions)

---

Built with ❤️ using FastAPI, Next.js, and Chart.js