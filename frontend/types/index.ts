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
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}