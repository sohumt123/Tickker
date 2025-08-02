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
import { ComparisonData, CustomSymbol } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'
import StockSearchBar from './StockSearchBar'
import BaselineDatePicker from './BaselineDatePicker'

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
  const [customSymbols, setCustomSymbols] = useState<CustomSymbol[]>([])
  const [customLoading, setCustomLoading] = useState(false)
  const [baselineDate, setBaselineDate] = useState<string>('')
  const [portfolioStartDate, setPortfolioStartDate] = useState<string>('')
  const [extendedLoading, setExtendedLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [timeRange, baselineDate])

  useEffect(() => {
    if (customSymbols.length > 0) {
      fetchCustomData()
    }
  }, [customSymbols, timeRange, baselineDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Show extended loading if baseline is before portfolio start
      if (baselineDate && portfolioStartDate && baselineDate < portfolioStartDate) {
        setExtendedLoading(true)
      }
      
      const result = await portfolioApi.getSpyComparison(baselineDate)
      
      if (result.comparison) {
        let filteredData = result.comparison
        
        // Set portfolio start date from first data point (for baseline picker)
        if (result.comparison.length > 0 && !portfolioStartDate) {
          // Find the first date with portfolio data > $10k (indicating real portfolio activity)
          const firstPortfolioActivity = result.comparison.find(item => Math.abs(item.portfolio - 10000) > 0.01)
          if (firstPortfolioActivity) {
            setPortfolioStartDate(firstPortfolioActivity.date)
            if (!baselineDate) {
              setBaselineDate(firstPortfolioActivity.date)
            }
          }
        }
        
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
      console.error('Error fetching chart data:', err)
      setError(err.message || 'Failed to load chart data. Please try again.')
    } finally {
      setLoading(false)
      setExtendedLoading(false)
    }
  }

  const fetchCustomData = async () => {
    if (customSymbols.length === 0) return
    
    try {
      setCustomLoading(true)
      const symbols = customSymbols.map(s => s.symbol)
      const result = await portfolioApi.getCustomComparison(symbols, undefined, undefined, baselineDate)
      
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
      setError(err.message || 'Failed to load custom comparison data')
    } finally {
      setCustomLoading(false)
    }
  }

  const handleAddSymbol = (symbol: CustomSymbol) => {
    setCustomSymbols(prev => [...prev, symbol])
  }

  const handleRemoveSymbol = (symbolToRemove: string) => {
    setCustomSymbols(prev => prev.filter(s => s.symbol !== symbolToRemove))
    
    // If no custom symbols left, fetch original data
    if (customSymbols.length === 1) {
      fetchData()
    }
  }

  const handleBaselineDateChange = (newBaselineDate: string) => {
    setBaselineDate(newBaselineDate)
  }

  const getChartData = () => {
    if (!data.length) return null

    const labels = data.map(item => item.date)
    
    // Base datasets (Portfolio and SPY)
    const datasets = [
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
    ]

    // Add custom symbol datasets
    customSymbols.forEach((symbol) => {
      if (symbol.visible) {
        const symbolData = data.map(item => item[symbol.symbol.toLowerCase()] as number || null)
        
        datasets.push({
          label: `${symbol.symbol} (${symbol.name.substring(0, 20)}${symbol.name.length > 20 ? '...' : ''})`,
          data: symbolData,
          borderColor: symbol.color,
          backgroundColor: symbol.color + '20', // Add transparency
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1,
        })
      }
    })
    
    return {
      labels,
      datasets,
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
          
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {portfolioStartDate && (
              <BaselineDatePicker
                portfolioStartDate={portfolioStartDate}
                baselineDate={baselineDate}
                onBaselineDateChange={handleBaselineDateChange}
              />
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
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
        </div>

        {/* Stock Search Bar */}
        <div className="mb-6">
          <StockSearchBar
            customSymbols={customSymbols}
            onAddSymbol={handleAddSymbol}
            onRemoveSymbol={handleRemoveSymbol}
            maxSymbols={5}
          />
        </div>

        <div className="relative h-96 mb-6">
          <Line data={chartData} options={chartOptions} />
          {(customLoading || extendedLoading) && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                <span className="text-sm text-slate-600">
                  {extendedLoading ? 'Loading extended historical data...' : 'Loading overlay data...'}
                </span>
              </div>
            </div>
          )}
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