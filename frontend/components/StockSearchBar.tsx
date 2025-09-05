'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { portfolioApi } from '@/utils/supabase-api'
import { StockSearchResult, CustomSymbol } from '@/types'

interface StockSearchBarProps {
  customSymbols: CustomSymbol[]
  onAddSymbol: (symbol: CustomSymbol) => void
  onRemoveSymbol: (symbol: string) => void
  maxSymbols?: number
}

export default function StockSearchBar({ 
  customSymbols, 
  onAddSymbol, 
  onRemoveSymbol, 
  maxSymbols = 5 
}: StockSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Color palette for different overlay symbols
  const colors = [
    'rgb(34, 197, 94)',   // green
    'rgb(239, 68, 68)',   // red
    'rgb(59, 130, 246)',  // blue
    'rgb(168, 85, 247)',  // purple
    'rgb(245, 158, 11)',  // yellow
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchStocks = async () => {
      if (!query.trim() || query.length < 1) {
        setResults([])
        setShowResults(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await portfolioApi.searchStocks(query.trim())
        setResults(response.results || [])
        setShowResults(true)
      } catch (error) {
        console.error('Error searching stocks:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchStocks, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleAddSymbol = (result: StockSearchResult) => {
    if (customSymbols.length >= maxSymbols) return
    if (customSymbols.some(s => s.symbol === result.symbol)) return

    const colorIndex = customSymbols.length % colors.length
    const newSymbol: CustomSymbol = {
      symbol: result.symbol,
      name: result.name,
      color: colors[colorIndex],
      visible: true
    }

    onAddSymbol(newSymbol)
    setQuery('')
    setResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const handleRemoveSymbol = (symbol: string) => {
    onRemoveSymbol(symbol)
  }

  const isSymbolAdded = (symbol: string) => {
    return customSymbols.some(s => s.symbol === symbol)
  }

  const canAddMore = customSymbols.length < maxSymbols

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder={canAddMore ? "Search stocks/ETFs to overlay..." : `Maximum ${maxSymbols} symbols reached`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            disabled={!canAddMore}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent ${
              !canAddMore ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
            }`}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.symbol}
                onClick={() => !isSymbolAdded(result.symbol) && handleAddSymbol(result)}
                className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 ${
                  isSymbolAdded(result.symbol) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{result.symbol}</div>
                    <div className="text-sm text-slate-600 truncate">{result.name}</div>
                    {result.sector && (
                      <div className="text-xs text-slate-500">{result.sector}</div>
                    )}
                  </div>
                  <div className="flex items-center">
                    {isSymbolAdded(result.symbol) ? (
                      <span className="text-xs text-green-600 font-medium">Added</span>
                    ) : (
                      <Plus size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showResults && results.length === 0 && query && !isLoading && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3">
            <div className="text-sm text-slate-500 text-center">No results found for "{query}"</div>
          </div>
        )}
      </div>

      {/* Added Symbols */}
      {customSymbols.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700">Overlay Symbols ({customSymbols.length}/{maxSymbols})</h3>
          <div className="flex flex-wrap gap-2">
            {customSymbols.map((symbol) => (
              <div
                key={symbol.symbol}
                className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: symbol.color }}
                ></div>
                <span className="font-medium">{symbol.symbol}</span>
                <span className="text-slate-600 truncate max-w-32">{symbol.name}</span>
                <button
                  onClick={() => handleRemoveSymbol(symbol.symbol)}
                  className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}