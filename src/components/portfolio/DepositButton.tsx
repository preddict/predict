'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X, CreditCard, Loader2 } from 'lucide-react'

const PRESETS = [10, 25, 50, 100, 250, 500]

export default function DepositButton() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDeposit() {
    const num = parseFloat(amount)
    if (!num || num < 5) { toast.error('Minimum deposit is $5'); return }
    if (num > 10000) { toast.error('Maximum deposit is $10,000'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      window.location.href = data.url
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Funds
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold">Add Funds</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Secure payment via Stripe</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    amount === String(p)
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={5}
                max={10000}
                className="w-full pl-7 pr-4 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) < 5}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {loading ? 'Redirecting...' : `Pay $${parseFloat(amount || '0').toFixed(2)} with Stripe`}
            </button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              Funds are added instantly after payment confirmation.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
