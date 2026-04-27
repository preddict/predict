'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  market_id: string | null
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationBell() {
  const { authenticated, getAccessToken } = usePrivy()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!authenticated) return
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch { /* silent */ }
  }, [authenticated, getAccessToken])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen(o => !o)
    if (!open && unread > 0) {
      setLoading(true)
      try {
        const token = await getAccessToken()
        await fetch('/api/notifications', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch { /* silent */ }
      setLoading(false)
    }
  }

  if (!authenticated) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <span className="text-xs text-muted-foreground">{unread} unread</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id}>
                  {n.market_id ? (
                    <Link
                      href={`/markets/${n.market_id}`}
                      onClick={() => setOpen(false)}
                      className={`flex gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0 ${!n.read ? 'bg-muted/50' : ''}`}
                    >
                      <NotificationContent n={n} />
                    </Link>
                  ) : (
                    <div className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${!n.read ? 'bg-muted/50' : ''}`}>
                      <NotificationContent n={n} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationContent({ n }: { n: Notification }) {
  return (
    <>
      <div className="shrink-0 w-2 mt-1.5">
        {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{n.title}</p>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
      </div>
    </>
  )
}
