import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'PREDICT <noreply@predict.app>'

function isConfigured() {
  const key = process.env.RESEND_API_KEY
  return key && key !== 'your_resend_api_key' && key.startsWith('re_')
}

export async function sendMarketResolvedEmail({
  to,
  name,
  marketTitle,
  side,
  outcome,
  payout,
}: {
  to: string
  name: string
  marketTitle: string
  side: 'yes' | 'no'
  outcome: 'yes' | 'no'
  payout: number
}) {
  if (!isConfigured() || !to) return

  const won = side === outcome
  const subject = won
    ? `You won $${payout.toFixed(2)} on PREDICT!`
    : `Market resolved — better luck next time`

  const html = won
    ? `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
        <div style="width:28px;height:28px;background:#111;border-radius:6px;display:flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-size:14px;font-weight:700">P</span>
        </div>
        <span style="font-size:16px;font-weight:700;letter-spacing:0.1em">PREDICT</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 8px">You won! 🎉</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Hi ${name}, your prediction was correct.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="font-size:13px;color:#16a34a;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Payout</p>
        <p style="font-size:32px;font-weight:700;color:#15803d;margin:0">+$${payout.toFixed(2)}</p>
      </div>
      <p style="color:#374151;font-size:14px;margin:0 0 4px;font-weight:600">${marketTitle}</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 24px">You bet <strong>${side.toUpperCase()}</strong> — outcome was <strong>${outcome.toUpperCase()}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/portfolio" style="display:inline-block;background:#111;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">View Portfolio</a>
      <p style="color:#d1d5db;font-size:12px;margin:32px 0 0">© PREDICT · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#d1d5db">predict.app</a></p>
    </div>`
    : `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
        <div style="width:28px;height:28px;background:#111;border-radius:6px;display:flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-size:14px;font-weight:700">P</span>
        </div>
        <span style="font-size:16px;font-weight:700;letter-spacing:0.1em">PREDICT</span>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 8px">Market resolved</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Hi ${name}, this market has been settled.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 4px;font-weight:600">${marketTitle}</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 24px">You bet <strong>${side.toUpperCase()}</strong> — outcome was <strong>${outcome.toUpperCase()}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background:#111;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Browse Markets</a>
      <p style="color:#d1d5db;font-size:12px;margin:32px 0 0">© PREDICT · <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#d1d5db">predict.app</a></p>
    </div>`

  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch {
    // never crash the main flow over email
  }
}

export async function sendDepositConfirmedEmail({
  to,
  name,
  amount,
}: {
  to: string
  name: string
  amount: number
}) {
  if (!isConfigured() || !to) return

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `$${amount.toFixed(2)} USDC deposited to PREDICT`,
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
          <div style="width:28px;height:28px;background:#111;border-radius:6px;display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-size:14px;font-weight:700">P</span>
          </div>
          <span style="font-size:16px;font-weight:700;letter-spacing:0.1em">PREDICT</span>
        </div>
        <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 8px">Deposit confirmed ✓</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Hi ${name}, your funds are ready to use.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="font-size:13px;color:#6b7280;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Credited</p>
          <p style="font-size:32px;font-weight:700;color:#111;margin:0">$${amount.toFixed(2)} <span style="font-size:16px;color:#9ca3af">USDC</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display:inline-block;background:#111;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Start betting</a>
        <p style="color:#d1d5db;font-size:12px;margin:32px 0 0">© PREDICT</p>
      </div>`,
    })
  } catch {
    // silent
  }
}
