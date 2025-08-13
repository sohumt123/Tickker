"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { groupApi, socialApi } from '@/utils/api'

export default function GroupMembersExplorer() {
  const params = useParams() as { id?: string }
  const groupId = Number(params?.id || '0')
  const [members, setMembers] = useState<any[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [weights, setWeights] = useState<{ symbol: string; weight: number; value: number; shares: number }[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, { count: number; avg: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    ;(async () => {
      try {
        const g = await groupApi.details(groupId)
        setMembers(g.members)
        if (g.members.length) setSelected(g.members[0].user_id)
      } catch (e: any) {
        setError('Failed to load members')
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId])

  useEffect(() => {
    if (!selected) return
    ;(async () => {
      try {
        // We can reuse the social endpoints to get performance/weights
        const w = await socialApi.getWeights(selected)
        setWeights(w.weights || [])
        const gn = await fetch(`/api/groups/${groupId}/notes?user_id=${selected}`)
        const data = await gn.json()
        setNotes(data.notes || [])
        setSummary(data.summary || {})
      } catch {}
    })()
  }, [selected, groupId])

  const left = (
    <aside className="w-64 shrink-0 border-r">
      <div className="p-3 font-medium">Members</div>
      <ul className="max-h-[70vh] overflow-auto">
        {members.map((m) => (
          <li key={m.user_id}>
            <button
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${selected === m.user_id ? 'bg-slate-100 font-medium' : ''}`}
              onClick={() => setSelected(m.user_id)}
            >
              {m.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )

  const right = selected ? (
    <div className="flex-1 p-6 space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <section className="card p-4">
        <h2 className="text-lg font-medium mb-2">Portfolio (latest)</h2>
        {weights.length === 0 ? (
          <p className="text-slate-600">No visible weights</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2">
            {weights.map((w) => (
              <li key={w.symbol} className="flex justify-between border rounded px-2 py-1">
                <span>{w.symbol}</span>
                <span>{w.weight.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-4">
        <h2 className="text-lg font-medium mb-2">Stock rankings & notes</h2>
        {Object.keys(summary).length === 0 ? (
          <p className="text-slate-600">No notes yet</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(summary).map(([sym, s]) => (
              <div key={sym} className="flex items-center justify-between border rounded px-2 py-1">
                <span className="font-medium">{sym}</span>
                <span className="text-sm text-slate-600">avg {s.avg} · {s.count} notes</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-600 mb-1">Recent notes</h3>
          {notes.length === 0 ? (
            <p className="text-slate-500 text-sm">No notes</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {notes.map((n: any) => (
                <li key={n.id} className="border rounded p-2">
                  <div className="text-sm"><span className="font-medium">{n.symbol}</span> · {n.rating}/10</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  ) : (
    <div className="flex-1 p-6">Select a member</div>
  )

  if (!groupId) return <div className="p-6">Invalid group</div>
  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="max-w-6xl mx-auto flex border rounded overflow-hidden">
      {left}
      {right}
    </div>
  )
}



