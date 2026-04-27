'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialName: string
  onSaved?: (name: string) => void
}

export default function EditableName({ initialName, onSaved }: Props) {
  const { getAccessToken } = usePrivy()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(initialName) }, [initialName])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    const trimmed = value.trim()
    if (trimmed === initialName) { setEditing(false); return }
    if (trimmed.length < 2 || trimmed.length > 40) {
      toast.error('Name must be 2–40 characters')
      return
    }
    setSaving(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to save'); return }
      toast.success('Name updated!')
      setEditing(false)
      onSaved?.(trimmed)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setValue(initialName)
    setEditing(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKey}
          maxLength={40}
          className="text-2xl font-bold bg-transparent border-b-2 border-foreground outline-none w-48 text-foreground"
        />
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button onClick={save} className="text-green-600 hover:text-green-700 transition-colors">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-2xl font-bold text-foreground">{value || 'User'}</h1>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
