"use client"

import { useState } from 'react'

export default function CopyButton({ value, small = false }: { value: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <button
      onClick={onCopy}
      className={`${small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'} border rounded-lg hover:bg-slate-50`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}


