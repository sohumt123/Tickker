import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { portfolioApi } from '@/utils/supabase-api'

export function usePortfolioData() {
  const { user } = useAuth()
  const [hasData, setHasData] = useState<boolean | null>(null) // null = loading
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHasData(null)
      setLoading(false)
      return
    }

    checkPortfolioData()
  }, [user])

  const checkPortfolioData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Check if user has any portfolio weights (indicating they've uploaded data)
      const result = await portfolioApi.getPortfolioWeights()
      const hasWeights = result.weights && result.weights.length > 0
      setHasData(hasWeights)
    } catch (error) {
      // If API fails, assume no data
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }

  const refreshDataCheck = () => {
    checkPortfolioData()
  }

  return {
    hasData,
    loading,
    refreshDataCheck
  }
}