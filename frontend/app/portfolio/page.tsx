"use client"

import { useEffect, useMemo, useState } from 'react'
import { portfolioApi } from '@/utils/api'
import GrowthChart from '@/components/GrowthChart'
import Dividends from '@/components/Dividends'

type Weight = { symbol: string; weight: number; value: number; shares: number; gain_loss_pct?: number }

export default function PortfolioPage() {
  const [weights, setWeights] = useState<Weight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await portfolioApi.getPortfolioWeights()
        setWeights(res.weights || [])
      } catch (e: any) {
        setError('Failed to load portfolio')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const totals = useMemo(() => {
    const totalValue = weights.reduce((s, w) => s + (w.value || 0), 0)
    const weightedPL = weights.reduce((s, w) => s + (w.value || 0) * ((w.gain_loss_pct ?? 0) / 100), 0)
    const totalPLPct = totalValue > 0 ? (weightedPL / totalValue) * 100 : 0
    return { totalValue, totalPLPct }
  }, [weights])

  if (loading) return <div className="p-6">Loading portfolio...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="w-full py-6 space-y-6">
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
  )
}


