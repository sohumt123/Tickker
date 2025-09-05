"use client"

import { useAuth } from '@/contexts/AuthContext'
import { User, LogOut } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'

export default function AuthButton() {
  const { user, signOut, loading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <LoadingSpinner size="sm" />
  }

  if (!user) {
    return (
      <a 
        href="/login" 
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Sign in
      </a>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <span>{user.email?.split('@')[0] || 'User'}</span>
      </div>
      <button 
        onClick={handleSignOut}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}



