"use client"

import { useEffect, useState } from 'react'
import { groupApi } from '@/utils/api'

export default function GroupDirectory({ groupId, onSelect }: { groupId: number; onSelect: (userId: number) => void }) {
  const [members, setMembers] = useState<{ user_id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const g = await groupApi.details(groupId)
        setMembers(g.members || [])
      } catch (e: any) {
        setError('Failed to load members')
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId])

  if (loading) return <div className="p-4">Loading members...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <aside className="w-56 shrink-0 border-r bg-white/70 backdrop-blur rounded-l-xl">
      <div className="p-3 text-sm font-semibold">Members</div>
      <ul className="max-h-[70vh] overflow-auto">
        {members.map((m) => (
          <li key={m.user_id}>
            <button
              onClick={() => { setActive(m.user_id); onSelect(m.user_id) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${active === m.user_id ? 'bg-slate-100 font-medium' : ''}`}
            >
              {m.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}



