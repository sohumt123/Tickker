"use client"

import { useEffect, useState } from 'react'
import { groupApi, socialApi } from '@/utils/supabase-api'
import { TrendingUp, Award } from 'lucide-react'
import GroupNotes from './GroupNotes'

interface MemberData {
  user_id: number
  name: string
  weights: { symbol: string; weight: number; value: number; shares: number }[]
  badges: {
    best_trade?: string
    worst_trade?: string
    bull_run?: string
    always_up?: boolean
    best_find?: string
    researcher?: number
  }
  watchlist?: { symbol: string; note?: string }[]
  growth_data?: { date: string; value: number }[]
}

export default function MemberPanel({ groupId, userId, week }: { groupId: number; userId: number | null; week?: string }) {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMemberName, setSelectedMemberName] = useState<string>('')
  const [weeklySymbols, setWeeklySymbols] = useState<{ symbol: string; pct: number }[]>([])
  const [weeklyBadges, setWeeklyBadges] = useState<{ key: string; label: string; emoji?: string; context?: string }[]>([])

  useEffect(() => {
    if (!userId) return
    (async () => {
      setLoading(true)
      try {
        const [members, leaderboard] = await Promise.all([
          groupApi.members(groupId),
          groupApi.leaderboard(groupId)
        ])
        const details = { members: members.members || [] }
        const member = details.members.find((m: any) => m.user_id === userId)
        if (member) {
          setMemberData({
            user_id: userId,
            name: member.name,
            weights: member.weights || [],
            badges: member.badges || {},
            watchlist: (member as any).watchlist || [],
            growth_data: (member as any).growth_data || []
          })
          setSelectedMemberName(member.name)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId, userId])

  useEffect(() => {
    if (!userId || !week) return
    (async () => {
      try {
        // For now, use empty data since weeklyMemberSymbols doesn't exist
        const res = { symbols: [], weekly_badges: { badges: [] } }
        const list = (res.symbols || []).map((s: any) => ({ symbol: s.symbol, pct: s.pct }))
        setWeeklySymbols(list)
        const wb = (res as any).weekly_badges?.badges || []
        setWeeklyBadges(wb)
      } catch {
        setWeeklySymbols([])
        setWeeklyBadges([])
      }
    })()
  }, [groupId, userId, week])

  if (!userId) return (
    <div className="flex-1 p-6 text-slate-600 text-center">
      <div className="max-w-md mx-auto">
        <TrendingUp className="mx-auto mb-4 text-slate-400" size={48} />
        <h3 className="text-lg font-semibold mb-2">Select a Member</h3>
        <p>Choose a member from the directory to view their detailed portfolio, watch list, and achievements.</p>
      </div>
    </div>
  )

  if (loading) return (
    <div className="flex-1 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-64 bg-slate-200 rounded"></div>
        <div className="h-48 bg-slate-200 rounded"></div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedMemberName} Portfolio</h2>
        <div className="w-24 h-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gradient-to-br from-slate-50 to-white">


      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly Symbol Changes */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-primary-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Weekly Symbol Changes</h3>
            {week && (
              <span className="ml-auto text-xs text-slate-500">Week: {week}</span>
            )}
          </div>
          {weeklySymbols.length === 0 ? (
            <div className="text-sm text-slate-500">No symbols to show</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {weeklySymbols.map((s) => (
                <li key={s.symbol} className="flex items-center justify-between py-2">
                  <span className="font-medium text-slate-800">{s.symbol}</span>
                  <span className={`text-sm font-semibold ${s.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Weekly Badges */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-primary-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Weekly Badges</h3>
          </div>
          {weeklyBadges.length === 0 ? (
            <div className="text-sm text-slate-500">No weekly badges yet</div>
          ) : (
            <ul className="space-y-2">
              {weeklyBadges.map((b, i) => (
                <li key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-sm text-slate-700">
                  <span className="shrink-0">{b.emoji || '🏅'}</span>
                  <span className="font-medium">{b.label}</span>
                  {b.context && <span className="text-slate-500">— {b.context}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>

        <GroupNotes groupId={groupId} />
      </div>
    </div>
  )
}



