'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Upload, TrendingUp, BarChart3, Target } from 'lucide-react'
import CSVUploadModal from '@/components/CSVUploadModal'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
  }, [user, authLoading, router])

  const handleUploadSuccess = () => {
    // Redirect to portfolio after successful upload
    router.push('/portfolio')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 size={40} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
              Welcome to Tickker! 👋
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Let's get your portfolio set up so you can start tracking your investment performance and analytics.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Performance Analysis</h3>
              <p className="text-slate-600">
                Compare your portfolio performance against SPY and other benchmarks with detailed analytics.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Interactive Charts</h3>
              <p className="text-slate-600">
                Visualize your portfolio growth, allocation, and performance with beautiful interactive charts.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target size={32} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Smart Insights</h3>
              <p className="text-slate-600">
                Get detailed insights about your holdings, dividends, and investment strategy performance.
              </p>
            </div>
          </div>

          {/* Upload CTA */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Upload Your Portfolio Data
            </h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              To get started, upload your Fidelity transaction history CSV file. 
              This will allow us to analyze your portfolio and provide personalized insights.
            </p>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              <Upload size={24} />
              Upload Your CSV File
            </button>

            <div className="mt-6 text-sm text-slate-500">
              <p>📁 Supports: Fidelity Accounts_History.csv files</p>
              <p>🔒 Your data is secure and encrypted</p>
            </div>
          </div>

          {/* Skip Option */}
          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/portfolio')}
              className="text-slate-500 hover:text-slate-700 transition-colors underline"
            >
              Skip for now (you can upload later)
            </button>
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        title="Upload Your Portfolio Data"
        subtitle="Upload your Fidelity transaction history to get started"
        isFirstTime={true}
      />
    </>
  )
}