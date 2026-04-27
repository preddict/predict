'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { calculateBuyCost, sharesForAmount, calculateSellReturn, calculatePotentialProfit, calculateFee } from '@/lib/lmsr'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Market, Position, BetSide } from '@/types'

interface Props {
  market: Market
}

type Tab = 'buy' | 'sell'

export default function BetPanel({ market }: Props) {
  const { ready, authenticated, getAccessToken, login } = usePrivy()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('buy')
  const [side, setSide] = useState<BetSide>('yes')
  const [amount, setAmount] = useState('')
  const [sellShares, setSellShares] = useState('')
  const [loading, setLoading] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [positions, setPositions] = useState<Position[]>([])
  const [fetchingUser, setFetchingUser] = useState(false)

  const fetchUserData = useCallback(async () => {
    if (!authenticated) return
    setFetchingUser(true)
    try {
      const token = await getAccessToken()
      const [meRes, portRes] = await Promise.all([
        fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const me = await meRes.json()
      const port = await portRes.json()
      setUserBalance(me.balance || 0)
      const allPos: Position[] = [...(port.openPositions || []), ...(port.resolvedPositions || [])]
      setPositions(allPos.filter((p: any) => p.market_id === market.id))
    } catch {
      // silent
    } finally {
      setFetchingUser(false)
    }
  }, [authenticated, getAccessToken, market.id])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  const amountNum = parseFloat(amount) || 0
  const sellSharesNum = parseFloat(sellShares) || 0
  const isOpen = market.status === 'open'
  const qYes = market.q_yes ?? 0
  const qNo = market.q_no ?? 0
  const b = market.liquidity_b ?? 100

  // Buy preview
  const buyShares = amountNum > 0 ? sharesForAmount(qYes, qNo, b, side, amountNum) : 0
  const { cost, newYesPrice: buyNewYes, newNoPrice: buyNewNo } = amountNum > 0
    ? calculateBuyCost(qYes, qNo, b, side, buyShares)
    : { cost: 0, newYesPrice: market.yes_price, newNoPrice: market.no_price }
  const profit = calculatePotentialProfit(buyShares, amountNum)
  const fee = calculateFee(profit)
  const netProfit = profit - fee

  // Sell preview
  const userPos = positions.find(p => p.side === side)
  const maxSellShares = userPos?.shares ?? 0
  const { returnAmount, newYesPrice: sellNewYes, newNoPrice: sellNewNo } = sellSharesNum > 0
    ? calculateSellReturn(qYes, qNo, b, side, sellSharesNum)
    : { returnAmount: 0, newYesPrice: market.yes_price, newNoPrice: market.no_price }

  async function handleBuy() {
    if (!authenticated) { login(); return }
    if (amountNum < 1) { toast.error('Minimum bet is $1.00'); return }
    if (amountNum > userBalance) { toast.error('Insufficient balance'); return }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marketId: market.id, side, amountBrl: amountNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place bet')
      toast.success(`Bet placed! You got ${data.shares.toFixed(2)} ${side.toUpperCase()} shares`)
      setAmount('')
      await fetchUserData()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSell() {
    if (!authenticated) { login(); return }
    if (sellSharesNum <= 0) { toast.error('Enter shares to sell'); return }
    if (sellSharesNum > maxSellShares) { toast.error('Not enough shares'); return }

    setLoading(true)
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
      setSellShares('')
      await fetchUserData()
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
      {authenticated && positions.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Your positions</p>
          <div className="space-y-2">
            {positions.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm">
                <span className={`font-medium ${p.side === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                  {p.side.toUpperCase()} — {p.shares.toFixed(2)} shares
                </span>
                <span className="text-muted-foreground text-xs">@ ${p.avg_price.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="rounded-xl border border-border bg-card p-5">

        {!isOpen ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">
              {market.status === 'resolved' ? 'Market resolved' : 'Market closed'}
            </p>
            <div className="text-center py-6 text-muted-foreground text-sm">
              {market.outcome
                ? `Result: ${market.outcome === 'yes' ? '✅ YES won' : '❌ NO won'}`
                : 'Awaiting resolution'}
            </div>
          </>
        ) : (
          <>
            {/* Buy / Sell tabs */}
            <div className="flex mb-4 border border-border rounded-lg overflow-hidden">
              {(['buy', 'sell'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors capitalize ${
                    tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Balance */}
            {authenticated && !fetchingUser && (
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

            {tab === 'buy' ? (
              <>
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

                {/* Buy preview */}
                {amountNum > 0 && (
                  <div className="rounded-lg bg-muted p-3 mb-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shares received</span>
                      <span className="font-medium">{buyShares.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potential profit</span>
                      <span className="font-semibold text-green-600">+${netProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee (5%)</span>
                      <span className="text-muted-foreground">-${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="text-muted-foreground">New price after bet</span>
                      <span>YES {Math.round(buyNewYes * 100)}% / NO {Math.round(buyNewNo * 100)}%</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={loading || (authenticated && amountNum < 1)}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                    !authenticated
                      ? 'bg-foreground text-background hover:opacity-90'
                      : side === 'yes'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!authenticated
                    ? 'Sign in to bet'
                    : loading ? 'Processing...'
                    : `Buy ${side.toUpperCase()}${amountNum > 0 ? ` · $${amountNum.toFixed(2)}` : ''}`}
                </button>
              </>
            ) : (
              <>
                {/* Sell tab */}
                {!authenticated ? (
                  <button onClick={login} className="w-full py-3 rounded-lg font-bold text-sm bg-foreground text-background hover:opacity-90">
                    Sign in to sell
                  </button>
                ) : maxSellShares === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    You have no {side.toUpperCase()} shares to sell.
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs mb-2 px-1">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-medium">{maxSellShares.toFixed(4)} {side.toUpperCase()} shares</span>
                    </div>
                    <div className="relative mb-3">
                      <input
                        type="number"
                        value={sellShares}
                        onChange={e => setSellShares(e.target.value)}
                        placeholder="Shares to sell"
                        min="0"
                        max={maxSellShares}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setSellShares(maxSellShares.toFixed(4))}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mb-4 block"
                    >
                      Sell all shares
                    </button>

                    {sellSharesNum > 0 && (
                      <div className="rounded-lg bg-muted p-3 mb-4 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">You receive</span>
                          <span className="font-semibold text-green-600">${returnAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1.5">
                          <span className="text-muted-foreground">New price after sell</span>
                          <span>YES {Math.round(sellNewYes * 100)}% / NO {Math.round(sellNewNo * 100)}%</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSell}
                      disabled={loading || sellSharesNum <= 0 || sellSharesNum > maxSellShares}
                      className="w-full py-3 rounded-lg font-bold text-sm bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {loading ? 'Processing...' : `Sell ${side.toUpperCase()} shares`}
                    </button>
                  </>
                )}
              </>
            )}
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
