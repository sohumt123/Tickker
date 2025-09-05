"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { portfolioApi } from '@/utils/supabase-api'
import { useRouter } from 'next/navigation'
import { Upload, RefreshCw } from 'lucide-react'
import GrowthChart from '@/components/GrowthChart'
import Dividends from '@/components/Dividends'
import LoadingSpinner from '@/components/LoadingSpinner'
import CSVUploadModal from '@/components/CSVUploadModal'
import { usePortfolioData } from '@/hooks/usePortfolioData'

type Weight = { symbol: string; weight: number; value: number; shares: number; gain_loss_pct?: number }

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { hasData, loading: dataLoading, refreshDataCheck } = usePortfolioData()
  const router = useRouter()
  const [weights, setWeights] = useState<Weight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadPortfolioData = async () => {
    if (!user) return
    
    try {
      setError(null)
      const res = await portfolioApi.getPortfolioWeights()
      setWeights(res.weights || [])
    } catch (e: any) {
      setError('Failed to load portfolio')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (!user) return
    loadPortfolioData()
  }, [user, authLoading, router])

  // Redirect to onboarding if user has no portfolio data
  useEffect(() => {
    if (!dataLoading && hasData === false && user) {
      router.push('/onboarding')
    }
  }, [hasData, dataLoading, user, router])

  const handleCSVUploadSuccess = () => {
    // Refresh portfolio data after successful upload
    setRefreshing(true)
    loadPortfolioData()
    refreshDataCheck() // Also refresh the data check
  }

  const handleRefreshData = () => {
    setRefreshing(true)
    loadPortfolioData()
  }

  const totals = useMemo(() => {
    const totalValue = weights.reduce((s, w) => s + (w.value || 0), 0)
    const weightedPL = weights.reduce((s, w) => s + (w.value || 0) * ((w.gain_loss_pct ?? 0) / 100), 0)
    const totalPLPct = totalValue > 0 ? (weightedPL / totalValue) * 100 : 0
    return { totalValue, totalPLPct }
  }, [weights])

  if (authLoading || loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // This will redirect to login
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <>
      <div className="w-full py-6 space-y-6">
        {/* Header with Upload Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Portfolio</h1>
            <p className="text-slate-600">Track your investment performance and analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh portfolio data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Upload size={18} />
              Update CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-slate-500">Total Value</div>
          <div className="text-2xl font-bold mt-1 dark:text-slate-100">{totals.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">Estimated Return</div>
          <div className={`text-2xl font-bold mt-1 ${totals.totalPLPct >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {totals.totalPLPct >= 0 ? '+' : ''}{totals.totalPLPct.toFixed(2)}%
          </div>
          <div className="text-xs text-slate-500">Weighted by position value</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">Holdings</div>
          <div className="text-2xl font-bold mt-1 dark:text-slate-100">{weights.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">Top 3 Weight</div>
          <div className="text-2xl font-bold mt-1 dark:text-slate-100">
            {(
              weights
                .slice(0)
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3)
                .reduce((s, w) => s + w.weight, 0)
            ).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold dark:text-slate-100">Performance</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Growth of $10k vs SPY and overlays</p>
        </div>
        <GrowthChart />
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-slate-100">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-3">Symbol</th>
                <th className="text-right py-3 px-3">Weight</th>
                <th className="text-right py-3 px-3">Shares</th>
                <th className="text-right py-3 px-3">Value</th>
                <th className="text-right py-3 px-3">P/L %</th>
              </tr>
            </thead>
            <tbody>
              {weights
                .slice(0)
                .sort((a, b) => b.weight - a.weight)
                .map((w) => (
                  <tr key={w.symbol} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-medium">{w.symbol}</td>
                    <td className="py-3 px-3 text-right">{w.weight.toFixed(1)}%</td>
                    <td className="py-3 px-3 text-right">{w.shares.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">{w.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className={`py-3 px-3 text-right ${((w.gain_loss_pct ?? 0) >= 0) ? 'text-success-600' : 'text-danger-600'}`}>
                      {((w.gain_loss_pct ?? 0) >= 0 ? '+' : '')}{(w.gain_loss_pct ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dividends />
      </div>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleCSVUploadSuccess}
        title="Update Portfolio Data"
        subtitle="Upload your latest Fidelity CSV to refresh your portfolio analytics"
      />
    </>
  )
}


