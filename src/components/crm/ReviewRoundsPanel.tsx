'use client'
// src/components/crm/ReviewRoundsPanel.tsx
// Shows review history, diffs, Accept & Lock, Send Round 2

import { useState, useEffect } from 'react'

interface Round {
  id: string
  round_number: number
  status: string
  token: string
  sent_snapshot: any
  customer_changes: any[]| null
  customer_comments: string | null
  customer_email: string
  customer_name: string
  created_at: string
  submitted_at: string | null
  viewed_at: string | null
}

interface Props {
  enquiryId: string
  quoteId: string
  onRoundUpdate?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: 'Sent — Awaiting Customer',  color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400' },
  viewed:    { label: 'Customer Opened Link',       color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',   dot: 'bg-blue-400' },
  submitted: { label: '⚡ Customer Responded',      color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-400' },
  accepted:  { label: '✅ Accepted & Locked',        color: 'bg-green-500/10 border-green-500/30 text-green-300', dot: 'bg-green-400' },
  expired:   { label: 'Expired / Superseded',       color: 'bg-gray-500/10 border-gray-500/20 text-gray-500',   dot: 'bg-gray-500' },
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

export function ReviewRoundsPanel({ enquiryId, quoteId, onRoundUpdate }: Props) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [noteRoundId, setNoteRoundId] = useState<string | null>(null)

  useEffect(() => {
    fetchRounds()
  }, [enquiryId])

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

  if (loading) return null
  if (rounds.length === 0) return null

  const latestRound = rounds[rounds.length - 1]
  const hasActiveRound = ['pending', 'viewed'].includes(latestRound?.status)
  const hasResponse = latestRound?.status === 'submitted'
  const isAccepted = latestRound?.status === 'accepted'

  return (
    <div className="mt-6 border-t border-gold/10 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">
          Customer Review History
        </span>
        <span className="font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-cream/30">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Rounds list */}
      <div className="space-y-3">
        {rounds.map((round, idx) => {
          const isLatest = idx === rounds.length - 1
          const cfg = STATUS_CONFIG[round.status] || STATUS_CONFIG.expired
          const changes = round.customer_changes ?? []
          const snapshot = round.sent_snapshot?.tray_items ?? []
          const diff = computeDiff(snapshot, changes)
          const reviewUrl = `${BASE_URL}/review/${round.token}`

          return (
            <div
              key={round.id}
              className={`rounded-lg border overflow-hidden ${isLatest ? 'border-gold/30' : 'border-gold/10 opacity-60'}`}
            >
              {/* Round header */}
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
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors"
                  >
                    View Link ↗
                  </a>
                </div>
              </div>

              {/* Viewed timestamp */}
              {round.viewed_at && (
                <div className="px-4 py-1.5 bg-blue-500/5 border-b border-gold/5 text-[11px] text-blue-300/60">
                  👁 Customer opened link: {fmtDate(round.viewed_at)}
                </div>
              )}

              {/* Customer changes diff */}
              {round.status === 'submitted' && (
                <div className="px-4 py-3 border-b border-gold/10">
                  {diff.length > 0 ? (
                    <>
                      <p className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/50 mb-2">
                        {diff.length} Change{diff.length !== 1 ? 's' : ''} Requested
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-[10px] text-cream/30 border-b border-gold/10">
                              <th className="text-left py-1 pr-4 font-normal">Dish</th>
                              <th className="text-left py-1 pr-4 font-normal">Was</th>
                              <th className="text-left py-1 pr-4 font-normal">Now</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diff.map((d, i) => (
                              <tr key={i} className="border-b border-gold/5">
                                <td className="py-1.5 pr-4 text-cream/80 font-medium">{d.dish}</td>
                                <td className="py-1.5 pr-4 text-cream/30 line-through">{d.original}</td>
                                <td className="py-1.5 pr-4 text-green-400 font-bold">{d.updated}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-cream/40 italic">
                      No quantity changes — customer may have left comments below.
                    </p>
                  )}

                  {/* Customer overall comments */}
                  {round.customer_comments && (
                    <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-[12px] text-yellow-200/80">
                      <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-yellow-400/60 block mb-1">Customer Comments</span>
                      {round.customer_comments}
                    </div>
                  )}

                  {/* Per-dish comments */}
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

              {/* Action zone — only on latest submitted round */}
              {isLatest && round.status === 'submitted' && (
                <div className="px-4 py-4 bg-[#05091A] space-y-3">
                  <p className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/60">Your Response</p>

                  <div className="flex flex-wrap gap-2">
                    {/* Accept & Lock */}
                    <button
                      onClick={() => handleAccept(round.id)}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 rounded bg-green-600 px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-white hover:bg-green-500 transition-colors disabled:opacity-40"
                    >
                      {actionLoading === 'accept-' + round.id ? '…' : '✅ Accept & Lock Quote'}
                    </button>

                    {/* Send Round 2 */}
                    <button
                      onClick={handleSendRound2}
                      disabled={!!actionLoading}
                      className="flex items-center gap-2 rounded bg-[#C9A84C] px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-[#05091A] hover:bg-[#E2C87A] transition-colors disabled:opacity-40"
                    >
                      {actionLoading === 'round2' ? 'Sending…' : `📋 Send Round ${round.round_number + 1} to Customer`}
                    </button>
                  </div>

                  <p className="text-[10px] text-cream/25">
                    Accept & Lock confirms the quote as-is. Send Round {round.round_number + 1} emails the customer a new review link with updated quote.
                  </p>
                </div>
              )}

              {/* Accepted state */}
              {round.status === 'accepted' && (
                <div className="px-4 py-3 bg-green-500/5 text-[12px] text-green-300/70">
                  ✅ Quote accepted and locked — {fmtDate(round.submitted_at || round.created_at)}
                </div>
              )}

              {/* Active round — show link reminder */}
              {isLatest && ['pending', 'viewed'].includes(round.status) && (
                <div className="px-4 py-3 bg-yellow-500/5 text-[12px] text-yellow-300/60">
                  ⏳ Waiting for customer to submit their review.
                  {round.viewed_at
                    ? ' They have opened the link.'
                    : ' They have not opened the link yet.'}
                  <button
                    onClick={() => navigator.clipboard.writeText(reviewUrl)}
                    className="ml-3 font-cinzel text-[7px] tracking-[0.15em] uppercase border border-yellow-500/20 text-yellow-400/60 px-2 py-0.5 hover:bg-yellow-500/10 transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Accepted summary */}
      {isAccepted && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-[13px] text-green-300">
          🎉 Quote review complete — customer has accepted. Ready to collect deposit!
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────

function computeDiff(snapshot: any[], changes: any[]) {
  const diffs: any[] = []
  for (const change of changes) {
    const orig = snapshot.find(
      (o: any) => o.id === change.id || o.dish_name?.toLowerCase() === change.dish_name?.toLowerCase()
    )
    if (!orig) continue
    if (String(orig.tray_quantity) !== String(change.tray_quantity)) {
      diffs.push({ dish: change.dish_name, original: orig.tray_quantity, updated: change.tray_quantity })
    }
  }
  return diffs
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}
