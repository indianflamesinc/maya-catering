'use client'
// FIX-070 (Jun 16 2026): Full customer name in greeting — was split(' ')[0] showing first word only
// FIX-071 (Jun 16 2026): Total column uses total_price_cents from snapshot (correct) not unit×tray_qty (wrong for per_piece/per_person on Round 2+)
// src/app/review/[token]/page.tsx
// FIX-051 (Jun 16 2026): Button label consistency
//   BEFORE: instruction said 'Submit Feedback', button said 'Submit My Feedback'
//   AFTER:  both say 'Submit My Feedback'
// FIX-029: notes_to_customer now shown on review page
// FIX-030: qty is read-only — customer adds comments only
// FIX-031: graceful states for submitted/accepted/expired
// FIX-032: full conversation thread per dish
// FIX-061 (Jun 16 2026): getQtyLabel reads correct field per pricing_type
//   BEFORE: always used tray_quantity → "1 pcs" for all per_person/per_piece items on Round 2+
//   AFTER:  per_person→guest_count, per_piece/per_gallon/per_portion→piece_count, tray→tray_quantity
// FIX-062 (Jun 16 2026): Maya reply shown as plain text not green pill badge
//   BEFORE: background:'#f0fff0', borderRadius:4 → pill/badge style
//   AFTER:  plain green text, consistent with other thread entries
// FIX-064 (Jun 16 2026): Removed duplicate admin_reply render
//   BEFORE: admin_reply rendered separately + also in thread[] → same reply showed twice
//   AFTER:  only thread[] renders history; admin_reply field removed from render

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

function getTrayLabel(item: any): string {
  if (item.pricing_type === 'per_piece')   return 'Per Piece'
  if (item.pricing_type === 'per_person')  return 'Per Person'
  if (item.pricing_type === 'per_gallon')  return 'Per Gallon'
  if (item.pricing_type === 'per_portion') return 'Per Portion'
  const map: Record<string, string> = {
    half: 'Small (½ tray)', medium: 'Medium (¾ tray)',
    full: 'Full Tray', custom: `${item.tray_quantity ?? 1}× Tray`,
  }
  return map[item.tray_size] ?? item.tray_size ?? 'Tray'
}

// FIX-061 (Jun 16 2026): read correct qty field per pricing_type
// BEFORE: always used item.tray_quantity — which is 1 for per_person/per_piece items in snapshot
//         Round 2+ review page showed "1 pcs" for Naan (100 pcs), "1 ppl" for Pani Puri (60 ppl) etc.
// AFTER:  per_person → guest_count, per_piece/per_gallon/per_portion → piece_count, tray → tray_quantity
// MATCHES: getCorrectQty() logic in review/[token]/route.ts
function getQtyLabel(item: any): string {
  if (item.pricing_type === 'per_person')  return `${item.guest_count ?? item.tray_quantity ?? 1} ppl`
  if (item.pricing_type === 'per_piece')   return `${item.piece_count ?? item.tray_quantity ?? 1} pcs`
  if (item.pricing_type === 'per_gallon')  return `${item.piece_count ?? item.tray_quantity ?? 1} gal`
  if (item.pricing_type === 'per_portion') return `${item.piece_count ?? item.tray_quantity ?? 1} portions`
  if (item.tray_size === 'custom') return `${item.tray_quantity ?? 1}×`
  return '1'
}

export default function QuoteReviewPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [overallComments, setOverallComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData({ error: 'Failed to load' }); setLoading(false) })
  }, [token])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const changes = (data.snapshot?.tray_items || []).map((item: any) => ({
        ...item,
        tray_quantity: item.tray_quantity,
        customer_comments: comments[item.id] || '',
      })).filter((item: any) => item.customer_comments) // only send items with comments

      const res = await fetch(`/api/review/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, overall_comments: overallComments }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSubmitted(true)
    } catch (err: any) {
      alert('Error submitting: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmHappy() {
    setConfirming(true)
    try {
      const res = await fetch('/api/quotes/confirm-happy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      router.push(`/review/${token}/deposit`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setConfirming(false)
    }
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: 'Georgia, serif', color: '#888' }}>Loading your quote…</p>
      </div>
    </div>
  )

  // ── Error ──
  if (data?.error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: '#fff' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#05091A', marginBottom: 8 }}>Link Unavailable</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>{data.error}</p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
          Please contact Maya Indian Catering.<br />
          📧 indianflamesinc@gmail.com
        </p>
      </div>
    </div>
  )

  // ── FIX-031: Expired — new round sent ──
  if (data?.status === 'expired') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: '#fff', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 24, color: '#05091A', marginBottom: 8 }}>An Updated Quote Has Been Sent</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>This link is no longer active. Please check your email for the latest quote link from Maya Indian Catering.</p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>📧 indianflamesinc@gmail.com</p>
      </div>
    </div>
  )

  // ── FIX-031: Submitted/Pending Maya — review received ──
  if (data?.status === 'pending_maya' || data?.status === 'submitted') return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>MAYA INDIAN CATERING</div>
      </div>
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✉️</div>
        <h2 style={{ fontSize: 26, color: '#05091A', fontWeight: 'normal', marginBottom: 12 }}>
          Your Feedback Has Been Received!
        </h2>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>
          Thank you, {data.enquiry?.customer_name}! We've received your Round {data.round_number} feedback.<br />
          Our team will review and get back to you within <strong>24 hours</strong>.
        </p>
        <div style={{ background: '#f6edd8', borderRadius: 8, padding: '20px 24px', textAlign: 'left', marginBottom: 24, fontSize: 13, color: '#666', lineHeight: 1.8 }}>
          <div><strong>Event:</strong> {(data.enquiry?.event_type || '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</div>
          <div><strong>Date:</strong> {data.enquiry?.event_date ? new Date(data.enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}</div>
          <div><strong>Total:</strong> {fmt(data.snapshot?.total_cents || 0)}</div>
        </div>
        <p style={{ color: '#888', fontSize: 13 }}>
          Questions? Email <a href="mailto:indianflamesinc@gmail.com" style={{ color: '#C9A84C' }}>indianflamesinc@gmail.com</a>
        </p>
      </div>
    </div>
  )

  // ── FIX-031: Accepted — permanent order confirmation ──
  if (data?.status === 'accepted') {
    const snap = data.snapshot
    return (
      <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>
        <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>MAYA INDIAN CATERING</div>
          <div style={{ color: '#F6EDD8', fontSize: 11, marginTop: 4 }}>33 Tuttle St, Wakefield MA · mayacater.com</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 24px', textAlign: 'center', borderBottom: '1px solid #a5d6a7' }}>
          <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: 14 }}>✅ Your Order is Confirmed — You can bookmark this page</span>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 16px' }}>
          <h2 style={{ fontSize: 26, color: '#05091A', fontWeight: 'normal', marginBottom: 4 }}>
            🎉 Booking Confirmed, {data.enquiry?.customer_name}!
          </h2>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>
            {data.enquiry?.event_date ? new Date(data.enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''} ·{' '}
            {data.enquiry?.guest_count} guests · {data.enquiry?.venue_name || 'TBD'}
          </p>

          {/* Confirmed menu */}
          <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ background: '#05091A', padding: '12px 20px', color: '#C9A84C', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', textTransform: 'uppercase' }}>
              Your Confirmed Menu
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 110px 110px', gap: 8, padding: '10px 20px', background: '#f6edd8', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
              <div>Dish</div><div>Type</div><div style={{ textAlign: 'center' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Unit</div><div style={{ textAlign: 'right' }}>Total</div>
            </div>
            {(snap?.tray_items || []).map((item: any, i: number) => (
              <div key={item.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 110px 110px', gap: 8, padding: '12px 20px', borderTop: '1px solid #f0e8d8', background: i % 2 === 0 ? '#fff' : '#fdfaf6', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: 14 }}>{item.dish_name}</div>
                  {item.notes_to_customer && <div style={{ color: '#999', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{item.notes_to_customer}</div>}
                </div>
                <div style={{ color: '#555', fontSize: 12 }}>{getTrayLabel(item)}</div>
                <div style={{ textAlign: 'center', color: '#444', fontSize: 13 }}>{getQtyLabel(item)}</div>
                <div style={{ textAlign: 'right', color: '#555', fontSize: 13 }}>{fmt(item.unit_price_cents)}</div>
                <div style={{ textAlign: 'right', color: '#C9A84C', fontWeight: 'bold', fontSize: 14 }}>{fmt(item.total_price_cents > 0 ? item.total_price_cents : item.unit_price_cents * (item.guest_count ?? item.piece_count ?? item.tray_quantity ?? 1))}</div>
              </div>
            ))}
          </div>

          {/* Pricing summary */}
          <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>Pricing Summary</div>
            {[
              { label: 'Subtotal', value: snap?.subtotal_cents },
              snap?.delivery_fee_cents > 0 ? { label: 'Delivery Fee', value: snap.delivery_fee_cents } : null,
              snap?.setup_fee_cents > 0    ? { label: 'Setup Fee',    value: snap.setup_fee_cents }    : null,
              snap?.service_fee_cents > 0  ? { label: 'Service Fee',  value: snap.service_fee_cents }  : null,
              snap?.discount_cents > 0     ? { label: 'Discount',     value: -snap.discount_cents }    : null,
              { label: 'Tax (7% MA)', value: snap?.tax_cents },
            ].filter(Boolean).map((row: any) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#555', borderBottom: '1px solid #f0e8d8' }}>
                <span>{row.label}</span>
                <span style={{ color: row.value < 0 ? '#c00' : undefined }}>{fmt(row.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', fontSize: 20, fontWeight: 'bold', color: '#05091A' }}>
              <span>Grand Total</span>
              <span style={{ color: '#C9A84C' }}>{fmt(snap?.total_cents || 0)}</span>
            </div>
            <div style={{ display: 'flex', gap: 32, marginTop: 8, fontSize: 12, color: '#888' }}>
              <span>Deposit Paid: <strong style={{ color: '#2e7d32' }}>{fmt(snap?.deposit_cents || 0)}</strong></span>
              <span>Balance (3 days before): <strong style={{ color: '#444' }}>{fmt(snap?.balance_cents || 0)}</strong></span>
            </div>
          </div>

          <div style={{ background: '#f6edd8', borderRadius: 8, padding: '16px 20px', fontSize: 13, color: '#666', lineHeight: 1.8, textAlign: 'center' }}>
            📧 indianflamesinc@gmail.com · 🌐 mayacater.com · 📍 33 Tuttle St, Wakefield MA
          </div>
        </div>
      </div>
    )
  }

  // ── Local submitted state ──
  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: '#fff', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✉️</div>
        <h2 style={{ fontSize: 28, color: '#05091A', marginBottom: 12, fontWeight: 'normal' }}>Feedback Submitted!</h2>
        <p style={{ color: '#444', lineHeight: 1.8, fontSize: 15 }}>
          Thank you! We've received your comments and will get back to you within <strong>24 hours</strong>.
        </p>
        <div style={{ background: '#f6edd8', borderRadius: 8, padding: '16px 20px', marginTop: 24, fontSize: 13, color: '#666' }}>
          <p style={{ margin: '4px 0' }}>📧 indianflamesinc@gmail.com</p>
          <p style={{ margin: '4px 0' }}>🌐 mayacater.com</p>
        </div>
      </div>
    </div>
  )

  // ── Main review form ──
  const { enquiry, snapshot, round_number, admin_overall_reply } = data
  const eventDate = enquiry?.event_date
    ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const depositAmt = fmt(snapshot?.deposit_cents || 0)
  const hasComments = Object.values(comments).some(c => c.trim()) || overallComments.trim()

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>MAYA INDIAN CATERING</div>
        <div style={{ color: '#F6EDD8', fontSize: 11, marginTop: 4, letterSpacing: 1 }}>33 Tuttle St, Wakefield MA · mayacater.com</div>
      </div>

      {round_number > 1 && (
        <div style={{ background: '#C9A84C', color: '#05091A', textAlign: 'center', padding: '8px', fontSize: 13, fontWeight: 'bold' }}>
          📋 Updated Quote — Round {round_number}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, color: '#05091A', margin: '0 0 8px', fontWeight: 'normal' }}>
            Hello, {enquiry?.customer_name}! 👋
          </h1>
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            {round_number === 1
              ? 'Your catering quote is ready for review. Add comments about any items — to update, add, remove or ask any questions.'
              : `We've updated your quote based on your feedback. Please review Round ${round_number} below.`}
          </p>
        </div>

        {/* Admin overall reply banner (Round 2+) */}
        {admin_overall_reply && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#2e7d32', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>
              📝 Message from Maya Team
            </div>
            <p style={{ color: '#1a5c1a', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{admin_overall_reply}</p>
          </div>
        )}

        {/* Event details */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 }}>Event Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 14 }}>
            {[
              ['Event Type', (enquiry?.event_type || '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')],
              ['Date', eventDate],
              ['Guests', enquiry?.guest_count],
              ['Venue', enquiry?.venue_name || 'TBD'],
            ].map(([l, v]) => (
              <div key={l as string}>
                <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                <div style={{ color: '#1a1a1a', fontWeight: 'bold' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: '#fffbea', border: '1px solid #f0d060', borderRadius: 8, padding: '14px 18px', marginBottom: 24, fontSize: 14, color: '#555', lineHeight: 1.7 }}>
          <strong>How to review:</strong> Check each dish below. Add <strong>comments or questions</strong> for any item.
          When you're happy with everything, click <strong>"Confirm & Arrange Deposit"</strong>.
          If you have comments or questions, add them below and click <strong>"Submit My Feedback"</strong>.
        </div>

        {/* Dish items */}
        {(snapshot?.tray_items || []).length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ background: '#05091A', padding: '12px 20px', fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Your Menu Items
            </div>

            {snapshot.tray_items.map((item: any, i: number) => (
              <div key={item.id} style={{ borderTop: i > 0 ? '1px solid #f0e8d8' : undefined, background: i % 2 === 0 ? '#fff' : '#fdfaf6' }}>
                {/* Main dish row */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 110px 110px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: 15 }}>{item.dish_name}</div>
                    </div>
                    {/* FIX-030: static display only — no input */}
                    <div style={{ color: '#555', fontSize: 13 }}>{getTrayLabel(item)}</div>
                    <div style={{ textAlign: 'center', color: '#444', fontSize: 14, fontWeight: 'bold' }}>{getQtyLabel(item)}</div>
                    <div style={{ textAlign: 'right', color: '#555', fontSize: 13 }}>{fmt(item.unit_price_cents)}</div>
                    <div style={{ textAlign: 'right', color: '#C9A84C', fontWeight: 'bold', fontSize: 15 }}>
                      {fmt(item.total_price_cents > 0 ? item.total_price_cents : item.unit_price_cents * (item.guest_count ?? item.piece_count ?? item.tray_quantity ?? 1))}
                    </div>
                  </div>

                  {/* FIX-032: conversation thread per dish */}
                  {(item.notes_to_customer || (item.thread && item.thread.length > 0) || item.admin_reply) && (
                    <div style={{ marginTop: 8, marginBottom: 8, paddingLeft: 12, borderLeft: '3px solid #e8dfc8' }}>

                      {/* Maya's original note */}
                      {item.notes_to_customer && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                          <span style={{ color: '#C9A84C', fontWeight: 'bold', flexShrink: 0, minWidth: 80 }}>📝 Maya Note:</span>
                          <span style={{ color: '#888', fontStyle: 'italic' }}>{item.notes_to_customer}</span>
                        </div>
                      )}

                      {/* Previous round thread */}
                      {(item.thread || []).map((t: any, ti: number) => (
                        <div key={ti}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
                            <span style={{ color: '#b8860b', fontWeight: 'bold', flexShrink: 0, minWidth: 80 }}>💬 You (R{t.round}):</span>
                            <span style={{ color: '#666' }}>{t.customer_comment}</span>
                          </div>
                          {/* FIX-062 (Jun 16 2026): plain text not pill badge
                               BEFORE: background: '#f0fff0', borderRadius: 4 → showed as green pill
                               AFTER:  plain text, same style as customer comment line */}
                          {t.admin_reply && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, paddingLeft: 16 }}>
                              <span style={{ color: '#2e7d32', fontWeight: 'bold', flexShrink: 0, minWidth: 64 }}>↳ Maya (R{t.round}):</span>
                              <span style={{ color: '#2e7d32' }}>{t.admin_reply}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* FIX-064 (Jun 16 2026): removed separate admin_reply render
                           BEFORE: admin_reply rendered separately PLUS also in thread[] → showed twice
                           AFTER:  thread[] contains ALL rounds (FIX-054), admin_reply field is redundant
                           thread[] already shows "↳ Maya (RN): reply" for every round */}
                    </div>
                  )}

                  {/* FIX-030: comment input only — no qty edit */}
                  <input
                    type="text"
                    placeholder="Any comments or questions for this dish…"
                    value={comments[item.id] || ''}
                    onChange={e => setComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e0d4bc', borderRadius: 4, padding: '8px 12px', fontSize: 13, color: '#444', outline: 'none', background: '#fdfaf6', boxSizing: 'border-box', marginTop: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing summary */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>Pricing Summary</div>
          {[
            { label: 'Subtotal', value: snapshot?.subtotal_cents },
            snapshot?.delivery_fee_cents > 0 ? { label: 'Delivery Fee', value: snapshot.delivery_fee_cents } : null,
            snapshot?.setup_fee_cents > 0    ? { label: 'Setup Fee',    value: snapshot.setup_fee_cents }    : null,
            snapshot?.service_fee_cents > 0  ? { label: 'Service Fee',  value: snapshot.service_fee_cents }  : null,
            snapshot?.discount_cents > 0     ? { label: 'Discount',     value: -snapshot.discount_cents }    : null,
            { label: 'Tax (7% MA)', value: snapshot?.tax_cents },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#555', borderBottom: '1px solid #f0e8d8' }}>
              <span>{row.label}</span>
              <span style={{ color: row.value < 0 ? '#c00' : undefined }}>{fmt(row.value)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', fontSize: 20, fontWeight: 'bold', color: '#05091A' }}>
            <span>Grand Total</span>
            <span style={{ color: '#C9A84C' }}>{fmt(snapshot?.total_cents || 0)}</span>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 8, fontSize: 12, color: '#888' }}>
            <span>20% Deposit: <strong style={{ color: '#444' }}>{depositAmt}</strong></span>
            <span>Balance: <strong style={{ color: '#444' }}>{fmt(snapshot?.balance_cents || 0)}</strong></span>
          </div>
        </div>

        {/* Overall comments */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 28 }}>
          <label style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Overall Comments or Questions
          </label>
          <textarea rows={4}
            placeholder="Any overall comments, questions, or special requests for Maya…"
            value={overallComments}
            onChange={e => setOverallComments(e.target.value)}
            style={{ width: '100%', border: '1px solid #e0d4bc', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#444', resize: 'vertical', outline: 'none', fontFamily: 'Georgia, serif', background: '#fdfaf6', boxSizing: 'border-box' }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <button onClick={handleConfirmHappy} disabled={confirming || submitting}
            style={{ width: '100%', background: confirming ? '#888' : '#05091A', color: '#C9A84C', border: '2px solid #C9A84C', borderRadius: 6, padding: '18px 24px', fontSize: 16, fontWeight: 'bold', cursor: confirming ? 'not-allowed' : 'pointer', letterSpacing: 1, fontFamily: 'Georgia, serif' }}>
            {confirming ? 'Confirming…' : `🎉 Everything looks great — Confirm & Arrange Deposit (${depositAmt})`}
          </button>

          <button onClick={handleSubmit} disabled={submitting || confirming}
            style={{ width: '100%', background: submitting ? '#ddd' : '#C9A84C', color: '#05091A', border: 'none', borderRadius: 6, padding: '16px 24px', fontSize: 15, fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: 1, fontFamily: 'Georgia, serif' }}>
            {submitting ? 'Submitting…' : hasComments ? '✏️ Submit My Feedback' : '✏️ I Have Changes — Add Comments Above First'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          Once submitted, Maya will review your feedback and get back to you within 24 hours.<br />
          Questions? Email <a href="mailto:indianflamesinc@gmail.com" style={{ color: '#C9A84C' }}>indianflamesinc@gmail.com</a>
        </p>
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid #e8dfc8', color: '#bbb', fontSize: 11 }}>
          Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880 · mayacater.com
        </div>
      </div>
    </div>
  )
}
