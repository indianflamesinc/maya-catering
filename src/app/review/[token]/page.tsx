'use client'
// src/app/review/[token]/page.tsx
// Customer-facing quote review page
// White + gold Maya brand, mobile-friendly

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

export default function QuoteReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changes, setChanges] = useState<any[]>([])
  const [overallComments, setOverallComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/review/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        // Init changes from snapshot
        const snapshot = d.snapshot
        if (snapshot?.tray_items) {
          setChanges(snapshot.tray_items.map((item: any) => ({ ...item })))
        }
        setLoading(false)
      })
      .catch(() => { setError('Failed to load quote.'); setLoading(false) })
  }, [token])

  function updateChange(id: string, field: string, value: any) {
    setChanges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
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

  // ── Loading ────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p style={{ fontFamily: 'Georgia, serif', color: '#888' }}>Loading your quote…</p>
      </div>
    </div>
  )

  // ── Error ──────────────────────────────────────────────

  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#05091A', marginBottom: 8 }}>
          Link Unavailable
        </h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>{error}</p>
        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
          Please contact Maya Indian Catering for a new link.<br />
          📧 indianflamesinc@gmail.com
        </p>
      </div>
    </div>
  )

  // ── Submitted ──────────────────────────────────────────

  if (submitted) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#05091A', marginBottom: 12 }}>
          Thank You!
        </h2>
        <p style={{ color: '#444', lineHeight: 1.8, fontSize: 15 }}>
          Your review has been submitted to Maya Indian Catering.<br />
          We'll get back to you within <strong>24 hours</strong>.
        </p>
        <div style={{ background: '#f6edd8', borderRadius: 8, padding: '16px 20px', marginTop: 24, fontSize: 13, color: '#666' }}>
          <p style={{ margin: '4px 0' }}>📧 indianflamesinc@gmail.com</p>
          <p style={{ margin: '4px 0' }}>🌐 mayacater.com</p>
          <p style={{ margin: '4px 0' }}>📍 33 Tuttle St, Wakefield MA</p>
        </div>
      </div>
    </div>
  )

  const { enquiry, snapshot, round_number } = data
  const isTray = snapshot?.catering_type === 'tray' || snapshot?.catering_type === 'hybrid'
  const isPerPerson = snapshot?.catering_type === 'per_person' || snapshot?.catering_type === 'hybrid'

  const eventDate = enquiry?.event_date
    ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : ''

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Georgia, serif' }}>

      {/* Top bar */}
      <div style={{ background: '#05091A', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: '#C9A84C', fontSize: 20, fontWeight: 'bold', letterSpacing: 3 }}>
          MAYA INDIAN CATERING
        </div>
        <div style={{ color: '#F6EDD8', fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
          33 Tuttle St, Wakefield MA · mayacater.com
        </div>
      </div>

      {/* Round badge */}
      {round_number > 1 && (
        <div style={{ background: '#C9A84C', color: '#05091A', textAlign: 'center', padding: '8px', fontSize: 13, fontWeight: 'bold' }}>
          📋 Updated Quote — Round {round_number}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, color: '#05091A', margin: '0 0 8px', fontWeight: 'normal' }}>
            Hello, {enquiry?.customer_name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {round_number === 1
              ? 'Your catering quote is ready for review. You can adjust quantities or add comments below. When you\'re happy, click Submit.'
              : `We've updated your quote based on your feedback. Please review Round ${round_number} below.`}
          </p>
        </div>

        {/* Event card */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 }}>
            Event Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
            <div>
              <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Event Type</div>
              <div style={{ color: '#1a1a1a', fontWeight: 'bold', marginTop: 2 }}>{enquiry?.event_type?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Date</div>
              <div style={{ color: '#1a1a1a', fontWeight: 'bold', marginTop: 2 }}>{eventDate}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Guests</div>
              <div style={{ color: '#1a1a1a', fontWeight: 'bold', marginTop: 2 }}>{enquiry?.guest_count}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Venue</div>
              <div style={{ color: '#1a1a1a', fontWeight: 'bold', marginTop: 2 }}>{enquiry?.venue_name || 'TBD'}</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: '#fffbea', border: '1px solid #f0d878', borderRadius: 8, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#7a6a00' }}>
          <strong>How to review:</strong> You can edit the <strong>Quantity</strong> and add <strong>Comments</strong> for each dish below.
          Prices will update automatically. When you're done, scroll down and click <strong>Submit Review</strong>.
        </div>

        {/* Tray items */}
        {isTray && changes.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ background: '#05091A', padding: '12px 20px', fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Your Menu Items
            </div>

            {/* Header row - desktop only */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 110px 110px', gap: 8, padding: '10px 20px', background: '#f6edd8', fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
              <div>Dish</div>
              <div>Tray Size</div>
              <div style={{ textAlign: 'center' }}>Qty</div>
              <div style={{ textAlign: 'right' }}>Unit Price</div>
              <div style={{ textAlign: 'right' }}>Total</div>
            </div>

            {changes.map((item, i) => (
              <div key={item.id} style={{ borderTop: '1px solid #f0e8d8', padding: '14px 20px', background: i % 2 === 0 ? '#fff' : '#fdfaf6' }}>
                {/* Main row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 80px 110px 110px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: 14 }}>{item.dish_name}</div>
                    <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>{item.category}</div>
                  </div>
                  <div style={{ color: '#555', fontSize: 13 }}>{item.tray_size}</div>
                  {/* Editable quantity */}
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.tray_quantity}
                      onChange={e => updateChange(item.id, 'tray_quantity', parseFloat(e.target.value) || 0)}
                      style={{
                        width: 60, textAlign: 'center', border: '2px solid #C9A84C',
                        borderRadius: 4, padding: '4px 6px', fontSize: 14, fontWeight: 'bold',
                        color: '#05091A', outline: 'none', background: '#fffdf5'
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', color: '#555', fontSize: 13 }}>{fmt(item.unit_price_cents)}</div>
                  <div style={{ textAlign: 'right', color: '#C9A84C', fontWeight: 'bold', fontSize: 14 }}>
                    {fmt(item.unit_price_cents * item.tray_quantity)}
                  </div>
                </div>
                {/* Comments */}
                <input
                  type="text"
                  placeholder="Any comments or special requests for this dish…"
                  value={item.customer_comments || ''}
                  onChange={e => updateChange(item.id, 'customer_comments', e.target.value)}
                  style={{
                    width: '100%', border: '1px solid #e0d4bc', borderRadius: 4,
                    padding: '7px 10px', fontSize: 12, color: '#444', outline: 'none',
                    background: '#fdfaf6', boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Per person sessions - read only view */}
        {isPerPerson && snapshot?.sessions?.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ background: '#05091A', padding: '12px 20px', fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Event Sessions
            </div>
            {snapshot.sessions.map((sess: any) => (
              <div key={sess.id} style={{ borderTop: '1px solid #f0e8d8', padding: '16px 20px' }}>
                <div style={{ fontWeight: 'bold', color: '#05091A', fontSize: 15, marginBottom: 8 }}>
                  {sess.session_name} — {sess.guest_count} guests
                </div>
                {sess.categories.map((cat: any) => (
                  <div key={cat.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      {cat.category_name} — {fmt(cat.price_per_person)}/person
                    </div>
                    {cat.dishes.map((d: any) => (
                      <div key={d.id} style={{ fontSize: 13, color: '#444', paddingLeft: 12, marginBottom: 2 }}>
                        • {d.dish_name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 16 }}>
            Pricing Summary
          </div>
          {[
            { label: 'Subtotal', value: snapshot?.subtotal_cents },
            snapshot?.discount_cents > 0 ? { label: 'Discount', value: -snapshot.discount_cents } : null,
            { label: 'Tax (7% MA)', value: snapshot?.tax_cents },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#555', borderBottom: '1px solid #f0e8d8' }}>
              <span>{row.label}</span>
              <span>{fmt(row.value)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 6px', fontSize: 20, fontWeight: 'bold', color: '#05091A' }}>
            <span>Grand Total</span>
            <span style={{ color: '#C9A84C' }}>{fmt(snapshot?.total_cents || 0)}</span>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 8, fontSize: 12, color: '#888' }}>
            <span>20% Deposit: <strong style={{ color: '#444' }}>{fmt(snapshot?.deposit_cents || 0)}</strong></span>
            <span>Balance: <strong style={{ color: '#444' }}>{fmt(snapshot?.balance_cents || 0)}</strong></span>
          </div>
        </div>

        {/* Overall comments */}
        <div style={{ background: '#fff', border: '1px solid #e8dfc8', borderRadius: 8, padding: '20px 24px', marginBottom: 28 }}>
          <label style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Overall Comments or Questions
          </label>
          <textarea
            rows={4}
            placeholder="Any overall comments, questions, or special requests for Maya…"
            value={overallComments}
            onChange={e => setOverallComments(e.target.value)}
            style={{
              width: '100%', border: '1px solid #e0d4bc', borderRadius: 6,
              padding: '10px 14px', fontSize: 13, color: '#444', resize: 'vertical',
              outline: 'none', fontFamily: 'Georgia, serif', background: '#fdfaf6',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', background: submitting ? '#ddd' : '#C9A84C',
            color: '#05091A', border: 'none', borderRadius: 6,
            padding: '18px 24px', fontSize: 16, fontWeight: 'bold',
            cursor: submitting ? 'not-allowed' : 'pointer',
            letterSpacing: 1, fontFamily: 'Georgia, serif',
          }}
        >
          {submitting ? 'Submitting…' : '✅ Submit My Review to Maya'}
        </button>

        <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          Once submitted, Maya will review your changes and get back to you within 24 hours.<br />
          Questions? Email <a href="mailto:indianflamesinc@gmail.com" style={{ color: '#C9A84C' }}>indianflamesinc@gmail.com</a>
        </p>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid #e8dfc8', color: '#bbb', fontSize: 11 }}>
          Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880 · mayacater.com
        </div>
      </div>
    </div>
  )
}
