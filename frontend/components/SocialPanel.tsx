"use client"

import { useEffect, useState } from 'react'
import { socialApi } from '@/utils/api'

export default function SocialPanel() {
  const [feed, setFeed] = useState<any[]>([])
  const [picks, setPicks] = useState<string[]>([])
  const [a, setA] = useState('AAPL')
  const [b, setB] = useState('MSFT')
  const [symbol, setSymbol] = useState('AAPL')
  const [note, setNote] = useState('')
  const [listType, setListType] = useState<'owned'|'watch'|'wishlist'>('watch')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [feedRes, recRes] = await Promise.all([
          socialApi.feed(),
          socialApi.recommendations(),
        ])
        setFeed(feedRes.feed || [])
        setPicks(recRes.picks || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const vote = async (winner: 'A'|'B') => {
    const payload = { symbol_a: a, symbol_b: b, winner: winner === 'A' ? a : b }
    await socialApi.vote(payload)
    alert('Thanks for voting!')
  }

  const addToList = async () => {
    await socialApi.addToList({ symbol, list_type: listType })
    alert(`Added ${symbol} to ${listType}`)
  }

  const addNote = async () => {
    if (!note.trim()) return
    await socialApi.addNote({ symbol, content: note, labels: [] })
    setNote('')
    alert('Note added')
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-3">Social</h3>
      {loading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium text-slate-600 mb-2">Feed</div>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {feed.map((f, idx) => (
                <li key={idx} className="text-sm text-slate-700">
                  <span className="font-medium">{f.user}</span> {f.type}
                  {f.symbol ? <> {f.symbol}</> : null}
                  <span className="text-slate-500"> · {new Date(f.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-600 mb-2">Recommendations</div>
              {picks.length === 0 ? (
                <div className="text-sm text-slate-500">No picks yet</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {picks.map((p) => (
                    <span key={p} className="px-2 py-1 rounded border text-sm">{p}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium text-slate-600 mb-2">Quick vote</div>
              <div className="flex items-center gap-2">
                <input className="input-field w-24" value={a} onChange={(e) => setA(e.target.value.toUpperCase())} />
                <span className="text-slate-500">vs</span>
                <input className="input-field w-24" value={b} onChange={(e) => setB(e.target.value.toUpperCase())} />
                <button className="btn-primary" onClick={() => vote('A')}>{a} wins</button>
                <button className="btn-secondary" onClick={() => vote('B')}>{b} wins</button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="text-sm font-medium text-slate-600">Quick add</div>
              <div className="flex items-center gap-2">
                <input className="input-field w-24" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
                <select className="input-field w-32" value={listType} onChange={(e) => setListType(e.target.value as any)}>
                  <option value="owned">Owned</option>
                  <option value="watch">Watch</option>
                  <option value="wishlist">Wishlist</option>
                </select>
                <button className="btn-primary" onClick={addToList}>Add</button>
              </div>
              <div>
                <textarea className="input-field w-full" placeholder="Add a quick note" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-2 flex justify-end">
                  <button className="btn-secondary" onClick={addNote}>Save note</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


