'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error('Invalid email or password'); setLoading(false); return }
    router.push(redirect)
    router.refresh()
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
    })
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
          <h1 className="text-xl font-bold text-foreground">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            No account?{' '}
            <Link href="/auth/register" className="font-medium text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-foreground text-background rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <button onClick={handleGoogle}
          className="w-full py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
