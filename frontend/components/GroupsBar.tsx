"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, KeyRound, RefreshCw } from 'lucide-react'
import { authApi, groupApi } from '@/utils/supabase-api'

type Group = { id: number; name: string; code: string; is_public?: boolean }

export default function GroupsBar() {
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      await authApi.me()
      setLoggedIn(true)
      const res = await groupApi.mine()
      setGroups(res.groups || [])
      console.log('Groups loaded successfully:', res)
    } catch (e: any) {
      console.error('Error loading groups:', e)
      setLoggedIn(false)
      setGroups([])
      setError(`Failed to load groups: ${e.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async () => {
    if (!createName.trim()) return
    setBusy(true)
    setError(null)
    try {
      console.log('Creating group:', createName.trim())
      const result = await groupApi.create(createName.trim(), true)
      console.log('Group created successfully:', result)
      setCreateName('')
      await load()
    } catch (e: any) {
      console.error('Error creating group:', e)
      setError(`Could not create group: ${e.message || 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  const onJoin = async () => {
    if (!joinCode.trim()) return
    setBusy(true)
    setError(null)
    try {
      await groupApi.join(joinCode.trim())
      setJoinCode('')
      await load()
    } catch (e: any) {
      setError('Invalid invite code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-72 shrink-0 border-r bg-white/70 backdrop-blur h-[calc(100vh-3.5rem)] sticky top-14 rounded-tr-xl dark:bg-slate-900/70 dark:border-slate-800">
      <div className="p-4 border-b dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white"><Users size={16} /></span>
            <span className="font-semibold dark:text-slate-100">Groups</span>
          </div>
          <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-auto text-slate-900 dark:text-slate-200">
        {!loggedIn ? (
          <div className="text-sm text-slate-600">
            <p className="mb-2">Sign in to create or join groups.</p>
            <div className="flex gap-2">
              <Link href="/login" className="btn-secondary">Sign in</Link>
              <Link href="/signup" className="btn-primary">Create account</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">Create a group</div>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Group name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <button disabled={busy} onClick={onCreate} className="btn-primary inline-flex items-center gap-1">
                  <Plus size={16} />
                  Create
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">Join by code</div>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 font-mono dark:bg-slate-800 dark:border-slate-700"
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button disabled={busy} onClick={onJoin} className="btn-secondary inline-flex items-center gap-1 text-primary-700 border-primary-200">
                  <KeyRound size={16} />
                  Join
                </button>
              </div>
            </div>

            {error && <div className="text-xs text-red-600">{error}</div>}

            <div className="pt-2">
              <div className="text-xs font-medium text-slate-500 mb-2">Your groups</div>
              {loading ? (
                <div className="text-sm text-slate-600">Loading...</div>
              ) : groups.length === 0 ? (
                <div className="text-sm text-slate-600">No groups yet</div>
              ) : (
                <ul className="space-y-1">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <Link href={`/groups/${g.id}`} className="flex items-center justify-between px-2 py-2 rounded hover:bg-slate-100">
                        <span className="truncate">{g.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{g.code}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}


