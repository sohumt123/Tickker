import axios from 'axios'
import { 
  Transaction, 
  PortfolioHistory, 
  PortfolioWeight, 
  PerformanceMetrics, 
  ComparisonData,
  StockSearchResult,
  ApiResponse 
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const portfolioApi = {
  uploadCSV: async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getPortfolioHistory: async (
    startDate?: string, 
    endDate?: string
  ): Promise<{ history: PortfolioHistory[] }> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/portfolio/history?${params}`)
    return response.data
  },

  getPortfolioWeights: async (): Promise<{ weights: PortfolioWeight[] }> => {
    const response = await api.get('/portfolio/weights')
    return response.data
  },

  getRecentTrades: async (limit: number = 10): Promise<{ trades: Transaction[] }> => {
    const response = await api.get(`/portfolio/trades?limit=${limit}`)
    return response.data
  },

  getPerformanceMetrics: async (): Promise<{ metrics: PerformanceMetrics }> => {
    const response = await api.get('/performance')
    return response.data
  },

  getSpyComparison: async (baselineDate?: string): Promise<{ comparison: ComparisonData[] }> => {
    const params = new URLSearchParams()
    if (baselineDate) params.append('baseline_date', baselineDate)
    
    const response = await api.get(`/comparison/spy?${params}`)
    return response.data
  },

  searchStocks: async (query: string): Promise<{ results: StockSearchResult[] }> => {
    const response = await api.get(`/search/stocks?query=${encodeURIComponent(query)}`)
    return response.data
  },

  getCustomComparison: async (
    symbols: string[], 
    startDate?: string, 
    endDate?: string,
    baselineDate?: string
  ): Promise<{ comparison: ComparisonData[] }> => {
    const params = new URLSearchParams()
    params.append('symbols', symbols.join(','))
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (baselineDate) params.append('baseline_date', baselineDate)
    
    const response = await api.get(`/comparison/custom?${params}`)
    return response.data
  },
}

export default api