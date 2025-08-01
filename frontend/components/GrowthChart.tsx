'use client'

import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { portfolioApi } from '@/utils/api'
import { ComparisonData } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function GrowthChart() {
  const [data, setData] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('1Y')

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await portfolioApi.getSpyComparison()
      
      if (result.comparison) {
        let filteredData = result.comparison
        
        if (timeRange !== 'MAX') {
          const now = new Date()
          const monthsBack = {
            '1M': 1,
            '3M': 3,
            '6M': 6,
            '1Y': 12,
            '2Y': 24,
          }[timeRange] || 12
          
          const cutoffDate = new Date(now.getTime() - (monthsBack * 30 * 24 * 60 * 60 * 1000))
          filteredData = result.comparison.filter(item => new Date(item.date) >= cutoffDate)
        }
        
        setData(filteredData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (!data.length) return null

    const labels = data.map(item => item.date)
    
    return {
      labels,
      datasets: [
        {
          label: 'Your Portfolio',
          data: data.map(item => item.portfolio),
          borderColor: 'rgb(15, 23, 42)',
          backgroundColor: 'rgba(15, 23, 42, 0.1)',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'SPY (S&P 500)',
          data: data.map(item => item.spy),
          borderColor: 'rgb(100, 116, 139)',
          backgroundColor: 'rgba(100, 116, 139, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          font: {
            size: 14,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgb(226, 232, 240)',
        borderWidth: 1,
        titleColor: 'rgb(15, 23, 42)',
        bodyColor: 'rgb(51, 65, 85)',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            return formatDate(context[0].label)
          },
          label: (context: any) => {
            const value = context.parsed.y
            const label = context.dataset.label
            return `${label}: ${formatCurrency(value)}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          callback: function(value: any, index: number, ticks: any): string {
            const date = ticks[index]?.label || value
            return new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              year: '2-digit' 
            })
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          },
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 2,
      },
    },
  }

  const timeRanges = ['1M', '3M', '6M', '1Y', '2Y', 'MAX']

  const getCurrentMetrics = () => {
    if (!data.length) return null
    
    const latest = data[data.length - 1]
    const earliest = data[0]
    
    const portfolioGrowth = ((latest.portfolio - earliest.portfolio) / earliest.portfolio) * 100
    const spyGrowth = ((latest.spy - earliest.spy) / earliest.spy) * 100
    const outperformance = portfolioGrowth - spyGrowth
    
    return {
      portfolioValue: latest.portfolio,
      spyValue: latest.spy,
      portfolioGrowth,
      spyGrowth,
      outperformance,
    }
  }

  const metrics = getCurrentMetrics()

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
          <p className="text-danger-600 mb-4">Failed to load chart data</p>
          <button onClick={fetchData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const chartData = getChartData()
  if (!chartData) {
    return (
      <div className="card p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">No data available for the selected time range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Growth of $10,000</h2>
            <p className="text-slate-600">Compare your portfolio performance with SPY</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg mt-4 sm:mt-0">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors duration-200 ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-96 mb-6">
          <Line data={chartData} options={chartOptions} />
        </div>

        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Portfolio Value</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(metrics.portfolioValue)}
              </p>
              <p className={`text-sm ${metrics.portfolioGrowth >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {metrics.portfolioGrowth >= 0 ? '+' : ''}{metrics.portfolioGrowth.toFixed(2)}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">SPY Value</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(metrics.spyValue)}
              </p>
              <p className={`text-sm ${metrics.spyGrowth >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {metrics.spyGrowth >= 0 ? '+' : ''}{metrics.spyGrowth.toFixed(2)}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Outperformance</p>
              <p className={`text-lg font-semibold ${metrics.outperformance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {metrics.outperformance >= 0 ? '+' : ''}{metrics.outperformance.toFixed(2)}%
              </p>
              <p className="text-sm text-slate-500">vs SPY</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}