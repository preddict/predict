'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'
import { ArrowUpRight, X, Loader2 } from 'lucide-react'

interface Props {
  balance: number
  onSuccess: () => void
}

export default function WithdrawButton({ balance, onSuccess }: Props) {
  const { getAccessToken } = usePrivy()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleWithdraw() {
    const num = parseFloat(amount)
    if (!num || num < 1) { toast.error('Minimum withdrawal is $1.00'); return }
    if (num > balance) { toast.error('Insufficient balance'); return }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: num }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`Withdrawal of $${num.toFixed(2)} USDC requested. Processing within 24h.`)
      setOpen(false)
      setAmount('')
      onSuccess()
    } catch {
      toast.error('Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
        Withdraw
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold">Withdraw Funds</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Sent as USDC on Polygon to your wallet</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-muted border border-border p-3 mb-4">
              <p className="text-xs text-muted-foreground mb-0.5">Available balance</p>
              <p className="text-lg font-bold">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max={balance}
                className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[25, 50, 100].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(Math.min(v, balance)))}
                  disabled={balance < v}
                  className="py-1.5 text-xs font-medium bg-muted border border-border hover:border-foreground hover:text-foreground text-muted-foreground rounded-lg transition-colors disabled:opacity-40"
                >
                  ${v}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAmount(balance.toFixed(2))}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mb-4 block"
            >
              Withdraw all
            </button>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
              <p className="text-xs text-amber-700">
                Withdrawals are processed manually within <strong>24 hours</strong> and sent as USDC on Polygon to your registered wallet.
              </p>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) < 1}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Processing...' : `Withdraw${amount ? ` $${parseFloat(amount).toFixed(2)}` : ''}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
