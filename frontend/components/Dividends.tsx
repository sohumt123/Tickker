"use client"

import { useEffect, useMemo, useState } from 'react'
import { portfolioApi } from '@/utils/supabase-api'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

export default function Dividends() {
  const [trades, setTrades] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        // pull a larger set to capture dividend history
        const res = await portfolioApi.getRecentTrades(500)
        setTrades(res.trades || [])
      } catch (e: any) {
        setError('Failed to load dividends')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const dividendRows = useMemo(() => {
    const isDividend = (action: string) => /dividend|reinvest|interest/i.test(action)
    return (trades || []).filter((t) => isDividend(t.action))
  }, [trades])

  const totals = useMemo(() => {
    const total = dividendRows.reduce((s, t) => s + Math.abs(t.amount), 0)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const last12m = dividendRows
      .filter((t) => new Date(t.date) >= oneYearAgo)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    return { total, last12m }
  }, [dividendRows])

  if (loading) return <div className="card p-6">Loading dividends...</div>
  if (error) return <div className="card p-6 text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-slate-500">Total Dividends (All time)</div>
          <div className="text-2xl font-bold mt-1 dark:text-slate-100">{formatCurrency(totals.total)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">Dividends (Last 12 months)</div>
          <div className="text-2xl font-bold mt-1 dark:text-slate-100">{formatCurrency(totals.last12m)}</div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">Dividend history</h3>
        {dividendRows.length === 0 ? (
          <p className="text-slate-600">No dividend transactions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3">Date</th>
                  <th className="text-left py-3 px-3">Symbol</th>
                  <th className="text-left py-3 px-3">Action</th>
                  <th className="text-right py-3 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {dividendRows.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3">{formatDate(t.date)}</td>
                    <td className="py-3 px-3 font-medium">{t.symbol}</td>
                    <td className="py-3 px-3">{t.action}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(Math.abs(t.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}



