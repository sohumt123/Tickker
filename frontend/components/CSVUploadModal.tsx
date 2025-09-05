'use client'

import { useState } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { portfolioApi } from '@/utils/supabase-api'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title?: string
  subtitle?: string
  isFirstTime?: boolean
}

export default function CSVUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Upload Portfolio Data",
  subtitle = "Upload your latest Fidelity CSV to update your portfolio",
  isFirstTime = false
}: CSVUploadModalProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!user) {
      setUploadStatus('error')
      setErrorMessage('Please log in to upload your portfolio data')
      return
    }

    setUploadedFile(file)
    setUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      const result = await portfolioApi.uploadCSV(file)
      
      if (result.error) {
        throw new Error(result.error)
      }

      setUploadStatus('success')
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset modal state
        setUploadStatus('idle')
        setUploadedFile(null)
        setErrorMessage('')
      }, 1500)
      
    } catch (error: any) {
      setUploadStatus('error')
      setErrorMessage(error.response?.data?.detail || error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const handleClose = () => {
    if (uploading) return
    setUploadStatus('idle')
    setUploadedFile(null)
    setErrorMessage('')
    onClose()
  }

  const getStatusIcon = () => {
    if (uploading) return <LoadingSpinner size="lg" />
    if (uploadStatus === 'success') return <CheckCircle size={48} className="text-green-500" />
    if (uploadStatus === 'error') return <AlertCircle size={48} className="text-red-500" />
    return <Upload size={48} className="text-slate-400" />
  }

  const getStatusText = () => {
    if (uploading) return 'Processing your portfolio data...'
    if (uploadStatus === 'success') return 'Upload successful! Updating your portfolio...'
    if (uploadStatus === 'error') return errorMessage
    if (isDragActive) return 'Drop your CSV file here...'
    return 'Drag & drop your Fidelity CSV file here, or click to browse'
  }

  const getStatusColor = () => {
    if (uploadStatus === 'success') return 'border-green-300 bg-green-50'
    if (uploadStatus === 'error') return 'border-red-300 bg-red-50'
    if (isDragActive) return 'border-blue-400 bg-blue-50'
    return 'border-slate-300 hover:border-slate-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-600 mt-1">{subtitle}</p>
          </div>
          {!isFirstTime && (
            <button
              onClick={handleClose}
              disabled={uploading}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <X size={24} className="text-slate-500" />
            </button>
          )}
        </div>

        {/* Upload Area */}
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`relative overflow-hidden cursor-pointer transition-all duration-200 border-2 border-dashed rounded-xl p-12 text-center ${getStatusColor()} ${
              uploading ? 'cursor-not-allowed' : ''
            }`}
          >
            <input {...getInputProps()} disabled={uploading} />
            
            <div className="flex flex-col items-center">
              <div className="mb-6">
                {getStatusIcon()}
              </div>
              
              <p className="text-lg font-medium text-slate-700 mb-2">
                {getStatusText()}
              </p>
              
              {uploadedFile && !uploading && uploadStatus === 'idle' && (
                <div className="flex items-center text-sm text-slate-500 mb-4">
                  <FileText size={16} className="mr-2" />
                  {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                </div>
              )}
              
              {!uploading && uploadStatus === 'idle' && (
                <p className="text-sm text-slate-500">
                  Supports: Fidelity Accounts_History.csv files
                </p>
              )}
            </div>
          </div>
          
          {uploadStatus === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-700">
                <CheckCircle size={20} className="mr-2" />
                <span className="font-medium">Portfolio data processed successfully!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Your transaction history has been analyzed and your portfolio is being updated.
              </p>
            </div>
          )}

          {/* First time user instructions */}
          {isFirstTime && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Welcome to Tickker! 👋</h3>
              <p className="text-sm text-blue-700 mb-3">
                To get started, please upload your Fidelity transaction history CSV file. This will allow us to:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li>• Analyze your portfolio performance</li>
                <li>• Compare your returns with SPY</li>
                <li>• Track your investment allocations</li>
                <li>• Generate detailed analytics and insights</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFirstTime && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}