'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeMarkets<T extends { id: string; yes_price: number; no_price: number }>(initial: T[]) {
  const [markets, setMarkets] = useState<T[]>(initial)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('markets-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'markets' },
        (payload) => {
          const updated = payload.new as { id: string; yes_price: number; no_price: number }

          setMarkets(prev => {
            const old = prev.find(m => m.id === updated.id)
            if (old && Math.abs(old.yes_price - updated.yes_price) > 0.001) {
              // Flash this market
              setFlashIds(s => new Set(s).add(updated.id))
              const existing = timers.current.get(updated.id)
              if (existing) clearTimeout(existing)
              timers.current.set(updated.id, setTimeout(() => {
                setFlashIds(s => { const n = new Set(s); n.delete(updated.id); return n })
              }, 1500))
            }
            return prev.map(m =>
              m.id === updated.id
                ? { ...m, yes_price: updated.yes_price, no_price: updated.no_price }
                : m
            )
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      timers.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return { markets, flashIds }
}
