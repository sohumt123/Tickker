'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { portfolioApi } from '@/utils/supabase-api'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface FileUploadProps {
  onSuccess: () => void
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      }, 1500)
      
    } catch (error: any) {
      setUploadStatus('error')
      setErrorMessage(error.response?.data?.detail || error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [onSuccess, user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const getStatusIcon = () => {
    if (uploading) return <LoadingSpinner size="lg" />
    if (uploadStatus === 'success') return <CheckCircle size={48} className="text-success-500" />
    if (uploadStatus === 'error') return <AlertCircle size={48} className="text-danger-500" />
    return <Upload size={48} className="text-slate-400" />
  }

  const getStatusText = () => {
    if (uploading) return 'Processing your portfolio data...'
    if (uploadStatus === 'success') return 'Upload successful! Redirecting...'
    if (uploadStatus === 'error') return errorMessage
    if (isDragActive) return 'Drop your CSV file here...'
    return 'Drag & drop your Fidelity CSV file here, or click to browse'
  }

  const getStatusColor = () => {
    if (uploadStatus === 'success') return 'border-success-300 bg-success-50'
    if (uploadStatus === 'error') return 'border-danger-300 bg-danger-50'
    if (isDragActive) return 'border-slate-400 bg-slate-50'
    return 'border-slate-300 hover:border-slate-400'
  }

  return (
    <div className="w-full">
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
        <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg">
          <div className="flex items-center text-success-700">
            <CheckCircle size={20} className="mr-2" />
            <span className="font-medium">Portfolio data processed successfully!</span>
          </div>
          <p className="text-sm text-success-600 mt-1">
            Your transaction history has been analyzed and is ready for visualization.
          </p>
        </div>
      )}
    </div>
  )
}