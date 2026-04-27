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
  // Auth check
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runSync()
}

// Also allow GET for easy manual trigger via browser (admin only)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}

async function runSync() {
  const supabase = await createAdminClient()
  const results = { imported: 0, updated: 0, resolved: 0, errors: 0, skipped: 0 }

  try {
    // 1. Fetch active markets from Polymarket
    const [activeMarkets, resolvedMarkets] = await Promise.all([
      fetchPolymarketMarkets(150),
      fetchResolvedMarkets(50),
    ])

    // 2. Process active markets
    for (const pm of activeMarkets) {
      try {
        // Skip markets without proper binary outcomes
        const outcomes = JSON.parse(pm.outcomes || '[]')
        if (outcomes.length !== 2) { results.skipped++; continue }
        if (!pm.question || pm.question.length < 10) { results.skipped++; continue }

        const { yes, no } = parseOutcome(pm.outcomePrices)
        const category = detectCategory(pm.question, pm.events?.[0]?.title || '')
        const closesAt = pm.endDate || new Date(Date.now() + 90 * 86400000).toISOString()

        // Check if market already exists
        const { data: existing } = await supabase
          .from('markets')
          .select('id, yes_price, no_price, volume_brl')
          .eq('polymarket_id', pm.id)
          .single()

        if (existing) {
          // Update prices and volume
          await supabase.from('markets').update({
            yes_price: yes,
            no_price: no,
            polymarket_volume: pm.volumeNum || 0,
          }).eq('polymarket_id', pm.id)

          // Record price history if price changed significantly
          const priceDiff = Math.abs(yes - existing.yes_price)
          if (priceDiff > 0.005) {
            await supabase.from('price_history').insert({
              market_id: existing.id,
              yes_price: yes,
              volume_brl: existing.volume_brl,
            })
          }
          results.updated++
        } else {
          // Import new market
          const { error } = await supabase.from('markets').insert({
            title: pm.question,
            description: pm.description || '',
            category,
            image_url: pm.image || pm.icon || null,
            polymarket_id: pm.id,
            polymarket_image: pm.image || null,
            polymarket_volume: pm.volumeNum || 0,
            yes_price: yes,
            no_price: no,
            q_yes: 0,
            q_no: 0,
            liquidity_b: Math.min(Math.max(pm.liquidityNum / 10 || 100, 50), 1000),
            volume_brl: 0,
            status: 'open',
            closes_at: closesAt,
          })

          if (error) {
            if (!error.message.includes('duplicate')) results.errors++
          } else {
            results.imported++
          }
        }
      } catch {
        results.errors++
      }
    }

    // 3. Auto-resolve closed markets
    for (const pm of resolvedMarkets) {
      try {
        const outcome = detectResolution(pm.outcomePrices)
        if (!outcome) continue

        const { data: existing } = await supabase
          .from('markets')
          .select('id, status')
          .eq('polymarket_id', pm.id)
          .single()

        if (existing && existing.status === 'open') {
          await supabase.rpc('resolve_market', {
            p_market_id: existing.id,
            p_outcome: outcome,
          })
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
