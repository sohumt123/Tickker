"use client"

import { useEffect, useState } from 'react'
import { groupApi } from '@/utils/api'

export default function GroupsPage() {
  const [groups, setGroups] = useState<{ id: number; name: string; code: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await groupApi.mine()
        setGroups(res.groups)
      } catch (e: any) {
        setError('Failed to load groups')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-6">Loading groups...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Groups</h1>
      {groups.length === 0 ? (
        <p className="text-slate-600">You are not in any groups yet. Create or join one from the home page.</p>
      ) : (
        <ul className="divide-y rounded border">
          {groups.map(g => (
            <li key={g.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-slate-500">Invite code: {g.code}</div>
              </div>
              <a className="text-sm px-3 py-1 border rounded" href={`/groups/${g.id}`}>Open</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


