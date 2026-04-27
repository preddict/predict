'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeMarkets<T extends { id: string; yes_price: number; no_price: number }>(initial: T[]) {
  const [markets, setMarkets] = useState<T[]>(initial)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('markets-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets' },
        (payload) => {
          const updated = payload.new as { id: string; yes_price: number; no_price: number }
          setMarkets(prev =>
            prev.map(m =>
              m.id === updated.id
                ? { ...m, yes_price: updated.yes_price, no_price: updated.no_price }
                : m
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return markets
}
