'use client'

import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { useAuthedFetch } from '@/hooks/useAuthedFetch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, LogOut, User, LayoutDashboard, Wallet, TrendingUp } from 'lucide-react'
import NotificationBell from './NotificationBell'
import Image from 'next/image'

const navLinks = [
  { href: '/', label: 'All' },
  { href: '/?category=politics', label: 'Politics' },
  { href: '/?category=sports', label: 'Sports' },
  { href: '/?category=crypto', label: 'Crypto' },
  { href: '/?category=economy', label: 'Economy' },
  { href: '/?category=entertainment', label: 'Entertainment' },
  { href: '/?category=world', label: 'World' },
  { href: '/leaderboard', label: '🏆 Leaderboard' },
  { href: '/how-it-works', label: 'How it works' },
]

export default function Header() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const authedFetch = useAuthedFetch()
  const [searchQuery, setSearchQuery] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated || !user) return
    authedFetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.balance !== undefined) setBalance(d.balance)
        if (d.is_admin) setIsAdmin(true)
        if (d.avatar_url) setAvatarUrl(d.avatar_url)
      }).catch(() => {})
  }, [authenticated, user, authedFetch])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) window.location.href = `/?q=${encodeURIComponent(searchQuery.trim())}`
  }

  const displayName = user?.email?.address || user?.google?.email || user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4) || 'User'
  const initials = (user?.email?.address?.[0] || user?.google?.name?.[0] || 'U').toUpperCase()

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

          <form onSubmit={handleSearch} className="flex-1 max-w-xs sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {!ready ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded-lg" />
            ) : authenticated ? (
              <>
                <NotificationBell />
                <Link href="/portfolio">
                  <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-secondary transition-colors text-xs sm:text-sm font-medium">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{balance !== null ? `$${balance.toFixed(2)}` : '...'}</span>
                  </button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-foreground transition-all">
                      {avatarUrl ? (
                        <div className="w-full h-full relative overflow-hidden rounded-full">
                          <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-foreground text-background text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted-foreground truncate">{displayName}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = '/portfolio'} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> Portfolio
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => window.location.href = '/admin'} className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" /> Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} variant="destructive" className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <button
                onClick={() => login()}
                className="px-4 py-1.5 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign in
              </button>
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
