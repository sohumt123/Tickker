"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { groupApi, socialApi } from '@/utils/api'
import GroupComparisonChart from '@/components/GroupComparisonChart'
import CopyButton from '@/components/CopyButton'
import Avatar from '@/components/Avatar'
import GroupNotes from '@/components/GroupNotes'

export default function GroupDetailPage() {
  const params = useParams() as { id?: string }
  const groupId = Number(params?.id || '0')
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [memberWeights, setMemberWeights] = useState<Record<number, { symbol: string; weight: number; value?: number; shares?: number }[]>>({})
  const [badges, setBadges] = useState<Record<number, any>>({})
  const [comparison, setComparison] = useState<Record<number, { date: string; value: number }[]>>({})

  useEffect(() => {
    if (!groupId) return
    (async () => {
      try {
        const [g, lb] = await Promise.all([
          groupApi.details(groupId),
          groupApi.leaderboard(groupId),
        ])
        setGroup(g)
        setLeaderboard(lb.leaderboard)
        // Fetch group-scoped details (full visibility) and group comparison
        const [details, comp] = await Promise.all([
          groupApi.membersDetails(groupId),
          groupApi.groupComparison(groupId),
        ])
        const weightMap: Record<number, any[]> = {}
        const badgeMap: Record<number, any> = {}
        details.members.forEach((m: any) => {
          weightMap[m.user_id] = m.weights || []
          badgeMap[m.user_id] = m.badges || {}
        })
        setMemberWeights(weightMap)
        setBadges(badgeMap)
        setComparison(comp.series || {})
      } catch (e: any) {
        setError('Failed to load group')
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId])

  if (!groupId) return <div className="p-6">Invalid group</div>
  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!group) return <div className="p-6">Group not found</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary-50 via-fuchsia-50 to-accent-50 backdrop-blur mb-2 border-b">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm px-3 py-1 border rounded hover:bg-slate-50">← Home</a>
            <a href="/groups" className="text-sm px-3 py-1 border rounded hover:bg-slate-50">All groups</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-xl font-semibold">{group.name}</h1>
              <p className="text-xs text-slate-500">Invite code: <span className="font-mono">{group.code}</span></p>
            </div>
            <CopyButton value={group.code} small />
          </div>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="text-lg font-medium mb-2 text-primary-700">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-slate-600">No rankings yet.</p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((row, idx) => (
              <li key={row.user_id} className="flex items-center justify-between border rounded px-3 py-2 bg-gradient-to-r from-white to-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-slate-500">#{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <Avatar name={row.name} size={28} />
                    <span className="font-medium">{row.name}</span>
                  </div>
                </div>
                <div className={`text-sm font-medium ${row.return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.return_pct}%</div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-medium mb-2 text-primary-700">Members</h2>
        {group.members.length === 0 ? (
          <p className="text-slate-600">No members</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {group.members.map((m: any) => {
              const weights = memberWeights[m.user_id] || []
              return (
                <li key={m.user_id} className="border rounded p-3 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.name} size={28} />
                      <div className="font-medium">{m.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">member</div>
                  </div>
                  {badges[m.user_id] && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {badges[m.user_id].largest_trade && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">🏆 Largest trade: {badges[m.user_id].largest_trade.symbol} {badges[m.user_id].largest_trade.action} ${badges[m.user_id].largest_trade.amount}</span>
                      )}
                      {badges[m.user_id].best_symbol && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">🚀 Best: {badges[m.user_id].best_symbol.symbol} {badges[m.user_id].best_symbol.gain_pct}%</span>
                      )}
                      {badges[m.user_id].worst_symbol && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">📉 Worst: {badges[m.user_id].worst_symbol.symbol} {badges[m.user_id].worst_symbol.gain_pct}%</span>
                      )}
                    </div>
                  )}
                  {weights.length ? (
                    <div className="text-sm">
                      <div className="text-slate-500 mb-1">Latest allocation</div>
                      <ul className="text-slate-700 space-y-1">
                        {weights.slice(0, 6).map(w => (
                          <li key={`${m.user_id}-${w.symbol}`} className="flex justify-between">
                            <span>{w.symbol}</span>
                            <span>{(w.weight).toFixed(1)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No public weights</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-medium mb-2 text-primary-700">Group Comparison (normalized)</h2>
        {Object.keys(comparison).length === 0 ? (
          <p className="text-slate-600">No data</p>
        ) : (
          <div className="space-y-2">
            <GroupComparisonChart series={comparison} members={group.members} />
            <div className="text-xs text-slate-600">Each line represents $10k invested at each member's baseline.</div>
          </div>
        )}
      </section>

      <GroupNotes groupId={groupId} />
    </div>
  )
}


