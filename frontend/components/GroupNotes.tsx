"use client"

import { useEffect, useState } from 'react'
import { groupApi } from '@/utils/supabase-api'

export default function GroupNotes({ groupId }: { groupId: number }) {
  const [symbol, setSymbol] = useState('AAPL')
  const [rating, setRating] = useState(7)
  const [content, setContent] = useState('')
  const [notes, setNotes] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, { count: number; avg: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await groupApi.listGroupNotes(groupId, symbol)
      setNotes(data.notes || [])
      setSummary(data.summary || {})
    } catch (e: any) {
      setError('Failed to load group notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (groupId) load()
  }, [groupId, symbol])

  const submit = async () => {
    if (!symbol || !content.trim()) return
    await groupApi.addGroupNote(groupId, symbol, rating, content)
    setContent('')
    await load()
  }

  const agg = summary[symbol]

  return (
    <section className="card p-4">
      <h2 className="text-lg font-medium mb-3">Group Notes & Ratings</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input className="input-field w-28" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
            <input className="input-field w-28" type="number" min={1} max={10} value={rating} onChange={(e) => setRating(Math.max(1, Math.min(10, Number(e.target.value))))} />
            <button className="btn-primary" onClick={submit}>Save</button>
          </div>
          <textarea className="input-field w-full" rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your thesis..." />
          {agg && (
            <div className="text-sm text-slate-600">Average rating for {symbol}: <span className="font-medium">{agg.avg}</span> ({agg.count} notes)</div>
          )}
        </div>

        <div>
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : notes.length === 0 ? (
            <div className="text-sm text-slate-600">No notes for {symbol} yet.</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {notes.map((n) => (
                <li key={n.id} className="border rounded p-2">
                  <div className="text-sm"><span className="font-medium">{n.author}</span> rated <span className="font-medium">{n.rating}/10</span></div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</div>
                  <div className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}


