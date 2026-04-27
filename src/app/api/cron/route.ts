import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const SYNC_SECRET = process.env.SYNC_SECRET || 'predict-sync-2026'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const [syncRes] = await Promise.all([
    fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SYNC_SECRET}` },
    }),
    sendClosingSoonNotifications(),
  ])

  const syncData = await syncRes.json()
  return NextResponse.json({ sync: syncData, timestamp: new Date().toISOString() })
}

async function sendClosingSoonNotifications() {
  try {
    const admin = await createAdminClient()

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Markets closing in the next 24–48h window (avoids spamming every hour)
    const { data: closingMarkets } = await admin
      .from('markets')
      .select('id, title')
      .eq('status', 'open')
      .gte('closes_at', in24h.toISOString())
      .lte('closes_at', in48h.toISOString())

    if (!closingMarkets || closingMarkets.length === 0) return

    for (const market of closingMarkets) {
      const { data: positions } = await admin
        .from('positions')
        .select('user_id')
        .eq('market_id', market.id)
        .gt('shares', 0)

      if (!positions || positions.length === 0) continue

      const userIds = [...new Set(positions.map((p: any) => p.user_id))]

      const { data: existing } = await admin
        .from('notifications')
        .select('user_id')
        .eq('market_id', market.id)
        .eq('type', 'closing_soon')
        .in('user_id', userIds)

      const alreadyNotified = new Set((existing || []).map((n: any) => n.user_id))
      const toNotify = userIds.filter(id => !alreadyNotified.has(id))
      if (toNotify.length === 0) continue

      await admin.from('notifications').insert(
        toNotify.map(userId => ({
          user_id: userId,
          type: 'closing_soon',
          title: 'Market closing soon',
          body: `${market.title} closes in less than 24 hours. Place your bets!`,
          market_id: market.id,
          read: false,
        }))
      )
    }
  } catch {
    // silent — never fail the whole cron job
  }
}
