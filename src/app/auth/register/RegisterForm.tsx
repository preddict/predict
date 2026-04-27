'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Account created! Check your email to confirm.')
    router.push('/auth/login')
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
          <h1 className="text-xl font-bold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link>
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          {[
            { label: 'Name', type: 'text', value: name, set: setName, placeholder: 'Your name' },
            { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@email.com' },
            { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: 'At least 6 characters' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-foreground mb-1">{field.label}</label>
              <input type={field.type} value={field.value} onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder} required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-foreground text-background rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create free account'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing up you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>.
        </p>
      </div>
    </div>
  )
}
