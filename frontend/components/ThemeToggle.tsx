"use client"

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('tickker_theme') : null
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = saved ? saved === 'dark' : prefersDark
    setDark(initialDark)
    applyTheme(initialDark)
  }, [])

  const applyTheme = (isDark: boolean) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }

  const toggle = () => {
    const next = !dark
    setDark(next)
    applyTheme(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tickker_theme', next ? 'dark' : 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg border text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}



