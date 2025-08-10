'use client'

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
} from 'chart.js'
import { useMemo } from 'react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

type Series = Record<number, { date: string; value: number }[]>

export default function GroupComparisonChart({
  series,
  members,
}: {
  series: Series
  members: { user_id: number; name: string }[]
}) {
  const palette = [
    '#4f46e5', '#d946ef', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#22d3ee'
  ]

  const labels = useMemo(() => {
    const any = Object.values(series)[0]
    return any ? any.map(p => p.date) : []
  }, [series])

  const datasets = useMemo(() => {
    return members
      .filter(m => series[m.user_id] && series[m.user_id].length)
      .map((m, idx) => {
        const color = palette[idx % palette.length]
        return {
          label: m.name,
          data: series[m.user_id].map(p => p.value),
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        }
      })
  }, [series, members])

  if (!labels.length || datasets.length === 0) {
    return <div className="text-slate-600">No comparison data</div>
  }

  return (
    <div className="h-80">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { intersect: false, mode: 'index' },
          },
          interaction: { intersect: false, mode: 'index' },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(148,163,184,0.1)' } },
          },
        }}
      />
    </div>
  )
}




