'use client'
// src/components/crm/ReviewRoundsPanel.tsx
// FIX-076 (Jun 17 2026): WhatsApp button uses <a href> not window.open — never blocked after reload
// FIX-070b (Jun 17 2026): Full customer name in WhatsApp message — not first word only
// FIX-034 (Jun 15 2026): "Open Reply Builder" button replaces "Send Round 2" button
// FIX-033: new status values: pending_customer, pending_maya, accepted
// Status flow: pending_customer → pending_maya → pending_customer → ... → accepted

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
  admin_replies: any[] | null
  admin_overall_reply: string | null
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
  customerPhone?: string
  customerName?: string
}

// FIX-033: updated status config with new values
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  sent:             { label: 'Sent — Awaiting Customer',    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',  dot: 'bg-yellow-400' },
  pending:          { label: 'Sent — Awaiting Customer',    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',  dot: 'bg-yellow-400' },
  pending_customer: { label: 'Sent — Awaiting Customer',    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',  dot: 'bg-yellow-400' },
  viewed:           { label: 'Customer Opened Link',         color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',        dot: 'bg-blue-400' },
  pending_maya:     { label: '⚡ Customer Responded',        color: 'bg-orange-500/10 border-orange-500/30 text-orange-300',  dot: 'bg-orange-400' },
  submitted:        { label: '⚡ Customer Responded',        color: 'bg-orange-500/10 border-orange-500/30 text-orange-300',  dot: 'bg-orange-400' },
  accepted:         { label: '✅ Confirmed — Deposit Pending', color: 'bg-green-500/10 border-green-500/30 text-green-300',   dot: 'bg-green-400' },
  expired:          { label: 'Superseded by newer round',    color: 'bg-gray-500/10 border-gray-500/20 text-gray-500',        dot: 'bg-gray-500' },
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function ReviewRoundsPanel({ enquiryId, quoteId, onRoundUpdate, customerPhone, customerName }: Props) {
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchRounds() }, [enquiryId])

  async function fetchRounds() {
    try {
      const res = await fetch(`/api/quotes/review-rounds?enquiry_id=${enquiryId}`)
      const data = await res.json()
      setRounds(data.rounds || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
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
    } finally { setActionLoading(null) }
  }

  // FIX-076 (Jun 17 2026): getWhatsAppUrl replaces openWhatsApp+window.open
  // window.open() gets blocked by browsers after async ops / page reload
  // <a href> is never blocked — always works
  function getWhatsAppUrl(message: string): string | null {
    if (!customerPhone || !message) return null
    const phone = customerPhone.replace(/\D/g, '')
    return `https://wa.me/1${phone}?text=${encodeURIComponent(message)}`
  }

  if (loading || rounds.length === 0) return null

  const latestRound = rounds[rounds.length - 1]
  const isAccepted = latestRound?.status === 'accepted'
  const isPendingMaya = latestRound?.status === 'pending_maya' || latestRound?.status === 'submitted'

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

      {/* Action banner when pending Maya */}
      {isPendingMaya && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-orange-400 mb-1">Action Required</p>
            <p className="text-[12px] text-orange-200/70">
              Customer has responded to Round {latestRound.round_number}. Open Reply Builder to respond and send Round {latestRound.round_number + 1}.
            </p>
          </div>
          <Link href={`/admin/enquiries/${enquiryId}/reply`}
            className="ml-4 flex-shrink-0 rounded bg-orange-500 px-5 py-2.5 font-cinzel text-[8px] tracking-[0.15em] uppercase text-white hover:bg-orange-400 transition-colors flex items-center gap-2">
            ✏️ Open Reply Builder
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {rounds.map((round, idx) => {
          const isLatest = idx === rounds.length - 1
          const cfg = STATUS_CONFIG[round.status] || STATUS_CONFIG.expired
          const changes = round.customer_changes ?? []
          const reviewUrl = `${BASE_URL}/review/${round.token}`
          const snapshot_data = round.sent_snapshot
          const total = snapshot_data?.total_cents ? fmt(snapshot_data.total_cents) : ''
          // FIX-070b (Jun 17 2026): use full name not first word only
          const firstName = customerName || 'Customer'

          const waMessage = round.round_number === 1
            ? `Hi ${firstName}! 🙏 Your Maya Catering quote is ready!\n\nTotal: ${total}\n\nReview & confirm here:\n${reviewUrl}\n\n— Maya Catering 🍛`
            : `Hi ${firstName}! We've updated your catering quote (Round ${round.round_number}).\n\nTotal: ${total}\n\nReview here:\n${reviewUrl}\n\n— Maya Catering 🍛`

          return (
            <div key={round.id} className={`rounded-lg border overflow-hidden ${isLatest ? 'border-gold/30' : 'border-gold/10 opacity-60'}`}>

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
                  {customerPhone && getWhatsAppUrl(waMessage) && (
                    <a href={getWhatsAppUrl(waMessage)!} target="_blank" rel="noopener noreferrer"
                      className="font-cinzel text-[7px] tracking-[0.12em] uppercase border border-green-500/30 text-green-400/70 px-2 py-0.5 hover:bg-green-500/10 transition-colors">
                      📱 WhatsApp
                    </a>
                  )}
                  <a href={reviewUrl} target="_blank" rel="noopener noreferrer"
                    className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/50 hover:text-gold transition-colors">
                    View Link ↗
                  </a>
                </div>
              </div>

              {round.viewed_at && (
                <div className="px-4 py-1.5 bg-blue-500/5 border-b border-gold/5 text-[11px] text-blue-300/60">
                  👁 Opened: {fmtDate(round.viewed_at)}
                </div>
              )}

              {/* Customer feedback — pending_maya or submitted */}
              {(round.status === 'pending_maya' || round.status === 'submitted') && (
                <div className="px-4 py-3 border-b border-gold/10">

                  {/* Dish comments */}
                  {changes.length > 0 ? (
                    <>
                      <p className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/50 mb-3">
                        {changes.length} Dish Comment{changes.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-col gap-2 mb-3">
                        {changes.map((c: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 text-[12px]">
                            <span className="text-cream/60 font-medium min-w-[120px] flex-shrink-0">{c.dish_name}</span>
                            <span className="text-yellow-200/80 italic">"{c.customer_comments}"</span>
                            {/* Show admin reply if exists */}
                            {(round.admin_replies || []).find((r: any) => r.dish_name?.toLowerCase() === c.dish_name?.toLowerCase()) && (
                              <span className="text-green-300/60 text-[11px]">
                                ↳ {(round.admin_replies || []).find((r: any) => r.dish_name?.toLowerCase() === c.dish_name?.toLowerCase())?.reply}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-cream/40 italic mb-3">No dish-specific comments.</p>
                  )}

                  {/* Overall comment */}
                  {round.customer_comments && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 text-[12px] text-yellow-200/80">
                      <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-yellow-400/60 block mb-1">Overall Message</span>
                      "{round.customer_comments}"
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons for latest pending_maya round */}
              {isLatest && (round.status === 'pending_maya' || round.status === 'submitted') && (
                <div className="px-4 py-4 bg-royal-mid flex flex-wrap gap-2">
                  <Link href={`/admin/enquiries/${enquiryId}/reply`}
                    className="rounded bg-gold px-5 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-ink hover:bg-gold-hi transition-colors flex items-center gap-2">
                    ✏️ Open Reply Builder — Send Round {round.round_number + 1}
                  </Link>
                  <button onClick={() => handleAccept(round.id)} disabled={!!actionLoading}
                    className="rounded bg-green-600 px-4 py-2.5 font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-white hover:bg-green-500 transition-colors disabled:opacity-40">
                    {actionLoading === 'accept-' + round.id ? '…' : '✅ Accept & Lock (No Changes)'}
                  </button>
                </div>
              )}

              {/* Awaiting customer */}
              {/* FIX-076c: added 'sent' status — Reply Builder sets this after Round 2+ */}
              {isLatest && (round.status === 'pending' || round.status === 'pending_customer' || round.status === 'sent' || round.status === 'viewed') && (
                <div className="px-4 py-3 bg-yellow-500/5 text-[12px] text-yellow-300/60 flex items-center justify-between">
                  <span>⏳ {round.viewed_at ? 'Customer opened link — awaiting their response.' : 'Waiting for customer to open review link.'}</span>
                  <div className="flex gap-2">
                    {customerPhone && getWhatsAppUrl(waMessage) && (
                      <a href={getWhatsAppUrl(waMessage)!} target="_blank" rel="noopener noreferrer"
                        className="font-cinzel text-[7px] tracking-[0.12em] uppercase border border-green-500/20 text-green-400/60 px-2 py-0.5 hover:bg-green-500/10 transition-colors">
                        📱 Send WhatsApp
                      </a>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(reviewUrl)}
                      className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-yellow-500/20 text-yellow-400/60 px-2 py-0.5 hover:bg-yellow-500/10 transition-colors">
                      Copy Link
                    </button>
                  </div>
                </div>
              )}

              {/* Accepted */}
              {round.status === 'accepted' && (
                <div className="px-4 py-3 bg-green-500/5 text-[12px] text-green-300/70">
                  ✅ Customer confirmed — {fmtDate(round.submitted_at || round.created_at)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isAccepted && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-[13px] text-green-300">
          🎉 Quote accepted! Ready to collect deposit and generate contract.
        </div>
      )}
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}
