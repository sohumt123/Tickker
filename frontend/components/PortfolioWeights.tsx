'use client'

import { useState, useEffect } from 'react'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { portfolioApi } from '@/utils/supabase-api'
import { PortfolioWeight } from '@/types'
import { formatCurrency, formatPercentage, formatWeight } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function PortfolioWeights() {
  const [weights, setWeights] = useState<PortfolioWeight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWeights()
  }, [])

  const fetchWeights = async () => {
    try {
      setLoading(true)
      const result = await portfolioApi.getPortfolioWeights()
      setWeights(result.weights || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio weights')
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (!weights.length) return null

    const colors = [
      '#4f46e5', // primary-600
      '#d946ef', // fuchsia-500
      '#06b6d4', // accent-500
      '#22c55e', // success-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#10b981', // emerald-500
      '#e879f9', // fuchsia-400
      '#22d3ee', // cyan-400
      '#a5b4fc', // indigo-300
    ]

    return {
      labels: weights.map(w => w.symbol),
      datasets: [
        {
          data: weights.map(w => w.weight),
          backgroundColor: colors.slice(0, weights.length),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 4,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgb(226, 232, 240)',
        borderWidth: 1,
        titleColor: 'rgb(15, 23, 42)',
        bodyColor: 'rgb(51, 65, 85)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const weight = context.parsed
            const symbol = context.label
            const value = weights.find(w => w.symbol === symbol)?.value || 0
            return [
              `${symbol}: ${formatWeight(weight)}`,
              `Value: ${formatCurrency(value)}`
            ]
          },
        },
      },
    },
    cutout: '60%',
  }

  const totalValue = weights.reduce((sum, w) => sum + w.value, 0)

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
          <p className="text-danger-600 mb-4">Failed to load portfolio weights</p>
          <button onClick={fetchWeights} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!weights.length) {
    return (
      <div className="card p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">No portfolio data available</p>
        </div>
      </div>
    )
  }

  const chartData = getChartData()
  if (!chartData) return null

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Portfolio Allocation</h2>
          <p className="text-slate-600">Current position weights by symbol</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex items-center justify-center">
            <div className="relative w-80 h-80">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-sm text-slate-600 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-sm text-slate-500">{weights.length} positions</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {weights.map((weight, index) => {
              const colors = [
                '#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0',
                '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'
              ]
              const color = colors[index % colors.length]

              return (
                <div key={weight.symbol} className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-100">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{weight.symbol}</p>
                      <p className="text-sm text-slate-600">
                        {weight.shares.toFixed(2)} shares
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatWeight(weight.weight)}
                    </p>
                    <p className={`text-sm font-medium ${weight.gain_loss_pct >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {formatPercentage(weight.gain_loss_pct)} P/L
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(weight.value)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Largest Position</h3>
          <p className="text-lg font-bold text-slate-900">{weights[0]?.symbol}</p>
          <p className="text-sm text-slate-600">{formatWeight(weights[0]?.weight || 0)}</p>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Positions</h3>
          <p className="text-lg font-bold text-slate-900">{weights.length}</p>
          <p className="text-sm text-slate-600">Active holdings</p>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Top 3 Weight</h3>
          <p className="text-lg font-bold text-slate-900">
            {formatWeight(weights.slice(0, 3).reduce((sum, w) => sum + w.weight, 0))}
          </p>
          <p className="text-sm text-slate-600">Concentration</p>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Smallest Position</h3>
          <p className="text-lg font-bold text-slate-900">{weights[weights.length - 1]?.symbol}</p>
          <p className="text-sm text-slate-600">{formatWeight(weights[weights.length - 1]?.weight || 0)}</p>
        </div>
      </div>
    </div>
  )
}