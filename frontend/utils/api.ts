import axios from 'axios'
import { 
  Transaction, 
  PortfolioHistory, 
  PortfolioWeight, 
  PerformanceMetrics, 
  ComparisonData,
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

  getSpyComparison: async (): Promise<{ comparison: ComparisonData[] }> => {
    const response = await api.get('/comparison/spy')
    return response.data
  },
}

export default api