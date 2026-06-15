'use client'
// src/app/review/[token]/deposit/page.tsx
// FIX-014 (Jun 15 2026): Deposit choice page — Stripe / Zelle / Check
// Customer lands here after clicking "Confirm & Arrange Deposit"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

export default function DepositPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<'stripe' | 'zelle' | 'check' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [doneMethod, setDoneMethod] = useState('')

  useEffect(() => {
    // Load token data to get deposit amount and customer name
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  async function handleConfirm() {
    if (!selected) return
    setSubmitting(true)
    try {
      if (selected === 'stripe') {
        // Redirect to Stripe checkout
        const res = await fetch('/api/quotes/deposit-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, method: 'stripe' }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        if (result.checkout_url) window.location.href = result.checkout_url
      } else {
        // Zelle or Check — notify admin, show instructions
        const res = await fetch('/api/quotes/deposit-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, method: selected }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        setDoneMethod(selected)
        setDone(true)
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <p style={{ fontFamily: 'Georgia, serif', color: '#888' }}>Loading…</p>
    </div>
  )

  const snapshot = data?.snapshot
  const enquiry = data?.enquiry
  const depositCents = snapshot?.deposit_cents || 0
  const totalCents = snapshot?.total_cents || 0
  const balanceCents = snapshot?.balance_cents || 0
  const customerName = enquiry?.customer_name || 'Customer'
  const firstName = customerName.split(' ')[0]
  const eventDate = enquiry?.event_date
    ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const zelleRef = `${firstName} ${eventDate}`

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>MAYA INDIAN CATERING</div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: 28, color: '#05091A', marginBottom: 12, fontWeight: 'normal' }}>
          Quote Confirmed!
        </h2>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
          Thank you, {firstName}! Your catering booking is confirmed.<br />
          Please send your deposit to complete the reservation.
        </p>

        {doneMethod === 'zelle' && (
          <div style={{ background: '#fff', border: '2px solid #C9A84C', borderRadius: 12, padding: '28px 32px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>📱 Zelle Payment Instructions</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 2 }}>
              <div><strong>Send to:</strong> indianflamesinc@gmail.com</div>
              <div><strong>Amount:</strong> <span style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 18 }}>{fmt(depositCents)}</span></div>
              <div><strong>Reference/Note:</strong> {zelleRef}</div>
            </div>
            <div style={{ marginTop: 16, background: '#f6edd8', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#666' }}>
              💡 Please use the exact reference above so we can match your payment quickly.
            </div>
          </div>
        )}

        {doneMethod === 'check' && (
          <div style={{ background: '#fff', border: '2px solid #C9A84C', borderRadius: 12, padding: '28px 32px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>📬 Check Payment Instructions</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 2 }}>
              <div><strong>Payable to:</strong> Indian Flames Inc</div>
              <div><strong>Amount:</strong> <span style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 18 }}>{fmt(depositCents)}</span></div>
              <div><strong>Mail to:</strong> 33 Tuttle St, Wakefield MA 01880</div>
              <div><strong>Memo:</strong> {zelleRef}</div>
            </div>
            <div style={{ marginTop: 16, background: '#f6edd8', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#666' }}>
              💡 We will confirm your booking once the check is received.
            </div>
          </div>
        )}

        <div style={{ background: '#f6edd8', borderRadius: 8, padding: '16px 20px', fontSize: 13, color: '#666', lineHeight: 1.8 }}>
          <div><strong>Total:</strong> {fmt(totalCents)}</div>
          <div><strong>Deposit due now:</strong> {fmt(depositCents)}</div>
          <div><strong>Balance due 3 days before event:</strong> {fmt(balanceCents)}</div>
        </div>

        <p style={{ color: '#888', fontSize: 13, marginTop: 24 }}>
          Questions? Email <a href="mailto:indianflamesinc@gmail.com" style={{ color: '#C9A84C' }}>indianflamesinc@gmail.com</a>
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>MAYA INDIAN CATERING</div>
        <div style={{ color: '#F6EDD8', fontSize: 11, marginTop: 4 }}>33 Tuttle St, Wakefield MA · mayacater.com</div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, color: '#05091A', margin: '0 0 8px', fontWeight: 'normal' }}>
            🎉 Quote Confirmed, {firstName}!
          </h1>
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7 }}>
            Please arrange your <strong style={{ color: '#C9A84C' }}>{fmt(depositCents)} deposit</strong> to secure your booking.
          </p>
        </div>

        {/* Booking summary */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '16px 20px', marginBottom: 28, fontSize: 13, color: '#666', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Grand Total</span><strong style={{ color: '#C9A84C' }}>{fmt(totalCents)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>20% Deposit Due Now</span><strong style={{ color: '#05091A' }}>{fmt(depositCents)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Balance (3 days before event)</span><span>{fmt(balanceCents)}</span></div>
        </div>

        {/* Payment options */}
        <div style={{ fontSize: 10, letterSpacing: 2, color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>
          How would you like to pay?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>

          {/* Stripe */}
          <div onClick={() => setSelected('stripe')}
            style={{ border: `2px solid ${selected === 'stripe' ? '#C9A84C' : '#e8dfc8'}`, borderRadius: 10, padding: '18px 20px', cursor: 'pointer', background: selected === 'stripe' ? '#fffbf0' : '#fff', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected === 'stripe' ? '#C9A84C' : '#ccc'}`, background: selected === 'stripe' ? '#C9A84C' : '#fff', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 15, color: '#05091A' }}>💳 Pay Online Now</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Secure card payment via Stripe — instant confirmation</div>
              </div>
              <div style={{ marginLeft: 'auto', background: '#635BFF', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 'bold' }}>STRIPE</div>
            </div>
          </div>

          {/* Zelle */}
          <div onClick={() => setSelected('zelle')}
            style={{ border: `2px solid ${selected === 'zelle' ? '#C9A84C' : '#e8dfc8'}`, borderRadius: 10, padding: '18px 20px', cursor: 'pointer', background: selected === 'zelle' ? '#fffbf0' : '#fff', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected === 'zelle' ? '#C9A84C' : '#ccc'}`, background: selected === 'zelle' ? '#C9A84C' : '#fff', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 15, color: '#05091A' }}>📱 Pay via Zelle</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Send {fmt(depositCents)} to indianflamesinc@gmail.com</div>
              </div>
              <div style={{ marginLeft: 'auto', background: '#6B2D8B', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 'bold' }}>ZELLE</div>
            </div>
          </div>

          {/* Check */}
          <div onClick={() => setSelected('check')}
            style={{ border: `2px solid ${selected === 'check' ? '#C9A84C' : '#e8dfc8'}`, borderRadius: 10, padding: '18px 20px', cursor: 'pointer', background: selected === 'check' ? '#fffbf0' : '#fff', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected === 'check' ? '#C9A84C' : '#ccc'}`, background: selected === 'check' ? '#C9A84C' : '#fff', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 15, color: '#05091A' }}>📬 Pay by Check</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>Mail check payable to Indian Flames Inc · 33 Tuttle St, Wakefield MA</div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleConfirm} disabled={!selected || submitting}
          style={{ width: '100%', background: !selected || submitting ? '#ccc' : '#C9A84C', color: '#05091A', border: 'none', borderRadius: 8, padding: '18px 24px', fontSize: 16, fontWeight: 'bold', cursor: !selected || submitting ? 'not-allowed' : 'pointer', letterSpacing: 1, fontFamily: 'Georgia, serif' }}>
          {submitting ? 'Processing…' : selected ? `Continue with ${selected === 'stripe' ? 'Online Payment' : selected === 'zelle' ? 'Zelle' : 'Check'}` : 'Select a payment method above'}
        </button>

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 20 }}>
          Your booking is confirmed either way — payment method just determines next steps.
        </p>
      </div>
    </div>
  )
}
