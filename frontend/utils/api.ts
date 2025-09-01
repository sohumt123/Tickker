import axios from 'axios'
import { 
  Transaction, 
  PortfolioHistory, 
  PortfolioWeight, 
  PerformanceMetrics, 
  ComparisonData,
  StockSearchResult,
  ApiResponse,
  PerformanceResponse
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Load token from sessionStorage on the client (per-tab auth)
if (typeof window !== 'undefined') {
  const token = window.sessionStorage.getItem('tickker_token')
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

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
    return response.data as PerformanceResponse
  },

  getContributionAdjustedReturn: async () => {
    const response = await api.get('/performance/net')
    return response.data as PerformanceResponse['net']
  },

  getDepositAveragedReturn: async () => {
    const response = await api.get('/performance')
    return (response.data as PerformanceResponse).deposit_avg
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

  debugTWR: async (): Promise<any> => {
    const response = await api.get('/debug/twr')
    return response.data
  },
}

export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const res = await api.post('/auth/register', { email, password, name })
    return res.data
  },
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    if (res.data?.access_token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('tickker_token', res.data.access_token)
      }
    }
    return res.data
  },
  me: async () => {
    const res = await api.get('/me')
    return res.data
  }
}

export const groupApi = {
  create: async (name: string, isPublic: boolean = true) => {
    const res = await api.post('/groups', { name, is_public: isPublic })
    return res.data as { id: number; name: string; code: string; is_public: boolean }
  },
  join: async (code: string) => {
    const res = await api.post('/groups/join', { code })
    return res.data as { ok: boolean; id: number }
  },
  mine: async () => {
    const res = await api.get('/groups')
    return res.data as { groups: { id: number; name: string; code: string; is_public: boolean }[] }
  },
  leaderboard: async (groupId: number, baselineDate?: string) => {
    const params = new URLSearchParams()
    if (baselineDate) params.append('baseline_date', baselineDate)
    const res = await api.get(`/groups/${groupId}/leaderboard?${params}`)
    return res.data as { leaderboard: { user_id: number; name: string; return_pct: number }[] }
  },
  details: async (groupId: number) => {
    const res = await api.get(`/groups/${groupId}`)
    return res.data as { id: number; name: string; code: string; is_public: boolean; members: { user_id: number; name: string; is_public: boolean }[] }
  },
  membersDetails: async (groupId: number) => {
    const res = await api.get(`/groups/${groupId}/members/details`)
    return res.data as { members: { user_id: number; name: string; weights: { symbol: string; weight: number; value: number; shares: number }[]; badges: any }[] }
  },
  groupComparison: async (groupId: number, baselineDate?: string) => {
    const params = new URLSearchParams()
    if (baselineDate) params.append('baseline_date', baselineDate)
    const res = await api.get(`/groups/${groupId}/comparison?${params}`)
    return res.data as { series: Record<number, { date: string; value: number }[]> }
  },
  weeklyMemberSymbols: async (groupId: number, userId: number, week: string) => {
    const params = new URLSearchParams()
    params.append('user_id', String(userId))
    params.append('week', week)
    const res = await api.get(`/groups/${groupId}/weekly/member_symbols?${params}`)
    return res.data as { user_id: number; week: string; symbols: { symbol: string; start: string; end: string; start_close: number; end_close: number; pct: number }[]; weekly_badges?: { badges: { key: string; label: string; emoji?: string; context?: string }[]; biggest_gainer?: { symbol: string; pct: number }; biggest_loser?: { symbol: string; pct: number } } }
  },
  weeklySummary: async (groupId: number, week: string) => {
    const params = new URLSearchParams()
    params.append('week', week)
    const res = await api.get(`/groups/${groupId}/weekly/summary?${params}`)
    return res.data as { symbol_changes: Record<string, { start: string; end: string; start_close: number; end_close: number; pct: number }>; users: Record<number, any> }
  },
  weeklyLeaderboard: async (groupId: number, week: string) => {
    const params = new URLSearchParams()
    params.append('week', week)
    const res = await api.get(`/groups/${groupId}/weekly/leaderboard?${params}`)
    return res.data as { week: string; leaderboard: { user_id: number; twr_pct: number; gain_usd: number; weekly_badges?: { badges: { key: string; label: string; emoji?: string; context?: string }[] } }[] }
  },
  weeklyUpload: async (groupId: number, week: string, file: File, replace: boolean = false) => {
    const form = new FormData()
    form.append('file', file)
    const params = new URLSearchParams()
    params.append('week', week)
    if (replace) params.append('replace', 'true')
    const res = await api.post(`/groups/${groupId}/weekly/upload?${params}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data as { ok: boolean; count: number }
  },
  addGroupNote: async (groupId: number, symbol: string, rating: number, content: string) => {
    const res = await api.post(`/groups/${groupId}/notes`, { symbol, rating, content })
    return res.data as { ok: boolean; id: number }
  },
  listGroupNotes: async (groupId: number, symbol?: string) => {
    const params = new URLSearchParams()
    if (symbol) params.append('symbol', symbol)
    const res = await api.get(`/groups/${groupId}/notes?${params}`)
    return res.data as { notes: any[]; summary: Record<string, { count: number; avg: number }> }
  }
}

export const socialApi = {
  listPublicProfiles: async () => {
    const res = await api.get('/social/profiles')
    return res.data as { profiles: { user_id: number; display_name: string }[] }
  },
  addToList: async (payload: { symbol: string; list_type: 'owned'|'watch'|'wishlist' }) => {
    const res = await api.post('/social/list', payload)
    return res.data as { ok: boolean }
  },
  addNote: async (payload: { symbol: string; content: string; labels?: string[] }) => {
    const res = await api.post('/social/notes', payload)
    return res.data as { ok: boolean }
  },
  vote: async (payload: { symbol_a: string; symbol_b: string; winner: string }) => {
    const res = await api.post('/social/preferences', payload)
    return res.data as { ok: boolean }
  },
  feed: async () => {
    const res = await api.get('/social/feed')
    return res.data as { feed: any[] }
  },
  recommendations: async () => {
    const res = await api.get('/social/recommendations')
    return res.data as { picks: string[] }
  },
  getPerformance: async (userId: number) => {
    const res = await api.get(`/social/performance?user_id=${userId}`)
    return res.data as { history: { date: string; value: number }[] }
  },
  getWeights: async (userId: number) => {
    const res = await api.get(`/social/weights?user_id=${userId}`)
    return res.data as { weights: { symbol: string; weight: number }[] }
  },
  getComparison: async (userIds: number[]) => {
    const params = new URLSearchParams()
    params.append('user_ids', userIds.join(','))
    const res = await api.get(`/social/comparison?${params}`)
    return res.data as { series: { user_id: number; name: string; points: { date: string; value: number }[] }[] }
  },
}

export default api