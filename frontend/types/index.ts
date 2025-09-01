export interface Transaction {
  date: string
  action: string
  symbol: string
  quantity: number
  price: number
  amount: number
}

export interface PortfolioHistory {
  date: string
  total_value: number
  spy_price: number
  positions: Position[]
}

export interface Position {
  symbol: string
  shares: number
  price: number
  value: number
}

export interface PortfolioWeight {
  symbol: string
  weight: number
  value: number
  shares: number
  cost_basis: number
  gain_loss_pct: number
}

export interface PerformanceMetric {
  portfolio_return: number
  spy_return: number
  outperformance: number
}

export interface PerformanceMetrics {
  '1M'?: PerformanceMetric
  '3M'?: PerformanceMetric
  '6M'?: PerformanceMetric
  '1Y'?: PerformanceMetric
}

export interface ComparisonData {
  date: string
  portfolio: number
  spy: number
  [key: string]: number | string // Support dynamic symbol overlay data
}

export interface StockSearchResult {
  symbol: string
  name: string
  type: string
  exchange: string
  currency?: string
  market_cap?: number
  sector?: string
}

export interface CustomSymbol {
  symbol: string
  name: string
  color: string
  visible: boolean
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface TWRStats {
  twr: number
  twr_pct: number
  days: number
  annualized_pct: number
}

export interface PerformanceResponse {
  metrics: PerformanceMetrics
  twr?: TWRStats
  net?: {
    start_value: number
    end_value: number
    net_contributions: number
    net_profit: number
    pct_of_start: number
    pct_of_start_plus_contrib: number
    start_date?: string
    end_date?: string
  }
  deposit_avg?: {
    periods: { start: string; end: string; begin: number; end: number; net_contrib: number; return_pct: number }[]
    avg_return_pct: number
  }
}