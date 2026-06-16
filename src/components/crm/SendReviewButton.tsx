'use client'
// src/components/crm/SendReviewButton.tsx
// FIX-040 (Jun 16 2026): WhatsApp one-click button after Round 1 send
//   BEFORE: showed copy-paste text box only
//   AFTER:  '📱 Open WhatsApp' link shown after send
// FIX-047 (Jun 16 2026): WhatsApp as <a href> not window.open
//   BEFORE: window.open() — blocked by browser popup blocker
//   AFTER:  <a href> rendered after send — browser never blocks direct link clicks

import { useState } from 'react'

interface Props {
  enquiryId: string
  quoteId: string
  customerName: string
  customerEmail: string
  // FIX-040: phone needed for WhatsApp one-click
  customerPhone?: string
}

export function SendReviewButton({ enquiryId, quoteId, customerName, customerEmail, customerPhone }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    reviewUrl?: string
    roundNumber?: number
    whatsappMessage?: string
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSend() {
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true)
    setConfirmed(false)
    try {
      const res = await fetch('/api/quotes/send-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enquiry_id: enquiryId, quote_id: quoteId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult({
        success: true,
        reviewUrl: data.review_url,
        roundNumber: data.round_number,
        whatsappMessage: data.whatsapp_message,
      })
    } catch (err: any) {
      setResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function copyWhatsApp() {
    if (!result?.whatsappMessage) return
    navigator.clipboard.writeText(result.whatsappMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // FIX-047 (Jun 16 2026): build WhatsApp URL as string — don't use window.open
  // BEFORE: window.open() called from onClick handler → popup blocker allows it
  //         BUT if called after any async operation → blocked
  // AFTER:  compute URL and render as <a href> — browser never blocks direct link clicks
  function getWhatsAppUrl(): string | null {
    if (!result?.whatsappMessage || !customerPhone) return null
    const phone = customerPhone.replace(/\D/g, '')
    return `https://wa.me/1${phone}?text=${encodeURIComponent(result.whatsappMessage)}`
  }

  // ── Success state ────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="mt-4 space-y-3">
        {/* Success banner */}
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-green-300 text-sm">
                Quote sent to {customerName} (Round {result.roundNumber})
              </p>
              <p className="text-green-400/70 text-xs mt-1">
                Email sent to <strong>{customerEmail}</strong> with full quote details + review link.
              </p>
              <a
                href={result.reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-[#C9A84C] underline hover:text-[#E2C87A]"
              >
                👁 Preview customer review page →
              </a>
            </div>
          </div>
        </div>

        {/* WhatsApp / iMessage message */}
        {result.whatsappMessage && (
          <div className="rounded-lg border border-gold/20 bg-royal-mid p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold">
                WhatsApp / iMessage
              </span>
              <div className="flex gap-2">
                {/* FIX-040: one-click WhatsApp button */}
                {/* FIX-047: <a href> not window.open — never blocked by browser */}
                {getWhatsAppUrl() && (
                  <a
                    href={getWhatsAppUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-green-500/30 text-green-400/70 px-3 py-1 hover:bg-green-500/10 transition-colors"
                  >
                    📱 Open WhatsApp
                  </a>
                )}
                <button
                  onClick={copyWhatsApp}
                  className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-gold/30 text-gold px-3 py-1 hover:bg-gold/10 transition-colors"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
            <pre className="text-cream/70 text-[12px] leading-relaxed whitespace-pre-wrap font-sans bg-ink/50 p-3 rounded">
              {result.whatsappMessage}
            </pre>
          </div>
        )}

        {/* Send again button */}
        <button
          onClick={() => setResult(null)}
          className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase border border-gold/20 text-gold/50 px-4 py-2 hover:bg-gold/5 transition-colors"
        >
          Send Another Round
        </button>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────
  if (result?.success === false) {
    return (
      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="font-semibold text-red-400 text-sm">Failed to send quote</p>
        <p className="text-red-400/70 text-xs mt-1">{result.error}</p>
        <button onClick={() => setResult(null)} className="mt-2 text-xs text-red-400 underline">
          Try again
        </button>
      </div>
    )
  }

  // ── Default / confirm state ──────────────────────────────
  return (
    <div className="space-y-2">
      {confirmed && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <strong>Confirm:</strong> This will email <strong>{customerName}</strong> ({customerEmail}) a full quote
          with a link to review and submit changes online. Click again to proceed.
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={loading}
        className={`
          flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-sm transition-all
          ${confirmed
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-[#C9A84C] text-[#05091A] hover:bg-[#E2C87A]'
          }
          disabled:opacity-60 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sending email…
          </>
        ) : confirmed ? (
          '✅ Yes, Send Now'
        ) : (
          '📋 Send Quote for Customer Review'
        )}
      </button>
    </div>
  )
}
