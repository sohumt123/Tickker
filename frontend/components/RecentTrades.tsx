'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Calendar, DollarSign, Hash } from 'lucide-react'
import { portfolioApi } from '@/utils/api'
import { Transaction } from '@/types'
import { formatCurrency, formatDate, formatNumber, getPerformanceColor } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'

export default function RecentTrades() {
  const [trades, setTrades] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    fetchTrades()
  }, [limit])

  const fetchTrades = async () => {
    try {
      setLoading(true)
      const result = await portfolioApi.getRecentTrades(limit)
      setTrades(result.trades || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load recent trades')
    } finally {
      setLoading(false)
    }
  }

  const isBuyAction = (action: string) => {
    const lowerAction = action.toLowerCase()
    return lowerAction.includes('buy') || lowerAction.includes('bought')
  }

  const isSellAction = (action: string) => {
    const lowerAction = action.toLowerCase()
    return lowerAction.includes('sell') || lowerAction.includes('sold')
  }

  const getActionIcon = (action: string) => {
    const isBuy = isBuyAction(action)
    const IconComponent = isBuy ? ArrowDownRight : ArrowUpRight
    const colorClass = isBuy ? 'text-success-600' : 'text-danger-600'
    
    return <IconComponent size={16} className={colorClass} />
  }

  const getActionColor = (action: string) => {
    if (isBuyAction(action)) {
      return 'text-success-700 bg-success-100 border-success-200'
    } else if (isSellAction(action)) {
      return 'text-danger-700 bg-danger-100 border-danger-200'
    } else {
      return 'text-slate-700 bg-slate-100 border-slate-200'
    }
  }

  const getTradeSummary = () => {
    if (!trades.length) return null

    const buyTrades = trades.filter(t => isBuyAction(t.action))
    const sellTrades = trades.filter(t => isSellAction(t.action))
    
    const totalBought = buyTrades.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalSold = sellTrades.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalBought,
      totalSold,
      netFlow: totalBought - totalSold,
    }
  }

  const summary = getTradeSummary()

  if (loading) {
    return (
      <div className="card p-8">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8">
        <div className="text-center py-12">
          <p className="text-danger-600 mb-4">Failed to load recent trades</p>
          <button onClick={fetchTrades} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!trades.length) {
    return (
      <div className="card p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">No trade data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Trades</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalTrades}</p>
              </div>
              <Hash className="text-slate-400" size={24} />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Bought</p>
                <p className="text-2xl font-bold text-success-600">{formatCurrency(summary.totalBought)}</p>
              </div>
              <ArrowDownRight className="text-success-400" size={24} />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Sold</p>
                <p className="text-2xl font-bold text-danger-600">{formatCurrency(summary.totalSold)}</p>
              </div>
              <ArrowUpRight className="text-danger-400" size={24} />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Net Flow</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(summary.netFlow)}`}>
                  {formatCurrency(summary.netFlow)}
                </p>
              </div>
              <DollarSign className="text-slate-400" size={24} />
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Recent Trades</h2>
            <p className="text-slate-600">Latest transaction history</p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <label htmlFor="limit" className="text-sm text-slate-600">Show:</label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input-field w-20"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Action</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Symbol</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Quantity</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Price</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <Calendar size={14} className="text-slate-400 mr-2" />
                      <span className="text-sm text-slate-900">{formatDate(trade.date)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      {getActionIcon(trade.action)}
                      <span className={`ml-2 px-2 py-1 rounded-md text-xs font-medium border ${getActionColor(trade.action)}`}>
                        {trade.action}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{trade.symbol}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-slate-900">{formatNumber(trade.quantity, 2)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-slate-900">{formatCurrency(trade.price)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${getPerformanceColor(trade.amount)}`}>
                      {formatCurrency(Math.abs(trade.amount))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {trades.length === limit && (
          <div className="text-center mt-6">
            <p className="text-sm text-slate-600">
              Showing {limit} most recent trades. Increase the limit to see more.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}