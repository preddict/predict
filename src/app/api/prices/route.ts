import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchPolymarketMarkets, parseOutcome } from '@/lib/polymarket'

const SYNC_SECRET = process.env.SYNC_SECRET || 'predict-sync-2026'

// Lightweight price-only sync — runs in ~3s, safe for every 2 minutes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  let updated = 0

  try {
    // Fetch top 200 active markets from Polymarket
    const pmMarkets = await fetchPolymarketMarkets(200)

    // Build a map of polymarket_id -> prices
    const priceMap: Record<string, { yes: number; no: number; volume: number }> = {}
    for (const pm of pmMarkets) {
      const { yes, no } = parseOutcome(pm.outcomePrices)
      priceMap[pm.id] = { yes, no, volume: pm.volumeNum || 0 }
    }

    // Get our markets that have a polymarket_id
    const { data: ourMarkets } = await admin
      .from('markets')
      .select('id, polymarket_id, yes_price, no_price')
      .eq('status', 'open')
      .not('polymarket_id', 'is', null)

    if (!ourMarkets) return NextResponse.json({ updated: 0 })

    // Batch update prices
    const updates = []
    const historyInserts = []

    for (const m of ourMarkets) {
      const pm = priceMap[m.polymarket_id]
      if (!pm) continue

      const diff = Math.abs(pm.yes - m.yes_price)
      if (diff < 0.001) continue // skip if price unchanged

      updates.push({ id: m.id, yes_price: pm.yes, no_price: pm.no, polymarket_volume: pm.volume })

      if (diff > 0.005) {
        historyInserts.push({ market_id: m.id, yes_price: pm.yes, volume_brl: 0 })
      }
      updated++
    }

    // Run updates in parallel batches of 20
    const batchSize = 20
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      await Promise.all(
        batch.map(u =>
          admin.from('markets').update({
            yes_price: u.yes_price,
            no_price: u.no_price,
            polymarket_volume: u.polymarket_volume,
          }).eq('id', u.id)
        )
      )
    }

    if (historyInserts.length > 0) {
      await admin.from('price_history').insert(historyInserts)
    }

    return NextResponse.json({ success: true, updated, timestamp: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
