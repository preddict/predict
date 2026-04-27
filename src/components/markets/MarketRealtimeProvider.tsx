'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Market } from '@/types'

interface LiveMarket extends Market {
  flash: 'up' | 'down' | null
}

const MarketRealtimeContext = createContext<LiveMarket | null>(null)

export function useMarketLive(): LiveMarket {
  const ctx = useContext(MarketRealtimeContext)
  if (!ctx) throw new Error('useMarketLive must be used inside MarketRealtimeProvider')
  return ctx
}

interface Props {
  market: Market
  children: React.ReactNode
}

export function MarketRealtimeProvider({ market, children }: Props) {
  const [live, setLive] = useState<LiveMarket>({ ...market, flash: null })

  useEffect(() => {
    // Keep in sync if the server re-fetches (market prop changes)
    setLive(prev => ({ ...market, flash: prev.flash }))
  }, [market.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    let flashTimer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`market-live-${market.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
        (payload) => {
          const next = payload.new as Partial<Market>

          setLive(prev => {
            const newYes = next.yes_price ?? prev.yes_price
            const flash: 'up' | 'down' | null =
              newYes > prev.yes_price ? 'up' : newYes < prev.yes_price ? 'down' : null

            if (flash && flashTimer) clearTimeout(flashTimer)
            if (flash) {
              flashTimer = setTimeout(() => {
                setLive(p => ({ ...p, flash: null }))
              }, 1500)
            }

            return {
              ...prev,
              yes_price: next.yes_price ?? prev.yes_price,
              no_price: next.no_price ?? prev.no_price,
              q_yes: next.q_yes ?? prev.q_yes,
              q_no: next.q_no ?? prev.q_no,
              liquidity_b: next.liquidity_b ?? prev.liquidity_b,
              volume_brl: next.volume_brl ?? prev.volume_brl,
              status: next.status ?? prev.status,
              outcome: next.outcome !== undefined ? next.outcome : prev.outcome,
              total_bettors: next.total_bettors ?? prev.total_bettors,
              flash,
            }
          })
        }
      )
      .subscribe()

    return () => {
      if (flashTimer) clearTimeout(flashTimer)
      supabase.removeChannel(channel)
    }
  }, [market.id])

  return (
    <MarketRealtimeContext.Provider value={live}>
      {children}
    </MarketRealtimeContext.Provider>
  )
}
