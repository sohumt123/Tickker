"use client"

import { useEffect, useState } from 'react'

export default function AuthButton() {
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('tickker_token')
      setIsAuthed(!!token)
    }
  }, [])

  const signOut = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('tickker_token')
      // hard refresh to reset app state
      window.location.href = '/'
    }
  }

  if (!isAuthed) {
    return (
      <a href="/login" className="hover:text-primary-700 dark:hover:text-primary-400">Sign in</a>
    )
  }

  return (
    <button onClick={signOut} className="hover:text-primary-700 dark:hover:text-primary-400">Sign out</button>
  )
}



