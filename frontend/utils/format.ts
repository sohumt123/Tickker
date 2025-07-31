export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatPercentage = (percentage: number, decimals: number = 2): string => {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(decimals)}%`
}

export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export const formatShares = (shares: number): string => {
  if (shares >= 1000) {
    return `${(shares / 1000).toFixed(1)}K`
  }
  return shares.toFixed(2)
}

export const getPerformanceColor = (value: number): string => {
  if (value > 0) return 'text-success-600'
  if (value < 0) return 'text-danger-600'
  return 'text-slate-600'
}

export const getPerformanceBackground = (value: number): string => {
  if (value > 0) return 'bg-success-50 border-success-200'
  if (value < 0) return 'bg-danger-50 border-danger-200'
  return 'bg-slate-50 border-slate-200'
}