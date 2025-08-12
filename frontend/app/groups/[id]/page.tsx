"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { groupApi } from '@/utils/api'
import GroupComparisonChart from '@/components/GroupComparisonChart'
import CopyButton from '@/components/CopyButton'
import Avatar from '@/components/Avatar'
import GroupNotes from '@/components/GroupNotes'
import GroupDirectory from '@/components/GroupDirectory'
import MemberPanel from '@/components/MemberPanel'

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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
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

      <section className="card p-0">
        <div className="flex">
          <GroupDirectory groupId={groupId} onSelect={(uid) => setSelectedUserId(uid)} />
          <MemberPanel groupId={groupId} userId={selectedUserId} />
        </div>
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


