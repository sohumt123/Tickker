"use client"

import { useEffect, useState } from 'react'
import { groupApi, socialApi } from '@/utils/api'
import GroupNotes from './GroupNotes'

export default function MemberPanel({ groupId, userId }: { groupId: number; userId: number | null }) {
  const [weights, setWeights] = useState<{ symbol: string; weight: number; value: number; shares: number }[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    (async () => {
      setLoading(true)
      try {
        // In group, we can reuse membersDetails to get weights for everyone, but fetch single member by filtering
        const details = await groupApi.membersDetails(groupId)
        const member = details.members.find((m: any) => m.user_id === userId)
        setWeights(member?.weights || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId, userId])

  if (!userId) return <div className="p-6 text-slate-600">Select a member to view their portfolio and notes.</div>

  return (
    <div className="flex-1 p-4 space-y-6">
      <section className="card p-4">
        <h3 className="text-lg font-semibold mb-2">Portfolio snapshot</h3>
        {loading ? (
          <div>Loading...</div>
        ) : weights.length === 0 ? (
          <div className="text-slate-600">No public weights</div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-2 text-sm">
            {weights.slice(0, 10).map((w) => (
              <li key={w.symbol} className="flex justify-between border rounded px-3 py-2 bg-white">
                <span>{w.symbol}</span>
                <span>{w.weight.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GroupNotes groupId={groupId} />
    </div>
  )
}


