'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import AdminMarkets from '@/components/admin/AdminMarkets'
import AdminStats from '@/components/admin/AdminStats'

export default function AdminPage() {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  async function fetchData() {
    if (!authenticated) return
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/admin/data', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403) { setForbidden(true); return }
      if (!res.ok) return
      setData(await res.json())
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ready) return
    if (!authenticated) { router.push('/'); return }
    fetchData()
  }, [ready, authenticated])

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Access denied.</p>
        </div>
      </div>
    )
  }

  const { markets = [], totalVolume = 0, openMarkets = 0, totalUsers = 0, totalDeposited = 0 } = data || {}

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage markets, users, and platform settings</p>
        </div>
        <AdminStats
          totalVolume={totalVolume}
          openMarkets={openMarkets}
          totalUsers={totalUsers}
          totalDeposited={totalDeposited}
        />
        <AdminMarkets markets={markets} onRefresh={fetchData} />
      </main>
    </div>
  )
}
