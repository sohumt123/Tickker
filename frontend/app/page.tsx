'use client'

import { useState, useEffect } from 'react'
import { Upload, TrendingUp, Users } from 'lucide-react'
import api, { authApi, groupApi } from '@/utils/api'
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
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkExistingData()
    // Attempt to fetch current user if token exists
    authApi.me().then(setUser).catch(() => setUser(null))
  }, [])

  const checkExistingData = async () => {
    try {
      const { data } = await api.get('/portfolio/history')
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
  ]

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-4xl font-bold text-gradient">Invest together, learn faster.</h1>
          <p className="text-slate-600">Sign in to upload your CSV and visualize performance, allocations, and group leaderboards.</p>
          <div className="flex items-center justify-center gap-2">
            <a href="/login" className="btn-secondary">Sign in</a>
            <a href="/signup" className="btn-primary">Create account</a>
          </div>
        </div>
      </div>
    )
  }

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
                <TrendingUp size={24} />
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
      <main className="py-8 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="animate-fade-in">
            <GrowthChart />
            <div className="mt-6" />
            <PortfolioWeights />
          </div>
        )}
       </main>
    </div>
  )
}