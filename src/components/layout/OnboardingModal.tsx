'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { TrendingUp, Wallet, Trophy, ArrowRight, X } from 'lucide-react'

const STORAGE_KEY = 'predict_onboarded_v1'

const steps = [
  {
    icon: TrendingUp,
    title: 'Welcome to PREDICT',
    body: 'PREDICT is a prediction market. You bet real money on the outcome of real-world events — politics, sports, crypto, and more.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Trophy,
    title: 'How it works',
    body: 'Each market has a YES and NO side. Buy YES if you think something will happen, NO if you think it won\'t. Prices move as more people bet — the percentage reflects the crowd\'s belief.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Wallet,
    title: 'Add funds to start',
    body: 'Deposit USDC on Polygon to your embedded wallet. Go to Portfolio → Deposit to get started. Minimum bet is $1.00.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
]

export default function OnboardingModal() {
  const { authenticated } = usePrivy()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!authenticated) return
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [authenticated])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = steps[step]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-foreground' : 'w-2 bg-border'}`}
              />
            ))}
          </div>
          <button onClick={dismiss} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${current.bg} mb-5`}>
            <Icon className={`h-7 w-7 ${current.color}`} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-3">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
          >
            {step < steps.length - 1 ? (
              <>Next <ArrowRight className="h-3.5 w-3.5" /></>
            ) : (
              'Get started'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
