'use client'

import { useMarketLive } from './MarketRealtimeProvider'

export default function LiveProbability() {
  const live = useMarketLive()

  const yesPercent = Math.round(live.yes_price * 100)
  const noPercent = 100 - yesPercent

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-foreground">Current probability</span>
        <span className="relative flex h-2 w-2 ml-auto">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`rounded-xl bg-green-50 border border-green-100 p-4 text-center transition-all duration-500 ${live.flash === 'up' ? 'ring-2 ring-green-400' : ''}`}>
          <div className="text-4xl font-bold text-green-600 mb-1 transition-all duration-300">{yesPercent}%</div>
          <div className="text-xs text-muted-foreground mb-1">Yes chance</div>
          <div className="text-xs text-green-600 font-medium">${live.yes_price.toFixed(3)} / share</div>
        </div>
        <div className={`rounded-xl bg-red-50 border border-red-100 p-4 text-center transition-all duration-500 ${live.flash === 'down' ? 'ring-2 ring-red-400' : ''}`}>
          <div className="text-4xl font-bold text-red-500 mb-1 transition-all duration-300">{noPercent}%</div>
          <div className="text-xs text-muted-foreground mb-1">No chance</div>
          <div className="text-xs text-red-500 font-medium">${live.no_price.toFixed(3)} / share</div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-red-100 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-700"
          style={{ width: `${yesPercent}%` }}
        />
      </div>
    </div>
  )
}
