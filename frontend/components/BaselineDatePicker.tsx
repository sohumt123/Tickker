'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface BaselineDatePickerProps {
  portfolioStartDate: string
  baselineDate?: string
  onBaselineDateChange: (date: string) => void
  className?: string
}

export default function BaselineDatePicker({
  portfolioStartDate,
  baselineDate,
  onBaselineDateChange,
  className = ''
}: BaselineDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState(baselineDate || portfolioStartDate)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    setSelectedDate(baselineDate || portfolioStartDate)
  }, [baselineDate, portfolioStartDate])

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value
    if (newDate) {
      setSelectedDate(newDate)
      onBaselineDateChange(newDate)
      setIsPickerOpen(false)
    }
  }

  // Calculate min date (10 years ago) and max date (portfolio start)
  const tenYearsAgo = new Date()
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
  const minDate = tenYearsAgo.toISOString().split('T')[0]
  const maxDate = portfolioStartDate

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsPickerOpen(!isPickerOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
      >
        <Calendar size={16} />
        <span>From: {formatDisplayDate(selectedDate)}</span>
      </button>

      {isPickerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsPickerOpen(false)}
          />
          
          {/* Date picker dropdown */}
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-4 min-w-max">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Baseline Date
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Choose when to start the $10k comparison
                </p>
              </div>
              
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedDate(portfolioStartDate)
                    onBaselineDateChange(portfolioStartDate)
                    setIsPickerOpen(false)
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                >
                  Portfolio Start
                </button>
                <button
                  onClick={() => {
                    const oneYearAgo = new Date(portfolioStartDate)
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
                    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
                    setSelectedDate(oneYearAgoStr)
                    onBaselineDateChange(oneYearAgoStr)
                    setIsPickerOpen(false)
                  }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                >
                  1Y Before
                </button>
              </div>
              
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Portfolio will stay flat at $10k before your first investment</p>
                <p>• Maximum 10 years back for performance</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}