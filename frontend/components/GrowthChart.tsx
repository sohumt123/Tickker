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
import { portfolioApi } from '@/utils/supabase-api'
import { ComparisonData, CustomSymbol, TWRStats } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'
import StockSearchBar from './StockSearchBar'
import BaselineScrollSelector from './BaselineScrollSelector'

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
  const [twrStats, setTwrStats] = useState<TWRStats | null>(null)
  const [netStats, setNetStats] = useState<any>(null)
  const [depositAvg, setDepositAvg] = useState<{ avg_return_pct: number } | null>(null)

  useEffect(() => {
    fetchData()
  }, [timeRange, baselineDate])

  useEffect(() => {
    if (customSymbols.length > 0) {
      fetchCustomData()
    }
  }, [customSymbols, timeRange, baselineDate])

  // Calculate baseline date based on time range
  const calculateBaselineDateFromTimeRange = (range: string): string => {
    if (range === 'MAX' || !portfolioStartDate) {
      return portfolioStartDate || ''
    }

    const now = new Date()
    const monthsBack = {
      '1M': 1,
      '3M': 3,
      '6M': 6,
      '1Y': 12,
      '2Y': 24,
    }[range] || 12

    const baselineDate = new Date(now.getTime() - (monthsBack * 30 * 24 * 60 * 60 * 1000))
    return baselineDate.toISOString().split('T')[0]
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Show extended loading if baseline is before portfolio start
      if (baselineDate && portfolioStartDate && baselineDate < portfolioStartDate) {
        setExtendedLoading(true)
      }
      
      // Fetch comparison data, TWR, net return, and deposit-averaged return
      const [comparisonResult, performanceResult, netResult] = await Promise.all([
        portfolioApi.getSpyComparison(baselineDate),
        portfolioApi.getPerformanceMetrics(),
        portfolioApi.getContributionAdjustedReturn(),
      ])
      
      if (comparisonResult.comparison) {
        let filteredData = comparisonResult.comparison
        
        // Set portfolio start date from first data point (for baseline picker)
        if (comparisonResult.comparison.length > 0 && !portfolioStartDate) {
          // Find the first date with portfolio data > $10k (indicating real portfolio activity)
          const firstPortfolioActivity = comparisonResult.comparison.find(item => Math.abs(item.portfolio - 10000) > 0.01)
          if (firstPortfolioActivity) {
            setPortfolioStartDate(firstPortfolioActivity.date)
            if (!baselineDate) {
              const initialBaselineDate = calculateBaselineDateFromTimeRange(timeRange)
              setBaselineDate(initialBaselineDate || firstPortfolioActivity.date)
            }
          }
        }
        
        // Backend handles the full baseline comparison, no need to filter here
        setData(filteredData)
      }
      
      // Set TWR and deposit-averaged stats from performance metrics
      if ((performanceResult as any).twr) {
        setTwrStats((performanceResult as any).twr)
      }
      if ((performanceResult as any).deposit_avg) {
        setDepositAvg((performanceResult as any).deposit_avg)
      }

      // Set contribution-adjusted net return stats
      if (netResult) {
        setNetStats(netResult)
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
        // Backend handles the full baseline comparison, no need to filter here
        setData(result.comparison)
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

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange)
    // Automatically set baseline date based on time range
    const newBaselineDate = calculateBaselineDateFromTimeRange(newRange)
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
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.12)',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.1,
      },
      {
        label: 'SPY (S&P 500)',
        data: data.map(item => item.spy),
        borderColor: 'rgb(148, 163, 184)',
        backgroundColor: 'rgba(148, 163, 184, 0.18)',
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
        const symbolData = data.map(item => item[symbol.symbol.toLowerCase()] as number || 0)
        
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
          color: 'rgb(148,163,184)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgb(51, 65, 85)',
        borderWidth: 1,
        titleColor: 'rgb(226,232,240)',
        bodyColor: 'rgb(203,213,225)',
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
          color: 'rgb(148,163,184)',
          callback: function(value: any, index: number): string {
            const labels = (this as any).chart?.data?.labels
            if (labels && labels[index]) {
              return new Date(labels[index]).toLocaleDateString('en-US', { 
                month: 'short', 
                year: '2-digit' 
              })
            }
            return ''
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: 'rgb(148,163,184)',
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
    
    // Chart shows normalized growth of $10k investment; for the summary percent,
    // prefer deposit-averaged return if available, else contribution-adjusted net return
    let portfolioGrowth = ((latest.portfolio - earliest.portfolio) / earliest.portfolio) * 100
    if (depositAvg && typeof depositAvg.avg_return_pct === 'number') {
      portfolioGrowth = depositAvg.avg_return_pct
    } else if (netStats && typeof netStats.pct_of_start_plus_contrib === 'number') {
      portfolioGrowth = netStats.pct_of_start_plus_contrib
    }
    const spyGrowth = ((latest.spy - earliest.spy) / earliest.spy) * 100
    const outperformance = portfolioGrowth - spyGrowth
    
    return {
      portfolioValue: latest.portfolio,
      spyValue: latest.spy,
      portfolioGrowth,
      spyGrowth,
      outperformance,
      twrStats
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
            <p className="text-slate-600">Compare your portfolio performance with SPY using time-weighted returns</p>
            {twrStats && (
              <div className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Time-Weighted Return:</span> {twrStats.twr_pct.toFixed(2)}%
                {twrStats.days > 365 && (
                  <span className="ml-3"><span className="font-medium">Annualized:</span> {twrStats.annualized_pct.toFixed(2)}%</span>
                )}
                <span className="ml-3 text-slate-500">({twrStats.days} days)</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {portfolioStartDate && baselineDate && (
              <BaselineScrollSelector
                portfolioStartDate={portfolioStartDate}
                baselineDate={baselineDate}
                onBaselineDateChange={handleBaselineDateChange}
                timeRange={timeRange}
              />
            )}
            
          <div className="flex bg-primary-50 p-1 rounded-lg border border-primary-200">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors duration-200 ${
                    timeRange === range
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-primary-700 hover:bg-primary-100'
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