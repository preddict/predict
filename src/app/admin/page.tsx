export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import AdminMarkets from '@/components/admin/AdminMarkets'
import AdminStats from '@/components/admin/AdminStats'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const [{ data: markets }, { data: profiles }, { data: transactions }] = await Promise.all([
    supabase.from('markets').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, name, email, balance_brl, created_at').order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const totalVolume = markets?.reduce((s, m) => s + (m.volume_brl || 0), 0) || 0
  const openMarkets = markets?.filter(m => m.status === 'open').length || 0
  const totalUsers = profiles?.length || 0
  const totalDeposited = transactions?.filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((s, t) => s + t.amount_brl, 0) || 0

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

        <AdminMarkets markets={markets || []} />
      </main>
    </div>
  )
}
