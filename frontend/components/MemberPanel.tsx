"use client"

import { useEffect, useState } from 'react'
import { groupApi, socialApi } from '@/utils/api'
import { TrendingUp, Award, Eye, Star } from 'lucide-react'
import GroupNotes from './GroupNotes'
import MemberGrowthChart from './MemberGrowthChart'

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

export default function MemberPanel({ groupId, userId }: { groupId: number; userId: number | null }) {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMemberName, setSelectedMemberName] = useState<string>('')

  useEffect(() => {
    if (!userId) return
    (async () => {
      setLoading(true)
      try {
        const details = await groupApi.membersDetails(groupId)
        const member = details.members.find((m: any) => m.user_id === userId)
        if (member) {
          setMemberData({
            user_id: userId,
            name: member.name,
            weights: member.weights || [],
            badges: member.badges || {},
            watchlist: member.watchlist || [],
            growth_data: member.growth_data || []
          })
          setSelectedMemberName(member.name)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [groupId, userId])

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

        {/* Stock Growth Chart Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-slate-800">Chart of Stock Growth</h3>
        </div>
        <MemberGrowthChart 
          data={memberData?.growth_data || []} 
          memberName={selectedMemberName}
        />
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Watch List Stocks */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="text-primary-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Watch List Stocks</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-3">
              Stocks {selectedMemberName} has on their watchlist with notes they have associated with them
            </p>
            
            {memberData?.weights && memberData.weights.length > 0 ? (
              <div className="space-y-2">
                {memberData.weights.slice(0, 6).map((stock) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-700">{stock.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{stock.symbol}</div>
                        <div className="text-xs text-slate-500">{stock.weight.toFixed(1)}% allocation</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">${stock.value?.toLocaleString() || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{stock.shares || 0} shares</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Eye className="mx-auto mb-2 opacity-50" size={24} />
                <p className="text-sm">No watchlist data available</p>
              </div>
            )}
          </div>
        </section>

        {/* Badges Section */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-primary-600" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Badges</h3>
          </div>
          <div className="text-sm text-slate-600 mb-4">
            The badges {selectedMemberName} has earned
          </div>
          
          <div className="space-y-3">
            {memberData?.badges && Object.keys(memberData.badges).length > 0 ? (
              <>
                {memberData.badges.best_trade && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Star className="text-green-600" size={16} />
                    <div>
                      <div className="font-medium text-green-800">Best Trade</div>
                      <div className="text-xs text-green-600">{memberData.badges.best_trade}</div>
                    </div>
                  </div>
                )}
                
                {memberData.badges.worst_trade && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <Star className="text-red-600" size={16} />
                    <div>
                      <div className="font-medium text-red-800">Worst Trade</div>
                      <div className="text-xs text-red-600">{memberData.badges.worst_trade}</div>
                    </div>
                  </div>
                )}
                
                {memberData.badges.bull_run && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <TrendingUp className="text-blue-600" size={16} />
                    <div>
                      <div className="font-medium text-blue-800">Bull Run</div>
                      <div className="text-xs text-blue-600">{memberData.badges.bull_run}</div>
                    </div>
                  </div>
                )}
                
                {memberData.badges.always_up && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <Award className="text-purple-600" size={16} />
                    <div>
                      <div className="font-medium text-purple-800">Always UP</div>
                      <div className="text-xs text-purple-600">Portfolio is up even when SPY is down</div>
                    </div>
                  </div>
                )}
                
                {memberData.badges.best_find && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Star className="text-yellow-600" size={16} />
                    <div>
                      <div className="font-medium text-yellow-800">Best Find</div>
                      <div className="text-xs text-yellow-600">{memberData.badges.best_find}</div>
                    </div>
                  </div>
                )}
                
                {memberData.badges.researcher && (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Award className="text-indigo-600" size={16} />
                    <div>
                      <div className="font-medium text-indigo-800">Researcher</div>
                      <div className="text-xs text-indigo-600">{memberData.badges.researcher} most rated stocks</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 transform rotate-45">
                  <Award className="text-slate-400" size={24} />
                </div>
                <p className="text-sm text-slate-500">No badges earned yet</p>
              </div>
            )}
          </div>
        </section>
      </div>

        <GroupNotes groupId={groupId} />
      </div>
    </div>
  )
}



