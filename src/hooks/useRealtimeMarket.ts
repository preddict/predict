'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MarketPrices {
  yes_price: number
  no_price: number
  q_yes: number
  q_no: number
  liquidity_b: number
  volume_brl: number
  status: string
  outcome: string | null
}

interface PriceState extends MarketPrices {
  flash: 'up' | 'down' | null
}

export function useRealtimeMarket(marketId: string, initial: MarketPrices) {
  const [prices, setPrices] = useState<PriceState>({ ...initial, flash: null })

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${marketId}` },
        (payload) => {
          const next = payload.new as MarketPrices
          setPrices(prev => {
            const flash = next.yes_price > prev.yes_price ? 'up'
              : next.yes_price < prev.yes_price ? 'down'
              : null
            return { ...next, flash }
          })
          // Clear flash after 1.5s
          setTimeout(() => setPrices(p => ({ ...p, flash: null })), 1500)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [marketId])

  return prices
}
