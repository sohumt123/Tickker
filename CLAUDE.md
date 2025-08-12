# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python accurate_main.py
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm test           # Run Jest tests
npm run test:watch # Run tests in watch mode
```

### Testing
- Backend: `pytest tests/ -v` (if tests directory exists)
- Frontend: `npm test` from frontend directory
- Jest configuration in `frontend/jest.config.js`

## Architecture Overview

### Monorepo Structure
- **backend/**: FastAPI server with SQLModel/SQLAlchemy for data persistence
- **frontend/**: Next.js 14 App Router application with TypeScript

### Backend Architecture
- **accurate_main.py**: Main FastAPI application with all routes and business logic
- **SQLModel** for database models with SQLite default (configurable via DATABASE_URL)
- **Authentication**: JWT-based auth with passlib for password hashing
- **Portfolio Processing**: In-memory data processing with pandas for CSV uploads
- **Market Data**: Yahoo Finance integration via yfinance library
- **CORS**: Configured for localhost:3000 development

### Frontend Architecture
- **App Router**: Next.js 14 with TypeScript, file-based routing in `app/` directory
- **API Layer**: Centralized in `utils/api.ts` with axios client
- **Type Safety**: TypeScript definitions in `types/index.ts`
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Chart.js and Recharts for data visualization
- **State**: Session-based authentication with sessionStorage

### Key Features
1. **Portfolio Analytics**: CSV upload processing, growth comparison with SPY, performance metrics
2. **Social Features**: Investment groups, leaderboards, member comparisons, notes system
3. **Research Tools**: Stock search, custom symbol overlays, baseline date analysis

### Data Flow
1. CSV upload → FastAPI processes with pandas → Stores in global portfolio_data dict
2. Frontend API calls → Backend calculates metrics using yfinance → Returns JSON responses
3. Authentication tokens stored in sessionStorage (per-tab sessions)

### Database Models (SQLModel)
- User authentication and profiles
- Investment groups and memberships  
- Social features (notes, preferences, lists)
- Portfolio data persistence for registered users

### API Endpoints Structure
- `/upload`: Portfolio CSV processing
- `/portfolio/*`: Portfolio data and analytics
- `/performance`: Performance metrics vs benchmarks
- `/comparison/*`: Benchmark and custom comparisons
- `/auth/*`: User authentication
- `/groups/*`: Social investment groups
- `/social/*`: Social features and recommendations

### Development Notes
- Backend runs on port 8000 (default FastAPI)
- Frontend development server on port 3000
- Real-time market data cached in memory for performance
- Mobile-responsive design with Tailwind utilities
- Error handling with try/catch and proper HTTP status codes