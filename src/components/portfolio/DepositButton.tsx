'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'
import { Plus, X, Copy, Check, Loader2, RefreshCw } from 'lucide-react'

export default function DepositButton() {
  const { getAccessToken } = usePrivy()
  const [open, setOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(false)

  async function openModal() {
    setOpen(true)
    if (walletAddress) return
    setLoadingWallet(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setWalletAddress(data.wallet_address || null)
    } catch {
      toast.error('Failed to load wallet')
    } finally {
      setLoadingWallet(false)
    }
  }

  async function copyAddress() {
    if (!walletAddress) return
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function verifyDeposit() {
    setVerifying(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/deposit/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      if (data.credited < 0.01) {
        toast.info('No new USDC detected yet. Wait a few minutes and try again.')
      } else {
        toast.success(`$${data.credited.toFixed(2)} USDC credited to your balance!`)
        setOpen(false)
        window.location.reload()
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Funds
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold">Add Funds</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Deposit USDC on Polygon</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingWallet ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : walletAddress ? (
              <>
                {/* Steps */}
                <ol className="text-xs text-muted-foreground space-y-2 mb-5">
                  <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Copy your Polygon wallet address below</li>
                  <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> Send <strong className="text-foreground">USDC</strong> on <strong className="text-foreground">Polygon</strong> network from Coinbase, Binance or any wallet</li>
                  <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Click <strong className="text-foreground">Verify Deposit</strong> after sending</li>
                </ol>

                {/* Wallet address */}
                <div className="rounded-xl bg-muted border border-border p-3 mb-4">
                  <p className="text-xs text-muted-foreground mb-1.5">Your Polygon wallet</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono font-medium truncate">{shortAddress}</span>
                    <button
                      onClick={copyAddress}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 break-all font-mono opacity-60">{walletAddress}</p>
                </div>

                {/* Warning */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-5">
                  <p className="text-xs text-amber-700">
                    Only send <strong>USDC</strong> on <strong>Polygon</strong> network. Other tokens or networks will be lost.
                  </p>
                </div>

                <button
                  onClick={verifyDeposit}
                  disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {verifying ? 'Checking on-chain...' : 'Verify Deposit'}
                </button>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  Polygon transactions typically confirm in under 30 seconds.
                </p>
              </>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No wallet found. Try signing out and back in.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
