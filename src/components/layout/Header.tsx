'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, LogOut, User, LayoutDashboard, Wallet, TrendingUp } from 'lucide-react'
import type { User as UserType } from '@/types'

const navLinks = [
  { href: '/', label: 'All' },
  { href: '/?category=politics', label: 'Politics' },
  { href: '/?category=sports', label: 'Sports' },
  { href: '/?category=crypto', label: 'Crypto' },
  { href: '/?category=economy', label: 'Economy' },
  { href: '/?category=entertainment', label: 'Entertainment' },
  { href: '/?category=world', label: 'World' },
]

export default function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<UserType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      if (profile) setUser(profile as UserType)
    }
    loadUser()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex h-14 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-background stroke-[2.5]" />
            </div>
            <span className="text-base font-bold tracking-widest text-foreground">PREDICT</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link href="/portfolio">
                  <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-secondary transition-colors text-sm font-medium">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    ${user.balance_brl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-foreground transition-all">
                      <AvatarFallback className="bg-foreground text-background text-xs font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/portfolio')} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> Portfolio
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" /> Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} variant="destructive" className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <button className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Log in
                  </button>
                </Link>
                <Link href="/auth/register">
                  <button className="px-4 py-1.5 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity">
                    Sign up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Sub nav */}
        <div className="flex items-center overflow-x-auto -mb-px">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent hover:border-foreground transition-all shrink-0"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
