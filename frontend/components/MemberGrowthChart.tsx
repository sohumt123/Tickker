"use client"

import { useEffect, useRef } from 'react'
import { Chart, ChartConfiguration, registerables } from 'chart.js'

Chart.register(...registerables)

interface MemberGrowthChartProps {
  data: { date: string; value: number }[]
  memberName: string
}

export default function MemberGrowthChart({ data, memberName }: MemberGrowthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Prepare data for Chart.js
    const labels = data.map(point => {
      const date = new Date(point.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    
    const values = data.map(point => point.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const isPositiveGrowth = values[values.length - 1] > values[0]

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${memberName}'s Portfolio Growth`,
          data: values,
          borderColor: isPositiveGrowth ? '#10b981' : '#ef4444',
          backgroundColor: isPositiveGrowth 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isPositiveGrowth ? '#10b981' : '#ef4444',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(148, 163, 184, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y
                const change = context.dataIndex > 0 
                  ? ((value - values[0]) / values[0] * 100).toFixed(2)
                  : '0.00'
                return `Value: $${value.toLocaleString()} (${change >= '0' ? '+' : ''}${change}%)`
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)'
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              },
              callback: function(value) {
                return '$' + Number(value).toLocaleString()
              }
            },
            min: minValue * 0.95,
            max: maxValue * 1.05
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, memberName])

  if (!data || data.length === 0) {
    console.log('MemberGrowthChart: No data available', { data, memberName })
    return (
      <div className="h-48 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
        <div className="text-center text-slate-500">
          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
            📈
          </div>
          <p className="text-sm">No growth data available</p>
          <p className="text-xs">Portfolio history will appear here once data is uploaded</p>
        </div>
      </div>
    )
  }

  console.log('MemberGrowthChart: Rendering with data', { dataLength: data.length, memberName })

  const totalGrowth = ((data[data.length - 1].value - data[0].value) / data[0].value * 100).toFixed(2)
  const isPositive = parseFloat(totalGrowth) >= 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Portfolio performance over time
        </div>
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
          isPositive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isPositive ? '+' : ''}{totalGrowth}% Total Growth
        </div>
      </div>
      <div className="relative h-48">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  )
}