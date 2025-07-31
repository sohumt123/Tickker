'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Target, Award, Calendar, BarChart3 } from 'lucide-react'
import { portfolioApi } from '@/utils/api'
import { PerformanceMetrics as PerformanceMetricsType } from '@/types'
import { formatPercentage, getPerformanceColor, getPerformanceBackground } from '@/utils/format'
import LoadingSpinner from './LoadingSpinner'

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetricsType>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const result = await portfolioApi.getPerformanceMetrics()
      setMetrics(result.metrics || {})
    } catch (err: any) {
      setError(err.message || 'Failed to load performance metrics')
    } finally {
      setLoading(false)
    }
  }

  const periods = [
    { key: '1M', label: '1 Month', icon: Calendar },
    { key: '3M', label: '3 Months', icon: Target },
    { key: '6M', label: '6 Months', icon: BarChart3 },
    { key: '1Y', label: '1 Year', icon: Award },
  ]

  const getPerformanceIcon = (outperformance: number) => {
    return outperformance >= 0 ? (
      <TrendingUp className="text-success-600" size={20} />
    ) : (
      <TrendingDown className="text-danger-600" size={20} />
    )
  }

  const getBestPerformingPeriod = () => {
    let best = { period: '', outperformance: -Infinity }
    
    Object.entries(metrics).forEach(([period, metric]) => {
      if (metric && metric.outperformance > best.outperformance) {
        best = { period, outperformance: metric.outperformance }
      }
    })
    
    return best.period ? best : null
  }

  const getWorstPerformingPeriod = () => {
    let worst = { period: '', outperformance: Infinity }
    
    Object.entries(metrics).forEach(([period, metric]) => {
      if (metric && metric.outperformance < worst.outperformance) {
        worst = { period, outperformance: metric.outperformance }
      }
    })
    
    return worst.period ? worst : null
  }

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
          <p className="text-danger-600 mb-4">Failed to load performance metrics</p>
          <button onClick={fetchMetrics} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const hasData = Object.keys(metrics).length > 0
  const bestPeriod = getBestPerformingPeriod()
  const worstPeriod = getWorstPerformingPeriod()

  if (!hasData) {
    return (
      <div className="card p-8">
        <div className="text-center py-12">
          <p className="text-slate-600">No performance data available</p>
          <p className="text-sm text-slate-500 mt-2">
            Performance metrics will appear once you have sufficient historical data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Performance vs SPY</h2>
          <p className="text-slate-600">Compare your portfolio returns against the S&P 500</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {periods.map(({ key, label, icon: Icon }) => {
            const metric = metrics[key as keyof PerformanceMetricsType]
            
            if (!metric) {
              return (
                <div key={key} className="card p-6 opacity-50">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="text-slate-400" size={24} />
                    <span className="text-sm text-slate-500">No data</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{label}</h3>
                  <p className="text-sm text-slate-500">Insufficient data</p>
                </div>
              )
            }

            return (
              <div key={key} className={`card p-6 border-2 ${getPerformanceBackground(metric.outperformance)}`}>
                <div className="flex items-center justify-between mb-4">
                  <Icon className="text-slate-600" size={24} />
                  {getPerformanceIcon(metric.outperformance)}
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{label}</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Portfolio:</span>
                    <span className={`font-medium ${getPerformanceColor(metric.portfolio_return)}`}>
                      {formatPercentage(metric.portfolio_return)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">SPY:</span>
                    <span className={`font-medium ${getPerformanceColor(metric.spy_return)}`}>
                      {formatPercentage(metric.spy_return)}
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Outperformance:</span>
                      <span className={`font-bold ${getPerformanceColor(metric.outperformance)}`}>
                        {formatPercentage(metric.outperformance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bestPeriod && (
          <div className="card p-6 bg-success-50 border-success-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Award className="text-success-600" size={24} />
                <h3 className="text-lg font-semibold text-success-900 ml-2">Best Performance</h3>
              </div>
              <TrendingUp className="text-success-600" size={20} />
            </div>
            
            <div className="space-y-2">
              <p className="text-success-700">
                <span className="font-medium">{periods.find(p => p.key === bestPeriod.period)?.label}</span>
              </p>
              <p className="text-2xl font-bold text-success-900">
                {formatPercentage(bestPeriod.outperformance)} vs SPY
              </p>
              <p className="text-sm text-success-600">Your strongest outperformance period</p>
            </div>
          </div>
        )}

        {worstPeriod && (
          <div className="card p-6 bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Target className="text-orange-600" size={24} />
                <h3 className="text-lg font-semibold text-orange-900 ml-2">Focus Area</h3>
              </div>
              <TrendingDown className="text-orange-600" size={20} />
            </div>
            
            <div className="space-y-2">
              <p className="text-orange-700">
                <span className="font-medium">{periods.find(p => p.key === worstPeriod.period)?.label}</span>
              </p>
              <p className="text-2xl font-bold text-orange-900">
                {formatPercentage(worstPeriod.outperformance)} vs SPY
              </p>
              <p className="text-sm text-orange-600">Room for improvement in this timeframe</p>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Summary</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-600 mb-1">Periods Outperforming</p>
              <p className="text-2xl font-bold text-success-600">
                {Object.values(metrics).filter(m => m && m.outperformance > 0).length}
              </p>
              <p className="text-sm text-slate-500">out of {Object.keys(metrics).length}</p>
            </div>
            
            <div>
              <p className="text-sm text-slate-600 mb-1">Average Outperformance</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(
                Object.values(metrics).reduce((sum, m) => sum + (m?.outperformance || 0), 0) / Object.keys(metrics).length
              )}`}>
                {formatPercentage(
                  Object.values(metrics).reduce((sum, m) => sum + (m?.outperformance || 0), 0) / Object.keys(metrics).length
                )}
              </p>
              <p className="text-sm text-slate-500">across all periods</p>
            </div>
            
            <div>
              <p className="text-sm text-slate-600 mb-1">Consistency Score</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round((Object.values(metrics).filter(m => m && m.outperformance > 0).length / Object.keys(metrics).length) * 100)}%
              </p>
              <p className="text-sm text-slate-500">outperformance rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}