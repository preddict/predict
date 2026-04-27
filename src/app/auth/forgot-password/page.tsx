'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-background stroke-[2.5]" />
            </div>
            <span className="text-lg font-bold tracking-widest">PREDICT</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="text-2xl mb-3">📬</div>
            <p className="text-sm font-semibold mb-1">Check your email</p>
            <p className="text-sm text-muted-foreground mb-4">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <Link href="/auth/login" className="text-sm font-medium underline underline-offset-4">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-foreground text-background rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="underline underline-offset-4 text-foreground">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
