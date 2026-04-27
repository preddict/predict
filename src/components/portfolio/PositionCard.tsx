'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { ExternalLink, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { calculateSellReturn } from '@/lib/lmsr'

interface Market {
  id: string
  title: string
  category: string
  yes_price: number
  no_price: number
  q_yes: number
  q_no: number
  liquidity_b: number
  status: string
  outcome: string | null
}

interface Position {
  id: string
  market_id: string
  side: 'yes' | 'no'
  shares: number
  avg_price: number
  market: Market
}

interface Props {
  position: Position
  onRefresh?: () => void
}

export default function PositionCard({ position, onRefresh }: Props) {
  const { getAccessToken } = usePrivy()
  const { market, side, shares, avg_price } = position
  const currentPrice = side === 'yes' ? market.yes_price : market.no_price
  const invested = shares * avg_price
  const currentValue = shares * currentPrice
  const pnl = currentValue - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0

  const isResolved = market.status === 'resolved'
  const won = isResolved && market.outcome === side
  const lost = isResolved && market.outcome !== side
  const yesProb = Math.round(market.yes_price * 100)
  const finalValue = isResolved ? (won ? shares : 0) : currentValue

  const [showSell, setShowSell] = useState(false)
  const [sellShares, setSellShares] = useState('')
  const [selling, setSelling] = useState(false)

  const sellSharesNum = parseFloat(sellShares) || 0
  const qYes = market.q_yes ?? 0
  const qNo = market.q_no ?? 0
  const b = market.liquidity_b ?? 100
  const { returnAmount } = sellSharesNum > 0
    ? calculateSellReturn(qYes, qNo, b, side, sellSharesNum)
    : { returnAmount: 0 }

  async function handleSell() {
    if (sellSharesNum <= 0 || sellSharesNum > shares) return
    setSelling(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marketId: market.id, side, shares: sellSharesNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sell')
      toast.success(`Sold! You received $${data.returnAmount.toFixed(2)}`)
      setShowSell(false)
      setSellShares('')
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSelling(false)
    }
  }

  return (
    <>
      <div className={`rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors ${
        won ? 'border-green-300 bg-green-50/30' : lost ? 'border-red-200 bg-red-50/20' : 'border-border'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-snug line-clamp-2">{market.title}</p>
            <span className="text-xs text-muted-foreground capitalize">{market.category}</span>
          </div>
          <Link href={`/markets/${market.id}`} className="shrink-0 p-1 hover:bg-muted rounded-md text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            side === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {side.toUpperCase()}
          </span>
          {isResolved ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
            }`}>
              {won ? 'Won' : 'Lost'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground capitalize">
              {market.status}
            </span>
          )}
        </div>

        {/* Probability bar */}
        {!isResolved && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>YES {yesProb}%</span>
              <span>NO {100 - yesProb}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${yesProb}%` }} />
            </div>
          </div>
        )}

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Shares</p>
            <p className="font-medium">{shares.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Invested</p>
            <p className="font-medium">${invested.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{isResolved ? 'Final' : 'Value'}</p>
            <p className={`font-semibold ${won ? 'text-green-600' : lost ? 'text-red-500' : pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              ${finalValue.toFixed(2)}
            </p>
          </div>
        </div>

        {/* PnL + Sell */}
        {!isResolved && (
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
            </span>
            <button
              onClick={() => setShowSell(true)}
              className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Sell
            </button>
          </div>
        )}
      </div>

      {/* Sell modal */}
      {showSell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">Sell Position</h2>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{market.title}</p>
              </div>
              <button onClick={() => setShowSell(false)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-muted px-3 py-2 mb-4 flex justify-between text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-semibold">{shares.toFixed(4)} {side.toUpperCase()} shares</span>
            </div>

            <input
              type="number"
              value={sellShares}
              onChange={e => setSellShares(e.target.value)}
              placeholder="Shares to sell"
              min={0.0001}
              max={shares}
              step={0.01}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-foreground mb-2"
            />
            <button
              onClick={() => setSellShares(shares.toFixed(4))}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mb-4 block"
            >
              Sell all
            </button>

            {sellSharesNum > 0 && sellSharesNum <= shares && (
              <div className="rounded-lg bg-muted p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You receive</span>
                  <span className="font-semibold text-green-600">${returnAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">vs invested</span>
                  <span className={`font-medium ${returnAmount >= invested ? 'text-green-600' : 'text-red-500'}`}>
                    {returnAmount >= invested ? '+' : ''}${(returnAmount - invested).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSell}
              disabled={selling || sellSharesNum <= 0 || sellSharesNum > shares}
              className="w-full py-3 rounded-lg font-bold text-sm bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {selling && <Loader2 className="h-4 w-4 animate-spin" />}
              {selling ? 'Selling...' : `Sell ${sellSharesNum > 0 ? sellSharesNum.toFixed(2) : ''} ${side.toUpperCase()} shares`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
