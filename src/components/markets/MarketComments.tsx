'use client'

import { useState, useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'

interface Comment {
  id: string
  content: string
  created_at: string
  user: { id: string; name: string | null; email: string | null }
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function displayName(user: { name: string | null; email: string | null }) {
  if (user.name?.trim()) return user.name.split(' ')[0]
  if (user.email) {
    const local = user.email.split('@')[0]
    return local.length > 10 ? local.slice(0, 8) + '…' : local
  }
  return 'Anon'
}

function initials(user: { name: string | null; email: string | null }) {
  if (user.name?.trim()) return user.name[0].toUpperCase()
  if (user.email) return user.email[0].toUpperCase()
  return '?'
}

interface Props {
  marketId: string
}

export default function MarketComments({ marketId }: Props) {
  const { authenticated, getAccessToken, login } = usePrivy()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/markets/${marketId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .finally(() => setLoading(false))
  }, [marketId])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!authenticated) { login(); return }
    if (!content.trim()) return

    setPosting(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setComments(prev => [data.comment, ...prev])
      setContent('')
      textareaRef.current?.blur()
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Discussion
        {comments.length > 0 && (
          <span className="ml-2 text-xs text-muted-foreground font-normal">{comments.length}</span>
        )}
      </h2>

      {/* Post form */}
      <form onSubmit={handlePost} className="mb-5">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={authenticated ? 'Share your analysis...' : 'Sign in to comment'}
          disabled={!authenticated || posting}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
          <button
            type="submit"
            disabled={posting || (!authenticated ? false : !content.trim())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {!authenticated ? 'Sign in' : posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <a href={`/profile/${c.user.id}`} className="shrink-0">
                <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-foreground hover:ring-2 hover:ring-foreground transition-all">
                  {initials(c.user)}
                </div>
              </a>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <a href={`/profile/${c.user.id}`} className="text-xs font-semibold text-foreground hover:underline">
                    {displayName(c.user)}
                  </a>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
