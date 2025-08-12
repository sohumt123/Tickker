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
        
        // Auto-select the first member from leaderboard if none selected
        if (lb.leaderboard.length > 0 && !selectedUserId) {
          setSelectedUserId(lb.leaderboard[0].user_id)
        }
        
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
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">← Home</a>
            <a href="/groups" className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">All groups</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-xl font-semibold text-slate-800">{group.name}</h1>
              <p className="text-xs text-slate-500">Invite code: <span className="font-mono">{group.code}</span></p>
            </div>
            <CopyButton value={group.code} small />
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 p-6 min-h-0">
        {/* Left Side - Leaderboard */}
        <div className="col-span-5">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">{group.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Timeframe:</span>
                  <select className="px-3 py-1 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="all-time">All Time</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-md font-medium mb-4 text-slate-700">Weekly LeaderBoard</h3>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Avatar name="?" size={32} />
                  </div>
                  <p className="text-sm">No rankings yet</p>
                  <p className="text-xs">Upload portfolios to see leaderboard</p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {leaderboard.map((row, idx) => (
                    <li key={row.user_id}>
                      <button
                        onClick={() => setSelectedUserId(row.user_id)}
                        className={`w-full flex items-center justify-between p-4 border rounded-lg transition-all duration-200 text-left ${
                          selectedUserId === row.user_id 
                            ? 'border-primary-300 bg-primary-50 shadow-md' 
                            : 'border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white hover:shadow-md hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            selectedUserId === row.user_id 
                              ? 'bg-primary-200 text-primary-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <Avatar name={row.name} size={36} />
                            <div>
                              <span className={`font-semibold ${
                                selectedUserId === row.user_id ? 'text-primary-900' : 'text-slate-800'
                              }`}>{row.name}</span>
                              {idx === 0 && (
                                <div className="text-xs text-yellow-600 font-medium">🏆 Top Performer</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${row.return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {row.return_pct >= 0 ? '+' : ''}{row.return_pct}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.return_pct >= 0 ? 'Gain' : 'Loss'}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* Right Side - Member Portfolio */}
        <div className="col-span-7">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
            <MemberPanel groupId={groupId} userId={selectedUserId} />
          </section>
        </div>
      </div>
    </div>
  )
}


