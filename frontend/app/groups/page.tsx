"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { groupApi } from '@/utils/supabase-api'
import { useRouter } from 'next/navigation'
import { Users, Plus, TrendingUp, Award, Copy, ArrowRight, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Group {
  id: number
  name: string
  code: string
  is_public?: boolean
  member_count?: number
  top_performer?: string
  performance?: number
}

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (!user) return

    loadGroups()
  }, [user, authLoading, router])

  const loadGroups = async () => {
    try {
      const res = await groupApi.mine()
      
      // Start with basic group data to show something immediately
      const groupsWithDetails = res.groups.map((g: any) => ({
        ...g,
        member_count: 1,
        top_performer: 'Loading...',
        performance: 0
      }))
      
      setGroups(groupsWithDetails)
      
      // Try to enhance each group individually, handling errors gracefully
      for (let i = 0; i < groupsWithDetails.length; i++) {
        const group = groupsWithDetails[i]
        
        try {
          // Only call leaderboard API to avoid the 500 error from details API
          const leaderboard = await groupApi.leaderboard(group.id)
          if (leaderboard?.leaderboard?.length > 0) {
            group.top_performer = leaderboard.leaderboard[0].name || 'No data'
            group.performance = leaderboard.leaderboard[0].performance || 0
          } else {
            group.top_performer = 'No data'
          }
        } catch (err) {
          console.log(`Failed to get leaderboard for group ${group.id}:`, err)
          group.top_performer = 'No data'
        }
        
        // Try to get member count separately
        try {
          const members = await groupApi.members(group.id)
          if (members?.members?.length > 0) {
            group.member_count = members.members.length
          }
        } catch (err) {
          console.log(`Failed to get members for group ${group.id}:`, err)
          // Keep default of 1
        }
      }
      
      // Update with enhanced data
      setGroups([...groupsWithDetails])
      
    } catch (e: any) {
      console.error('Failed to load groups:', e)
      setError('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    
    setCreating(true)
    try {
      await groupApi.create(newGroupName.trim(), true)
      setNewGroupName('')
      setShowCreateForm(false)
      await loadGroups()
    } catch (e: any) {
      setError('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
  }

  if (authLoading || loading) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-600 text-lg mt-4">Loading your groups...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // This will redirect to login
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-red-600" size={24} />
          </div>
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={loadGroups}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">My Groups</h1>
                <p className="text-sm text-slate-600">Manage your investment communities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus size={18} />
                Create Group
              </button>
              <a 
                href="/portfolio" 
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ← Back
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="h-full">
          {/* Create Group Form */}
          {showCreateForm && (
            <div className="mx-4 mt-2 mb-4 bg-white rounded-xl border border-slate-200 shadow-lg p-4 animate-in slide-in-from-top">
              <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={18} />
                Create New Group
              </h3>
              <form onSubmit={handleCreateGroup} className="flex gap-3">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={creating}
                />
                <button
                  type="submit"
                  disabled={creating || !newGroupName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {setShowCreateForm(false); setNewGroupName('')}}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Groups Grid */}
          {groups.length === 0 ? (
            <div className="h-full flex items-center justify-center px-4">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-3">No Groups Yet</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto text-sm">
                  Create your first investment group to start collaborating with other investors and sharing insights.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus size={18} />
                  Create Your First Group
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {groups.map((group, index) => (
                <div
                  key={group.id}
                  className="group bg-white rounded-xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Card Header */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                        {group.name}
                      </h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${
                        group.performance && group.performance > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {group.performance ? `${group.performance > 0 ? '+' : ''}${group.performance.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{group.member_count} members</span>
                      </div>
                      {group.top_performer && group.top_performer !== 'No data' && (
                        <div className="flex items-center gap-1 truncate">
                          <Award size={14} />
                          <span className="truncate">Top: {group.top_performer}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 mb-1">Invite Code</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {group.code}
                          </code>
                          <button
                            onClick={() => copyInviteCode(group.code)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Copy invite code"
                          >
                            <Copy size={12} className="text-slate-500" />
                          </button>
                        </div>
                      </div>
                      <TrendingUp className="text-blue-500 shrink-0" size={20} />
                    </div>

                    <a
                      href={`/groups/${group.id}`}
                      className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 group-hover:shadow-lg text-sm"
                    >
                      <span>Open Group</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}