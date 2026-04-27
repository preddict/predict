'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateBuyCost, sharesForAmount, calculatePotentialProfit, calculateFee } from '@/lib/lmsr'
import { toast } from 'sonner'
import type { Market, Position, BetSide } from '@/types'

interface Props {
  market: Market
  userBalance: number
  userPosition: Position[] | null
  isAuthenticated: boolean
}

export default function BetPanel({ market, userBalance, userPosition, isAuthenticated }: Props) {
  const router = useRouter()
  const [side, setSide] = useState<BetSide>('yes')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const isOpen = market.status === 'open'
  const qYes = market.q_yes ?? 0
  const qNo = market.q_no ?? 0
  const b = market.liquidity_b ?? 100

  const shares = amountNum > 0 ? sharesForAmount(qYes, qNo, b, side, amountNum) : 0
  const { cost, newYesPrice, newNoPrice } = amountNum > 0
    ? calculateBuyCost(qYes, qNo, b, side, shares)
    : { cost: 0, newYesPrice: market.yes_price, newNoPrice: market.no_price }

  const profit = calculatePotentialProfit(shares, amountNum)
  const fee = calculateFee(profit)
  const netProfit = profit - fee

  const yesPos = userPosition?.find(p => p.side === 'yes')
  const noPos = userPosition?.find(p => p.side === 'no')

  async function handleBet() {
    if (!isAuthenticated) { router.push('/auth/login'); return }
    if (amountNum < 1) { toast.error('Minimum bet is $1.00'); return }
    if (amountNum > userBalance) { toast.error('Insufficient balance'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: market.id, side, amountBrl: amountNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place bet')
      toast.success(`Bet placed! You received ${data.shares.toFixed(2)} ${side.toUpperCase()} shares`)
      setAmount('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = [10, 50, 100, 500]

  return (
    <div className="sticky top-20 space-y-3">

      {/* User positions */}
      {isAuthenticated && (yesPos || noPos) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Your positions</p>
          <div className="space-y-2">
            {yesPos && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-green-600">YES — {yesPos.shares.toFixed(2)} shares</span>
                <span className="text-muted-foreground text-xs">@ ${yesPos.avg_price.toFixed(3)}</span>
              </div>
            )}
            {noPos && (
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-red-500">NO — {noPos.shares.toFixed(2)} shares</span>
                <span className="text-muted-foreground text-xs">@ ${noPos.avg_price.toFixed(3)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">
          {isOpen ? 'Place a bet' : market.status === 'resolved' ? 'Market resolved' : 'Market closed'}
        </p>

        {!isOpen ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {market.outcome
              ? `Result: ${market.outcome === 'yes' ? '✅ YES won' : '❌ NO won'}`
              : 'Awaiting resolution'}
          </div>
        ) : (
          <>
            {/* Balance */}
            {isAuthenticated && (
              <div className="flex justify-between text-xs mb-4 px-3 py-2 rounded-lg bg-muted">
                <span className="text-muted-foreground">Available balance</span>
                <span className="font-semibold text-foreground">
                  ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Yes / No buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setSide('yes')}
                className={`py-3 rounded-lg font-bold text-sm transition-all border ${
                  side === 'yes'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                YES {Math.round(market.yes_price * 100)}%
              </button>
              <button
                onClick={() => setSide('no')}
                className={`py-3 rounded-lg font-bold text-sm transition-all border ${
                  side === 'no'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                }`}
              >
                NO {Math.round(market.no_price * 100)}%
              </button>
            </div>

            {/* Amount input */}
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
              />
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {quickAmounts.map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="py-1.5 text-xs font-medium bg-muted border border-border hover:border-foreground hover:text-foreground text-muted-foreground rounded-lg transition-colors"
                >
                  ${v}
                </button>
              ))}
            </div>

            {/* Preview */}
            {amountNum > 0 && (
              <div className="rounded-lg bg-muted p-3 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares received</span>
                  <span className="font-medium text-foreground">{shares.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential profit</span>
                  <span className="font-semibold text-green-600">+${netProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee (5%)</span>
                  <span className="text-muted-foreground">-${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">New price</span>
                  <span className="text-foreground">
                    YES {Math.round(newYesPrice * 100)}% / NO {Math.round(newNoPrice * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Bet button */}
            <button
              onClick={handleBet}
              disabled={loading || (isAuthenticated && amountNum < 1)}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                !isAuthenticated
                  ? 'bg-foreground text-background hover:opacity-90'
                  : side === 'yes'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {!isAuthenticated
                ? 'Sign in to bet'
                : loading
                ? 'Processing...'
                : `Bet ${side.toUpperCase()}${amountNum > 0 ? ` · $${amountNum.toFixed(2)}` : ''}`}
            </button>
          </>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
        <p>Each share pays <span className="font-medium text-foreground">$1.00</span> if you win.</p>
        <p>A <span className="font-medium text-foreground">5% fee</span> is applied on profits.</p>
        <p>Prices adjust automatically with every bet (LMSR).</p>
      </div>
    </div>
  )
}
