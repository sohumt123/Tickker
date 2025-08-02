'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface BaselineOption {
  value: string
  label: string
  description: string
  type: 'recent' | 'milestone' | 'portfolio'
}

interface BaselineScrollSelectorProps {
  portfolioStartDate: string
  baselineDate?: string
  onBaselineDateChange: (date: string) => void
  timeRange?: string
  className?: string
}

export default function BaselineScrollSelector({
  portfolioStartDate,
  baselineDate,
  onBaselineDateChange,
  timeRange,
  className = ''
}: BaselineScrollSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<BaselineOption[]>([])
  const [selectedOption, setSelectedOption] = useState<BaselineOption | null>(null)

  useEffect(() => {
    generateTimelineOptions()
  }, [portfolioStartDate])

  useEffect(() => {
    if (baselineDate && options.length > 0) {
      const option = options.find(opt => opt.value === baselineDate) || options[options.length - 1]
      setSelectedOption(option)
    }
  }, [baselineDate, options])

  const generateTimelineOptions = () => {
    if (!portfolioStartDate) return
    
    const now = new Date()
    const portfolioStart = new Date(portfolioStartDate)
    const timelineOptions: BaselineOption[] = []

    // Add recent time options (1 hour ago to few days ago)
    const recentOptions = [
      { hours: 1, label: '1 hour ago', description: 'Very recent investment timing' },
      { hours: 6, label: '6 hours ago', description: 'Earlier today' },
      { hours: 24, label: '1 day ago', description: 'Yesterday\'s timing' },
      { hours: 72, label: '3 days ago', description: 'This week' },
      { hours: 168, label: '1 week ago', description: 'Last week' },
    ]

    for (const option of recentOptions) {
      const date = new Date(now.getTime() - (option.hours * 60 * 60 * 1000))
      // Only show recent options if they're after portfolio start (for meaningful comparison)
      if (date >= portfolioStart) {
        timelineOptions.push({
          value: date.toISOString().split('T')[0],
          label: option.label,
          description: option.description,
          type: 'recent'
        })
      }
    }

    // Add milestone options (weeks, months back)
    const milestoneOptions = [
      { days: 30, label: '1 month ago', description: 'Monthly perspective' },
      { days: 90, label: '3 months ago', description: 'Quarterly view' },
      { days: 180, label: '6 months ago', description: 'Semi-annual timing' },
      { days: 365, label: '1 year ago', description: 'Annual comparison' },
      { days: 730, label: '2 years ago', description: 'Long-term perspective' },
      { days: 1095, label: '3 years ago', description: 'Multi-year view' },
    ]

    for (const option of milestoneOptions) {
      const date = new Date(now.getTime() - (option.days * 24 * 60 * 60 * 1000))
      // Show all milestone options - they can be before portfolio start for "what if" analysis
      timelineOptions.push({
        value: date.toISOString().split('T')[0],
        label: option.label, 
        description: option.description + (date < portfolioStart ? ' (what-if timing)' : ''),
        type: 'milestone'
      })
    }

    // Add portfolio start date
    timelineOptions.push({
      value: portfolioStartDate,
      label: 'Portfolio start',
      description: 'When you first invested',
      type: 'portfolio'
    })

    // Sort by date (most recent first)
    timelineOptions.sort((a, b) => new Date(b.value).getTime() - new Date(a.value).getTime())

    setOptions(timelineOptions)
  }

  const handleOptionSelect = (option: BaselineOption) => {
    setSelectedOption(option)
    onBaselineDateChange(option.value)
    setIsOpen(false)
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  if (!selectedOption) return null

  // Check if timeRange is controlling the baseline
  const isTimeRangeControlled = timeRange && timeRange !== 'MAX'
  const displayLabel = isTimeRangeControlled ? `${timeRange} ago` : selectedOption.label

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors min-w-max ${
          isTimeRangeControlled 
            ? 'text-blue-700 border-blue-300 bg-blue-50' 
            : 'text-slate-700 border-slate-300'
        }`}
      >
        <span>From: {displayLabel}</span>
        {isTimeRangeControlled && (
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">auto</span>
        )}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options dropdown */}
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto min-w-max">
            <div className="p-2">
              <div className="text-sm font-medium text-slate-700 mb-2 px-2">
                Choose investment timing
              </div>
              
              {options.map((option, index) => {
                const isSelected = selectedOption?.value === option.value
                const isNewSection = index > 0 && options[index - 1].type !== option.type
                
                return (
                  <div key={option.value}>
                    {isNewSection && (
                      <div className="h-px bg-slate-200 my-2" />
                    )}
                    <button
                      onClick={() => handleOptionSelect(option)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        isSelected 
                          ? 'bg-slate-100 text-slate-900' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-slate-500">
                            {option.description}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 ml-4">
                          {formatDisplayDate(option.value)}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
            
            <div className="border-t border-slate-200 p-3 bg-slate-50 text-xs text-slate-500">
              <p>Portfolio will stay flat at $10k before your first investment</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}