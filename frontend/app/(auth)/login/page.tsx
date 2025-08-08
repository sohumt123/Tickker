'use client'

import { useState } from 'react'
import { authApi } from '@/utils/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await authApi.login(email, password)
      window.location.href = '/'
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Sign in to Tickker</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-slate-900 text-white rounded p-2">Sign in</button>
        <p className="text-sm">No account? <a className="underline" href="/signup">Create one</a></p>
      </form>
    </div>
  )
}


