'use client'

import { useState, useEffect } from 'react'
import { Upload, TrendingUp, PieChart, Activity, BarChart3 } from 'lucide-react'
import FileUpload from '@/components/FileUpload'
import GrowthChart from '@/components/GrowthChart'
import PortfolioWeights from '@/components/PortfolioWeights'
import RecentTrades from '@/components/RecentTrades'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const [hasData, setHasData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    checkExistingData()
  }, [])

  const checkExistingData = async () => {
    try {
      const response = await fetch('/api/portfolio/history')
      const data = await response.json()
      if (data.history && data.history.length > 0) {
        setHasData(true)
      }
    } catch (error) {
      console.log('No existing data found')
    }
  }

  const handleUploadSuccess = () => {
    setHasData(true)
    setActiveTab('overview')
    // Force a page refresh to ensure all components reload with new data
    window.location.reload()
  }

  const handleNewUpload = () => {
    setHasData(false)
    setActiveTab('overview')
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'weights', label: 'Allocation', icon: PieChart },
    { id: 'trades', label: 'Trades', icon: Activity },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ]

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-2xl mb-6">
              <TrendingUp size={32} />
            </div>
            <h1 className="text-4xl font-bold text-gradient mb-4">
              Stock Portfolio Visualizer
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Upload your Fidelity transaction history to see how your portfolio compares with SPY through interactive charts and analytics.
            </p>
          </div>
          
          <FileUpload onSuccess={handleUploadSuccess} />
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-success-100 text-success-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload size={24} />
              </div>
              <h3 className="font-semibold mb-2">Upload CSV</h3>
              <p className="text-sm text-slate-600">Drop your Fidelity Accounts_History.csv file</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-semibold mb-2">Analyze Growth</h3>
              <p className="text-sm text-slate-600">See your "Growth of $10k" vs SPY</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PieChart size={24} />
              </div>
              <h3 className="font-semibold mb-2">Track Performance</h3>
              <p className="text-sm text-slate-600">Monitor allocation and metrics</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center mr-3">
                <TrendingUp size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Portfolio Visualizer</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNewUpload}
                className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors duration-200"
              >
                <Upload size={16} className="mr-2" />
                Upload New CSV
              </button>
              
              <nav className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={16} className="mr-2" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'overview' && <GrowthChart />}
            {activeTab === 'weights' && <PortfolioWeights />}
            {activeTab === 'trades' && <RecentTrades />}
            {activeTab === 'performance' && <PerformanceMetrics />}
          </div>
        )}
      </main>
    </div>
  )
}