import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  fetchPolymarketMarkets,
  fetchResolvedMarkets,
  detectCategory,
  parseOutcome,
  detectResolution,
} from '@/lib/polymarket'

const SYNC_SECRET = process.env.SYNC_SECRET || 'predict-sync-2026'

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}

async function runSync() {
  const supabase = await createAdminClient()
  const results = { imported: 0, updated: 0, resolved: 0, errors: 0, skipped: 0 }

  try {
    const [activeMarkets, resolvedMarkets] = await Promise.all([
      fetchPolymarketMarkets(500),
      fetchResolvedMarkets(100),
    ])

    // Build map of existing markets by polymarket_id
    const { data: existingMarkets } = await supabase
      .from('markets')
      .select('id, polymarket_id, yes_price, volume_brl, status')
      .not('polymarket_id', 'is', null)

    const existingMap = new Map((existingMarkets || []).map(m => [m.polymarket_id, m]))

    const toInsert: any[] = []
    const toUpdate: { id: string; yes_price: number; no_price: number; polymarket_volume: number; market_id?: string; old_yes?: number }[] = []

    for (const pm of activeMarkets) {
      try {
        const outcomes = JSON.parse(pm.outcomes || '[]')
        if (outcomes.length !== 2) { results.skipped++; continue }
        if (!pm.question || pm.question.length < 10) { results.skipped++; continue }

        const { yes, no } = parseOutcome(pm.outcomePrices)
        const category = detectCategory(pm.question, pm.events?.[0]?.title || '')
        const closesAt = pm.endDate || new Date(Date.now() + 90 * 86400000).toISOString()
        const existing = existingMap.get(pm.id)

        if (existing) {
          toUpdate.push({
            id: existing.id,
            yes_price: yes,
            no_price: no,
            polymarket_volume: pm.volumeNum || 0,
            old_yes: existing.yes_price,
          })
          results.updated++
        } else {
          toInsert.push({
            title: pm.question,
            description: pm.description || '',
            category,
            image_url: pm.image || pm.icon || null,
            polymarket_id: pm.id,
            polymarket_volume: pm.volumeNum || 0,
            yes_price: yes,
            no_price: no,
            q_yes: 0,
            q_no: 0,
            liquidity_b: Math.min(Math.max((pm.liquidityNum || 1000) / 10, 50), 1000),
            volume_brl: 0,
            status: 'open',
            closes_at: closesAt,
          })
        }
      } catch {
        results.errors++
      }
    }

    // Batch insert new markets in chunks of 50
    const chunkSize = 50
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      const { error } = await supabase.from('markets').insert(chunk)
      if (error && !error.message.includes('duplicate')) results.errors++
      else results.imported += chunk.length
    }

    // Batch update prices in parallel
    const updateChunkSize = 30
    for (let i = 0; i < toUpdate.length; i += updateChunkSize) {
      const chunk = toUpdate.slice(i, i + updateChunkSize)
      await Promise.all(
        chunk.map(u =>
          supabase.from('markets').update({
            yes_price: u.yes_price,
            no_price: u.no_price,
            polymarket_volume: u.polymarket_volume,
          }).eq('id', u.id)
        )
      )
      // Insert price history for significant moves
      const historyRows = chunk
        .filter(u => Math.abs(u.yes_price - (u.old_yes || 0.5)) > 0.005)
        .map(u => ({ market_id: u.id, yes_price: u.yes_price, volume_brl: 0 }))
      if (historyRows.length > 0) {
        await supabase.from('price_history').insert(historyRows)
      }
    }

    // Auto-resolve
    for (const pm of resolvedMarkets) {
      try {
        const outcome = detectResolution(pm.outcomePrices)
        if (!outcome) continue
        const existing = existingMap.get(pm.id)
        if (existing && existing.status === 'open') {
          await supabase.rpc('resolve_market', { p_market_id: existing.id, p_outcome: outcome })
          results.resolved++
        }
      } catch {
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
      total_processed: activeMarkets.length + resolvedMarkets.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
