'use client'
// src/components/crm/ReviewRoundsPanel.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Round {
  id: string
  round_number: number
  status: string
  token: string
  sent_snapshot: any
  customer_changes: any[] | null
  customer_comments: string | null
  customer_email: string
  customer_name: string
  created_at: string
  submitted_at: string | null
  viewed_at: string | null
  quote_id: string
}

interface Props {
  enquiryId: string
  quoteId: string
  onRoundUpdate?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Sent — Awaiting Customer',  color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400' },
  viewed:    { label: 'Customer Opened Link',       color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',      dot: 'bg-blue-400' },
  submitted: { label: '⚡ Customer Responded',      color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-400' },
  accepted:  { label: '✅ Accepted & Locked',        color: 'bg-green-500/10 border-green-500/30 text-green-300',   dot: 'bg-green-400' },
  expired:   { label: 'Expired / Superseded',       color: 'bg-gray-500/10 border-gray-500/20 text-gray-500',      dot: 'bg-gray-500' },
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function ReviewRoundsPanel({ enquiryId, quoteId, onRoundUpdate }: Props) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchRounds() }, [enquiryId])

  async function fetchRounds() {
    try {
      const res = await fetch(`/api/quotes/review-rounds?enquiry_id=${enquiryId}`)
      const data = await res.json()
      setRounds(data.rounds || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(roundId: string) {
    setActionLoading('accept-' + roundId)
    try {
      await fetch('/api/quotes/accept-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: roundId, enquiry_id: enquiryId }),
      })
      await fetchRounds()
      onRoundUpdate?.()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSendRound2() {
    setActionLoading('round2')
    try {
      const res = await fetch('/api/quotes/send-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enquiry_id: enquiryId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchRounds()
      onRoundUpdate?.()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading || rounds.length === 0) return null

  const latestRound = rounds[rounds.length - 1]
  const isAccepted = latestRound?.status === 'accepted'

  return (
    <div className="mt-6 border-t border-gold/10 pt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">
          Customer Review History
        </span>
        <span className="font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-cream/30">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {rounds.map((round, idx) => {
          const isLatest = idx === rounds.length - 1
          const cfg = STATUS_CONFIG[round.status] || STATUS_CONFIG.expired
          const changes = round.customer_changes ?? []
          const snapshot = round.sent_snapshot?.tray_items ?? []
          const diff = computeDiff(snapshot, changes)
          const reviewUrl = `${BASE_URL}/review/${round.token}`

          return (
            <div key={round.id} className={`rounded-lg border overflow-hidden ${isLatest ? 'border-gold/30' : 'border-gold/10 opacity-60'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 ${isLatest ? 'bg-[#0A1530]' : 'bg-royal-mid'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`font-cinzel text-[8px] tracking-[0.2em] uppercase ${isLatest ? 'text-gold' : 'text-cream/40'}`}>
                    Round {round.round_number}
                  </span>
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-cream/30">{fmtDate(round.created_at)}</span>
                  <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
                    className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors">
                    View Link ↗
                  </a>
                </div>
              </div>

              {/* Viewed */}
              {round.viewed_at && (
                <div className="px-4 py-1.5 bg-blue-500/5 border-b border-gold/5 text-[11px] text-blue-300/60">
                  👁 Customer opened link: {fmtDate(round.viewed_at)}
                </div>
              )}

              {/* Diff table */}
              {round.status === 'submitted' && (
                <div className="px-4 py-3 border-b border-gold/10">
                  {diff.length > 0 ? (
                    <>
                      <p className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/50 mb-3">
                        {diff.length} Change{diff.length !== 1 ? 's' : ''} Requested
                      </p>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[9px] text-cream/30 border-b border-gold/10 uppercase tracking-wider">
                            <th className="text-left py-1.5 pr-3 font-normal">Dish</th>
                            <th className="text-right py-1.5 pr-3 font-normal">Was</th>
                            <th className="text-right py-1.5 pr-3 font-normal">Now</th>
                            <th className="text-right py-1.5 pr-3 font-normal">Unit Price</th>
                            <th className="text-right py-1.5 font-normal">New Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diff.map((d, i) => (
                            <>
                            <tr key={i} className="border-b border-gold/5">
                              <td className="py-2 pr-3 text-cream/80 font-medium">
                                {d.dish}
                                {d.comments && (
                                  <div className="text-[10px] text-yellow-300/60 mt-0.5 italic">{d.comments}</div>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-cream/30 text-right">{d.original_qty !== '—' ? <span className="line-through">{d.original_qty}</span> : '—'}</td>
                              <td className="py-2 pr-3 text-green-400 font-bold text-right">{d.updated_qty}</td>
                              <td className="py-2 pr-3 text-cream/40 text-right">
                                {d.unit_price > 0 ? fmt(d.unit_price) : '—'}
                              </td>
                              <td className="py-2 text-gold font-bold text-right">
                                {d.unit_price > 0 ? fmt(d.unit_price * parseFloat(String(d.updated_qty))) : '—'}
                              </td>
                            </tr>
                            </>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="text-[12px] text-cream/40 italic">No quantity changes — check comments below.</p>
                  )}

                  {/* Comments */}
                  {round.customer_comments && (
                    <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-[12px] text-yellow-200/80">
                      <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-yellow-400/60 block mb-1">Customer Comments</span>
                      {round.customer_comments}
                    </div>
                  )}
                  {changes.filter((c: any) => c.customer_comments).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {changes.filter((c: any) => c.customer_comments).map((c: any, i: number) => (
                        <div key={i} className="text-[11px] text-cream/50 pl-2 border-l border-gold/20">
                          <strong className="text-cream/70">{c.dish_name}:</strong> {c.customer_comments}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {isLatest && round.status === 'submitted' && (
                <div className="px-4 py-4 bg-[#05091A] space-y-3">
                  <p className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/60">Your Response</p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/enquiries/${enquiryId}/quote`}
                      className="flex items-center gap-2 rounded border border-gold/30 px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-gold hover:bg-gold/10 transition-colors"
                    >
                      ✏️ Edit Quote First
                    </Link>
                    <button
                      onClick={() => handleAccept(round.id)}
                      disabled={!!actionLoading}
                      className="rounded bg-green-600 px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-white hover:bg-green-500 transition-colors disabled:opacity-40"
                    >
                      {actionLoading === 'accept-' + round.id ? '…' : '✅ Accept & Lock Quote'}
                    </button>
                    <button
                      onClick={handleSendRound2}
                      disabled={!!actionLoading}
                      className="rounded bg-[#C9A84C] px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-[#05091A] hover:bg-[#E2C87A] transition-colors disabled:opacity-40"
                    >
                      {actionLoading === 'round2' ? 'Sending…' : `📋 Send Round ${round.round_number + 1} to Customer`}
                    </button>
                  </div>
                  <p className="text-[10px] text-cream/25">
                    Edit Quote → update quantities → then Accept or Send Round {round.round_number + 1}.
                  </p>
                </div>
              )}

              {round.status === 'accepted' && (
                <div className="px-4 py-3 bg-green-500/5 text-[12px] text-green-300/70">
                  ✅ Accepted & locked — {fmtDate(round.submitted_at || round.created_at)}
                </div>
              )}

              {isLatest && ['pending', 'viewed'].includes(round.status) && (
                <div className="px-4 py-3 bg-yellow-500/5 text-[12px] text-yellow-300/60 flex items-center justify-between">
                  <span>⏳ {round.viewed_at ? 'Customer opened — awaiting submission.' : 'Waiting for customer to open review link.'}</span>
                  <button onClick={() => navigator.clipboard.writeText(reviewUrl)}
                    className="ml-3 font-cinzel text-[7px] tracking-[0.15em] uppercase border border-yellow-500/20 text-yellow-400/60 px-2 py-0.5 hover:bg-yellow-500/10 transition-colors">
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isAccepted && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-[13px] text-green-300">
          🎉 Quote review complete — customer accepted. Ready to collect deposit!
        </div>
      )}
    </div>
  )
}

function computeDiff(snapshot: any[], changes: any[]) {
  const diffs: any[] = []
  for (const change of changes) {
    const orig = snapshot.find(
      (o: any) => o.id === change.id || o.dish_name?.toLowerCase() === change.dish_name?.toLowerCase()
    )
    const origQty   = orig ? parseFloat(orig.tray_quantity) : null
    const newQty    = parseFloat(change.tray_quantity)
    const unitPrice = change.unit_price_cents ?? orig?.unit_price_cents ?? 0
    // Always show the change — use original qty from snapshot if available
    diffs.push({
      dish: change.dish_name,
      original_qty: origQty ?? '—',
      updated_qty: newQty,
      unit_price: unitPrice,
      comments: change.customer_comments || '',
    })
  }
  return diffs
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}
