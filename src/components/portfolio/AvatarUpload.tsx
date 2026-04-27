'use client'

import { useRef, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Camera, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Props {
  currentUrl: string | null
  initials: string
  onUploaded?: (url: string) => void
}

export default function AvatarUpload({ currentUrl, initials, onUploaded }: Props) {
  const { getAccessToken } = usePrivy()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG or WebP allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large (max 2 MB)')
      return
    }

    setError(null)
    // Local preview
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setLoading(true)
    try {
      const token = await getAccessToken()
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
        setPreview(currentUrl)
      } else {
        setPreview(data.url)
        onUploaded?.(data.url)
      }
    } catch {
      setError('Upload failed')
      setPreview(currentUrl)
    }
    setLoading(false)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative group w-20 h-20 rounded-full overflow-hidden ring-2 ring-border hover:ring-foreground transition-all focus:outline-none"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-foreground flex items-center justify-center text-2xl font-bold text-background">
            {initials}
          </div>
        )}

        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {loading
            ? <Loader2 className="h-5 w-5 text-white animate-spin" />
            : <Camera className="h-5 w-5 text-white" />
          }
        </div>
      </button>

      {error && <p className="text-xs text-red-500 text-center max-w-[120px]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
