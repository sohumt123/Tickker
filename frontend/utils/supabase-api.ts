import { supabase } from '@/lib/supabase'
import { 
  Transaction, 
  PortfolioHistory, 
  PortfolioWeight, 
  PerformanceMetrics, 
  ComparisonData,
  StockSearchResult,
  ApiResponse 
} from '@/types'

// Backend API base URL (fallback to localhost if not defined)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Helper function to get authenticated user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  return user
}

// Helper function to get auth headers for API calls
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
  return { 'Content-Type': 'application/json' }
}

// Portfolio API functions using Supabase
export const portfolioApi = {
  // Upload CSV file (goes through backend API for processing)
  uploadCSV: async (file: File): Promise<ApiResponse<any>> => {
    const user = await getCurrentUser()
    const { data: { session } } = await supabase.auth.getSession()
    
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Upload error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }
    
    const result = await response.json()
    return result
  },

  // Get portfolio history from Supabase
  getPortfolioHistory: async (
    startDate?: string, 
    endDate?: string
  ): Promise<{ history: PortfolioHistory[] }> => {
    const user = await getCurrentUser()
    
    let query = supabase
      .from('portfolio_history')
      .select('*')
      .eq('user_id', user.id)
      .order('date')
    
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    
    return { history: data || [] }
  },

  // Get portfolio weights
  getPortfolioWeights: async (): Promise<{ weights: PortfolioWeight[] }> => {
    const user = await getCurrentUser()
    
    // Get all transactions for the user
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) throw new Error(error.message)
    
    if (!transactions || transactions.length === 0) {
      return { weights: [] }
    }
    
    // Calculate current positions (this logic should ideally be on the backend)
    const positions: Record<string, number> = {}
    
    transactions.forEach(txn => {
      const symbol = txn.symbol
      const quantity = txn.quantity
      
      if (txn.action.toLowerCase() === 'buy') {
        positions[symbol] = (positions[symbol] || 0) + quantity
      } else if (txn.action.toLowerCase() === 'sell') {
        positions[symbol] = (positions[symbol] || 0) - quantity
      }
    })
    
    // Filter out zero positions and format for frontend
    const weights = Object.entries(positions)
      .filter(([_, quantity]) => quantity > 0)
      .map(([symbol, shares]) => ({
        symbol,
        shares,
        weight: 0, // This would need to be calculated with current prices
        value: 0,  // This would need current price data
        price: 0   // This would need current price data
      }))
    
    return { weights }
  },

  // Get recent trades
  getRecentTrades: async (limit: number = 10): Promise<{ trades: Transaction[] }> => {
    const user = await getCurrentUser()
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw new Error(error.message)
    
    return { trades: data || [] }
  },

  // Performance metrics (would need backend calculation)
  getPerformanceMetrics: async (): Promise<{ metrics: PerformanceMetrics }> => {
    // This needs backend calculation with market data
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(`${API_BASE_URL}/api/performance`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  // SPY comparison (needs backend for market data)
  getSpyComparison: async (baselineDate?: string): Promise<{ comparison: ComparisonData[] }> => {
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    if (baselineDate) params.append('baseline_date', baselineDate)
    
    const response = await fetch(`${API_BASE_URL}/api/comparison/spy?${params}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  // Stock search (needs backend for market data)
  searchStocks: async (query: string): Promise<{ results: StockSearchResult[] }> => {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(`/api/search/stocks?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    return response.json()
  },

  // Custom comparison (needs backend for market data)
  getCustomComparison: async (
    symbols: string[], 
    startDate?: string, 
    endDate?: string,
    baselineDate?: string
  ): Promise<{ comparison: ComparisonData[] }> => {
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    params.append('symbols', symbols.join(','))
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (baselineDate) params.append('baseline_date', baselineDate)
    
    const response = await fetch(`/api/comparison/custom?${params}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    return response.json()
  },

  // Contribution-adjusted return (net performance)
  getContributionAdjustedReturn: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch(`${API_BASE_URL}/api/performance/net`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }
}

// Auth API (now uses Supabase directly)
export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    })
    
    if (error) throw error
    return data
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  me: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    // Get profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return profile || { id: user.id, email: user.email, name: user.user_metadata?.name || '' }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}

// Group API using Supabase
export const groupApi = {
  create: async (name: string, isPublic: boolean = true) => {
    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        name,
        is_public: isPublic
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  join: async (code: string) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/join`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        code
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  mine: async () => {
    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      headers: await getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },



  details: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
      headers: await getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get group details: ${response.status}`)
    }
    
    return response.json()
  },

  leaderboard: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/leaderboard`, {
      headers: await getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get group leaderboard: ${response.status}`)
    }
    
    return response.json()
  },

  members: async (groupId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members`, {
      headers: await getAuthHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get group members: ${response.status}`)
    }
    
    return response.json()
  },

  addGroupNote: async (groupId: number, symbol: string, rating: number, content: string) => {
    const user = await getCurrentUser()
    
    const { data, error } = await supabase
      .from('group_notes')
      .insert({
        group_id: groupId,
        user_id: user.id,
        symbol,
        rating,
        content
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { ok: true, id: data.id }
  },

  listGroupNotes: async (groupId: number, symbol?: string) => {
    let query = supabase
      .from('group_notes')
      .select(`
        *,
        profiles (
          name,
          email
        )
      `)
      .eq('group_id', groupId)
    
    if (symbol) {
      query = query.eq('symbol', symbol)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Calculate summary stats
    const summary: Record<string, { count: number; avg: number }> = {}
    
    data?.forEach(note => {
      if (!summary[note.symbol]) {
        summary[note.symbol] = { count: 0, avg: 0 }
      }
      summary[note.symbol].count++
    })
    
    // Calculate averages
    Object.keys(summary).forEach(symbol => {
      const notes = data?.filter(n => n.symbol === symbol) || []
      const avgRating = notes.reduce((sum, n) => sum + n.rating, 0) / notes.length
      summary[symbol].avg = avgRating
    })
    
    return { notes: data || [], summary }
  }
}

// Social API using Supabase
export const socialApi = {
  listPublicProfiles: async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('is_public', true)
    
    if (error) throw error
    
    return { profiles: data || [] }
  },

  addToList: async (payload: { symbol: string; list_type: 'owned'|'watch'|'wishlist' }) => {
    const user = await getCurrentUser()
    
    const { error } = await supabase
      .from('stock_list_items')
      .insert({
        user_id: user.id,
        symbol: payload.symbol,
        list_type: payload.list_type
      })
    
    if (error) throw error
    
    return { ok: true }
  },

  addNote: async (payload: { symbol: string; content: string; labels?: string[] }) => {
    const user = await getCurrentUser()
    
    const { error } = await supabase
      .from('stock_notes')
      .insert({
        user_id: user.id,
        symbol: payload.symbol,
        content: payload.content,
        labels_json: payload.labels || []
      })
    
    if (error) throw error
    
    return { ok: true }
  },

  vote: async (payload: { symbol_a: string; symbol_b: string; winner: string }) => {
    const user = await getCurrentUser()
    
    const { error } = await supabase
      .from('preference_votes')
      .insert({
        user_id: user.id,
        symbol_a: payload.symbol_a,
        symbol_b: payload.symbol_b,
        winner: payload.winner
      })
    
    if (error) throw error
    
    return { ok: true }
  },

  feed: async () => {
    const { data, error } = await supabase
      .from('social_actions')
      .select(`
        *,
        profiles (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    return { feed: data || [] }
  },

  recommendations: async () => {
    // This would need backend logic for recommendations
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await fetch('/api/social/recommendations', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    return response.json()
  },

  getPerformance: async (userId: string) => {
    const { data, error } = await supabase
      .from('portfolio_history')
      .select('date, value')
      .eq('user_id', userId)
      .order('date')
    
    if (error) throw error
    
    return { history: data || [] }
  },

  getWeights: async (userId: string) => {
    // This would need calculation from transactions
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
    
    if (error) throw error
    
    // Calculate weights (simplified)
    const weights = data?.reduce((acc: any[], txn) => {
      const existing = acc.find(w => w.symbol === txn.symbol)
      if (existing) {
        existing.weight += txn.quantity
      } else {
        acc.push({ symbol: txn.symbol, weight: txn.quantity })
      }
      return acc
    }, []) || []
    
    return { weights }
  },

  getComparison: async (userIds: string[]) => {
    // This would need backend calculation
    const { data: { session } } = await supabase.auth.getSession()
    const params = new URLSearchParams()
    params.append('user_ids', userIds.join(','))
    
    const response = await fetch(`/api/social/comparison?${params}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    return response.json()
  }
}

export default supabase