'use client'
// src/app/admin/enquiries/[id]/reply/page.tsx
// FIX-034 (Jun 15 2026): Reply Builder — separate page for admin to review
// customer feedback per dish, write replies, update qty/price, and send Round N.
// Keeps Quote Builder clean (for building new quotes).
// This page loads the latest submitted review round and shows full thread per dish.

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Plus, Trash2, Search } from 'lucide-react'

const fmt = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)
const uid = () => Math.random().toString(36).slice(2, 9)

type PricingType = 'tray' | 'per_person' | 'per_piece' | 'per_gallon' | 'per_portion'
type TraySize = 'half' | 'medium' | 'full' | 'custom'

interface DishItem {
  id: string
  dish_name: string
  pricing_type: PricingType
  tray_size?: TraySize
  tray_quantity: number
  unit_price_cents: number
  guest_count: number
  piece_count: number
  notes_to_customer: string      // Maya's original note
  admin_reply: string            // FIX-034: Maya's reply to customer this round
  // Thread history from previous rounds
  thread: {
    round: number
    customer_comment: string
    admin_reply: string
  }[]
  // Current round customer comment
  customer_comment: string
}

function calcTotal(item: DishItem): number {
  if (item.pricing_type === 'tray') {
    if (item.tray_size === 'custom') return Math.round((item.tray_quantity || 1) * item.unit_price_cents)
    return item.unit_price_cents
  }
  if (item.pricing_type === 'per_person') return item.guest_count * item.unit_price_cents
  return item.piece_count * item.unit_price_cents
}

function getTrayLabel(item: DishItem): string {
  if (item.pricing_type === 'per_person')  return 'Per Person'
  if (item.pricing_type === 'per_piece')   return 'Per Piece'
  if (item.pricing_type === 'per_gallon')  return 'Per Gallon'
  if (item.pricing_type === 'per_portion') return 'Per Portion'
  const map: Record<string, string> = {
    half: 'Small (½)', medium: 'Medium (¾)', full: 'Full Tray', custom: `${item.tray_quantity}× Tray`
  }
  return map[item.tray_size || 'medium'] || 'Tray'
}

function getQtyDisplay(item: DishItem): string {
  if (item.pricing_type === 'per_person') return `${item.guest_count} ppl`
  if (item.pricing_type === 'per_piece')  return `${item.piece_count} pcs`
  if (item.pricing_type === 'per_gallon') return `${item.piece_count} gal`
  if (item.pricing_type === 'per_portion') return `${item.piece_count} portions`
  if (item.tray_size === 'custom') return `${item.tray_quantity}×`
  return '1'
}

const inp = "bg-transparent border-b border-gold/20 text-cream font-jost font-light text-[13px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors w-full pb-1"
const numInp = "bg-[#0a1428] border border-gold/20 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors w-full text-right"

export default function ReplyBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [enquiry, setEnquiry] = useState<any>(null)
  const [latestRound, setLatestRound] = useState<any>(null)
  const [items, setItems] = useState<DishItem[]>([])
  const [overallReply, setOverallReply] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [setupFee, setSetupFee] = useState('')
  const [serviceFee, setServiceFee] = useState('')
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [masterMenu, setMasterMenu] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    try {
      // Load enquiry
      const eRes = await fetch(`/api/enquiries/${id}`)
      const eData = await eRes.json()
      setEnquiry(eData)

      // Load latest quote for fees/discount
      const qRes = await fetch(`/api/quotes?enquiry_id=${id}`)
      const qData = await qRes.json()
      const quote = qData.quotes?.[0]
      if (quote) {
        const dc = quote.delivery_fee_cents || 0
        const sc = quote.setup_fee_cents || 0
        const svc = quote.service_fee_cents || 0
        if (dc) setDeliveryFee(String(dc / 100))
        if (sc) setSetupFee(String(sc / 100))
        if (svc) setServiceFee(String(svc / 100))
        if (quote.discount_type && quote.discount_type !== 'none') {
          setDiscountType(quote.discount_type)
          setDiscountValue(String(quote.discount_value || ''))
        }
      }

      // Load all review rounds to build thread history
      const rRes = await fetch(`/api/quotes/review-rounds?enquiry_id=${id}`)
      const rData = await rRes.json()
      const rounds: any[] = rData.rounds || []

      // Find latest submitted round
      const submitted = rounds.filter(r => r.status === 'pending_maya' || r.status === 'submitted')
      const latest = submitted[submitted.length - 1]
      if (!latest) {
        setError('No customer response found. Go back to enquiry.')
        setLoading(false)
        return
      }
      setLatestRound(latest)

      // Build thread history per dish from all previous rounds
      const threadMap: Record<string, { round: number; customer_comment: string; admin_reply: string }[]> = {}
      for (const round of rounds) {
        if (!round.customer_changes) continue
        const adminReplies: any[] = round.admin_replies || []
        for (const change of round.customer_changes) {
          if (!change.customer_comments) continue
          const key = change.dish_name?.toLowerCase()
          if (!threadMap[key]) threadMap[key] = []
          const adminReplyForDish = adminReplies.find(r => r.dish_name?.toLowerCase() === key)
          threadMap[key].push({
            round: round.round_number,
            customer_comment: change.customer_comments,
            admin_reply: adminReplyForDish?.reply || '',
          })
        }
      }

      // Load current tray items from DB
      const snapshot = latest.sent_snapshot
      const trayItems = snapshot?.tray_items || []

      // Map current customer comments from latest round
      const customerCommentMap: Record<string, string> = {}
      for (const change of (latest.customer_changes || [])) {
        if (change.customer_comments) {
          customerCommentMap[change.dish_name?.toLowerCase()] = change.customer_comments
        }
      }

      setItems(trayItems.map((item: any) => ({
        id: item.id || uid(),
        dish_name: item.dish_name,
        pricing_type: item.pricing_type || 'tray',
        tray_size: item.tray_size || 'medium',
        tray_quantity: item.tray_quantity || 1,
        unit_price_cents: item.unit_price_cents || 0,
        guest_count: item.guest_count || eData.guest_count || 100,
        piece_count: item.piece_count || 1,
        notes_to_customer: item.notes_to_customer || '',
        admin_reply: '',
        thread: threadMap[item.dish_name?.toLowerCase()] || [],
        customer_comment: customerCommentMap[item.dish_name?.toLowerCase()] || '',
      })))

      // Load master menu for picker
      const mRes = await fetch('/api/menu-master')
      const mData = await mRes.json()
      setMasterMenu(mData.items || [])

    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  function updateItem(id: string, updates: Partial<DishItem>) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  function addBlank() {
    setItems(prev => [...prev, {
      id: uid(), dish_name: '', pricing_type: 'tray', tray_size: 'medium',
      tray_quantity: 1, unit_price_cents: 0, guest_count: enquiry?.guest_count || 100,
      piece_count: 1, notes_to_customer: '', admin_reply: '', thread: [], customer_comment: '',
    }])
  }

  function addFromMaster(dish: any) {
    const pricing: PricingType = dish.has_tray ? 'tray' : dish.has_per_person ? 'per_person' : 'per_piece'
    setItems(prev => [...prev, {
      id: uid(), dish_name: dish.name, pricing_type: pricing,
      tray_size: 'medium', tray_quantity: 1,
      unit_price_cents: dish.medium_tray_cents || dish.per_person_cents || dish.per_piece_cents || 0,
      guest_count: enquiry?.guest_count || 100,
      piece_count: 1, notes_to_customer: '', admin_reply: '', thread: [], customer_comment: '',
    }])
    setShowPicker(false); setSearch('')
  }

  // Totals
  const subtotal = items.reduce((s, i) => s + calcTotal(i), 0)
  const deliveryCents = Math.round((parseFloat(deliveryFee) || 0) * 100)
  const setupCents = Math.round((parseFloat(setupFee) || 0) * 100)
  const serviceCents = Math.round((parseFloat(serviceFee) || 0) * 100)
  const discountCents = discountType === 'none' ? 0
    : discountType === 'percent' ? Math.round(subtotal * (parseFloat(discountValue) || 0) / 100)
    : Math.round((parseFloat(discountValue) || 0) * 100)
  const taxCents = Math.round((subtotal - discountCents) * 0.07)
  const totalCents = subtotal - discountCents + taxCents + deliveryCents + setupCents + serviceCents
  const depositCents = Math.round(totalCents * 0.2)
  const balanceCents = totalCents - depositCents

  async function handleSend() {
    setSending(true); setError('')
    try {
      const adminReplies = items
        .filter(i => i.admin_reply.trim())
        .map(i => ({ dish_name: i.dish_name, reply: i.admin_reply }))

      const res = await fetch('/api/quotes/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiry_id: id,
          round_id: latestRound.id,
          admin_replies: adminReplies,
          admin_overall_reply: overallReply,
          // Updated items — full list with new prices/qtys
          tray_items: items.map(i => ({
            id: i.id,
            dish_name: i.dish_name,
            pricing_type: i.pricing_type,
            tray_size: i.tray_size,
            tray_quantity: i.tray_quantity,
            unit_price_cents: i.unit_price_cents,
            guest_count: i.guest_count,
            piece_count: i.piece_count,
            notes_to_customer: i.notes_to_customer,
            admin_reply: i.admin_reply,
          })),
          delivery_fee_cents: deliveryCents,
          setup_fee_cents: setupCents,
          service_fee_cents: serviceCents,
          discount_type: discountType === 'none' ? null : discountType,
          discount_value: discountType === 'none' ? 0 : parseFloat(discountValue) || 0,
          discount_cents: discountCents,
          subtotal_cents: subtotal,
          tax_cents: taxCents,
          total_cents: totalCents,
          deposit_cents: depositCents,
          balance_cents: balanceCents,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      // Open WhatsApp if phone available
      if (data.whatsapp_message && enquiry?.customer_phone) {
        const phone = enquiry.customer_phone.replace(/\D/g, '')
        window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(data.whatsapp_message)}`, '_blank')
      }

      router.push(`/admin/enquiries/${id}`)
    } catch (e: any) {
      setError(e.message)
    }
    setSending(false)
  }

  const filteredMenu = masterMenu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
  const byCategory = filteredMenu.reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const hasCustomerComments = items.some(i => i.customer_comment)

  if (loading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <p className="font-italiana text-[28px] text-cream/30">Loading reply builder...</p>
    </div>
  )

  if (error && !latestRound) return (
    <div className="min-h-screen bg-ink flex items-center justify-center flex-col gap-4">
      <p className="text-red-400 text-[14px]">{error}</p>
      <Link href={`/admin/enquiries/${id}`} className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-4 py-2">
        ← Back to Enquiry
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-4 sticky top-0 z-30">
        <Link href={`/admin/enquiries/${id}`} className="text-gold/50 hover:text-gold transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">
            Reply Builder · Round {(latestRound?.round_number || 1) + 1}
          </span>
          <h1 className="font-italiana text-[28px] text-cream leading-none">
            {enquiry?.customer_name} — {enquiry?.event_date ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </h1>
        </div>

        {/* Grand total */}
        <div className="border border-gold/20 px-5 py-3 bg-royal text-right">
          <span className="font-cinzel text-[7px] tracking-[0.3em] uppercase text-gold/60 block">Updated Total</span>
          <span className="font-italiana text-[32px] text-gold-hi leading-none">{fmt(totalCents)}</span>
        </div>

        <button onClick={handleSend} disabled={sending}
          className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-3 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center gap-2">
          <Send size={14} />
          {sending ? 'Sending...' : `Send Round ${(latestRound?.round_number || 1) + 1} to Customer`}
        </button>
      </div>

      {error && (
        <div className="mx-8 mt-4 border border-red-500/40 bg-red-500/10 px-5 py-3 text-red-400 text-[13px]">{error}</div>
      )}

      {/* Customer overall comment banner */}
      {latestRound?.customer_comments && (
        <div className="mx-8 mt-4 border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
          <span className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-yellow-400/70 block mb-1">
            Customer's Overall Comment (Round {latestRound.round_number})
          </span>
          <p className="text-yellow-200/80 text-[13px]">"{latestRound.customer_comments}"</p>
        </div>
      )}

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
          <div className="flex flex-col gap-4">

            {/* Info banner */}
            <div className="border border-gold/20 bg-royal-mid px-5 py-4 flex items-start gap-3">
              <span className="text-gold text-lg">💡</span>
              <div>
                <p className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold mb-1">How to use Reply Builder</p>
                <p className="text-cream/50 text-[12px] leading-relaxed">
                  Review each dish below. Customer comments shown in <span className="text-yellow-300">yellow</span>.
                  Type your reply, update qty/price if needed, add/remove dishes.
                  Click <strong className="text-gold">Send Round {(latestRound?.round_number || 1) + 1}</strong> when ready — customer gets updated quote + your replies.
                </p>
              </div>
            </div>

            {/* Dish items with thread */}
            {items.map((item, idx) => {
              const lineTotal = calcTotal(item)
              const hasComment = !!item.customer_comment
              const hasThread = item.thread.length > 0

              return (
                <div key={item.id} className={`border rounded-sm overflow-hidden ${hasComment ? 'border-yellow-500/30' : 'border-gold/20'}`}>

                  {/* Dish header row */}
                  <div className={`px-5 py-4 ${hasComment ? 'bg-[#1a1200]' : idx % 2 === 0 ? 'bg-[#071020]' : 'bg-[#090f1e]'}`}>
                    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '2fr 120px 120px 110px 110px 28px' }}>

                      {/* Dish name */}
                      <div>
                        <input value={item.dish_name}
                          onChange={e => updateItem(item.id, { dish_name: e.target.value })}
                          className="bg-transparent border-b border-gold/20 text-cream font-jost font-light text-[15px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors w-full pb-1 font-semibold"
                          placeholder="Dish name..." />
                        <span className="text-[10px] text-gold/50 font-cinzel tracking-wider mt-0.5 block">
                          {getTrayLabel(item)} · {getQtyDisplay(item)} · {fmt(item.unit_price_cents)}/unit
                        </span>
                      </div>

                      {/* Pricing type */}
                      <select value={item.pricing_type}
                        onChange={e => updateItem(item.id, { pricing_type: e.target.value as PricingType })}
                        className="bg-[#0a1428] border border-gold/20 text-cream font-jost text-[11px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm">
                        {[
                          { v: 'tray', l: 'Per Tray' }, { v: 'per_person', l: 'Per Person' },
                          { v: 'per_piece', l: 'Per Piece' }, { v: 'per_gallon', l: 'Per Gallon' },
                          { v: 'per_portion', l: 'Per Portion' },
                        ].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                      </select>

                      {/* Qty */}
                      <div>
                        {item.pricing_type === 'tray' ? (
                          <select value={item.tray_size}
                            onChange={e => updateItem(item.id, { tray_size: e.target.value as TraySize })}
                            className="bg-[#0a1428] border border-gold/20 text-cream font-jost text-[11px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm w-full">
                            {[
                              { v: 'half', l: 'Small (½)' }, { v: 'medium', l: 'Medium (¾)' },
                              { v: 'full', l: 'Full Tray' }, { v: 'custom', l: 'Multiple' },
                            ].map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input type="number" min="0"
                              value={item.pricing_type === 'per_person' ? item.guest_count : item.piece_count}
                              onChange={e => {
                                const v = parseFloat(e.target.value) || 0
                                if (item.pricing_type === 'per_person') updateItem(item.id, { guest_count: v })
                                else updateItem(item.id, { piece_count: v })
                              }}
                              className={numInp} />
                            <span className="text-cream/30 text-[10px]">
                              {item.pricing_type === 'per_person' ? 'ppl' : item.pricing_type === 'per_gallon' ? 'gal' : item.pricing_type === 'per_portion' ? 'por' : 'pcs'}
                            </span>
                          </div>
                        )}
                        {item.pricing_type === 'tray' && item.tray_size === 'custom' && (
                          <div className="flex items-center gap-1 mt-1">
                            <input type="number" min="0.5" step="0.5" value={item.tray_quantity}
                              onChange={e => updateItem(item.id, { tray_quantity: parseFloat(e.target.value) || 1 })}
                              className={numInp} />
                            <span className="text-cream/30 text-[10px]">×</span>
                          </div>
                        )}
                      </div>

                      {/* Unit price */}
                      <div>
                        <span className="text-cream/30 text-[9px] font-cinzel tracking-wider block mb-1">Unit Price</span>
                        <input type="number" min="0" step="0.5"
                          value={item.unit_price_cents / 100}
                          onChange={e => updateItem(item.id, { unit_price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                          className={numInp} />
                      </div>

                      {/* Line total */}
                      <div className="text-right">
                        <span className="text-cream/30 text-[9px] font-cinzel tracking-wider block mb-1">Total</span>
                        <span className="font-italiana text-[20px] text-gold-hi">{fmt(lineTotal)}</span>
                      </div>

                      {/* Delete */}
                      <button onClick={() => removeItem(item.id)}
                        className="text-red-400/30 hover:text-red-400 transition-colors mt-3">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Conversation thread */}
                  <div className="border-t border-gold/10 px-5 py-3 bg-[#050d1a] flex flex-col gap-2">

                    {/* Maya's original note */}
                    {item.notes_to_customer && (
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-cinzel tracking-wider text-gold/50 uppercase w-20 flex-shrink-0 mt-0.5">Maya Note</span>
                        <span className="text-cream/50 text-[12px] italic">{item.notes_to_customer}</span>
                      </div>
                    )}

                    {/* Previous round threads */}
                    {item.thread.map((t, ti) => (
                      <div key={ti} className="flex flex-col gap-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-cinzel tracking-wider text-yellow-400/60 uppercase w-20 flex-shrink-0 mt-0.5">R{t.round} Customer</span>
                          <span className="text-yellow-200/70 text-[12px]">{t.customer_comment}</span>
                        </div>
                        {t.admin_reply && (
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-cinzel tracking-wider text-green-400/60 uppercase w-20 flex-shrink-0 mt-0.5">R{t.round} Maya</span>
                            <span className="text-green-200/70 text-[12px]">{t.admin_reply}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Current round customer comment */}
                    {item.customer_comment && (
                      <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2 mt-1">
                        <span className="text-[9px] font-cinzel tracking-wider text-yellow-400/80 uppercase w-20 flex-shrink-0 mt-0.5">R{latestRound?.round_number} Customer</span>
                        <span className="text-yellow-200/90 text-[12px] font-medium">{item.customer_comment}</span>
                      </div>
                    )}

                    {/* Admin reply input */}
                    <div className="flex items-start gap-2 mt-1">
                      <span className="text-[9px] font-cinzel tracking-wider text-green-400/60 uppercase w-20 flex-shrink-0 mt-2">Your Reply</span>
                      <input
                        value={item.admin_reply}
                        onChange={e => updateItem(item.id, { admin_reply: e.target.value })}
                        placeholder={item.customer_comment ? "Type your reply to customer..." : "Add a note to customer (optional)..."}
                        className={`flex-1 bg-[#0a1f0a] border border-green-500/20 text-green-100/80 font-jost text-[12px] outline-none px-3 py-2 focus:border-green-500/40 transition-colors placeholder:text-green-900/60 rounded-sm`}
                      />
                    </div>

                    {/* Notes to customer (Maya's note for this dish — editable) */}
                    <div className="flex items-start gap-2 mt-0.5">
                      <span className="text-[9px] font-cinzel tracking-wider text-gold/40 uppercase w-20 flex-shrink-0 mt-2">Maya Note</span>
                      <input
                        value={item.notes_to_customer}
                        onChange={e => updateItem(item.id, { notes_to_customer: e.target.value })}
                        placeholder="Update dish note shown to customer..."
                        className={`flex-1 bg-transparent border-b border-gold/10 text-cream/40 font-jost text-[12px] outline-none pb-1 focus:border-gold/30 transition-colors placeholder:text-cream/15`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add dish buttons */}
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowPicker(true)}
                className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-4 py-2.5 hover:bg-gold/10 transition-colors flex items-center gap-2">
                <Search size={13} /> Pick from Menu
              </button>
              <button onClick={addBlank}
                className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/20 text-gold/60 px-4 py-2.5 hover:bg-gold/5 transition-colors flex items-center gap-2">
                <Plus size={13} /> Add Custom Item
              </button>
            </div>

            {/* Fees & Adjustments */}
            <div className="border border-gold/20 bg-royal-mid p-7 mt-2">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">💰</span>
                <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Fees & Adjustments</span>
              </div>
              <div className="grid grid-cols-3 gap-5 mb-5">
                {[
                  { label: '🚚 Delivery Fee ($)', val: deliveryFee, set: setDeliveryFee },
                  { label: '🏗️ Setup Fee ($)', val: setupFee, set: setSetupFee },
                  { label: '👨‍🍳 Service Fee ($)', val: serviceFee, set: setServiceFee },
                ].map(f => (
                  <div key={f.label} className="border border-gold/10 bg-royal p-4">
                    <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-2">{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-cream/40">$</span>
                      <input type="number" min="0" step="50" value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="bg-transparent border-b border-gold/20 text-cream font-italiana text-[22px] outline-none pl-5 focus:border-gold transition-colors w-full" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-3">Discount</label>
                <div className="flex gap-2 mb-3">
                  {(['none', 'percent', 'fixed'] as const).map(t => (
                    <button key={t} onClick={() => setDiscountType(t)}
                      className={`font-cinzel text-[7.5px] tracking-[0.15em] uppercase px-3 py-2 border transition-all ${discountType === t ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>
                      {t === 'none' ? 'None' : t === 'percent' ? '% Off' : '$ Fixed'}
                    </button>
                  ))}
                </div>
                {discountType !== 'none' && (
                  <div className="flex gap-4 items-end">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">{discountType === 'percent' ? '%' : '$'}</span>
                      <input type="number" min="0" value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className="bg-royal border border-gold/20 text-cream font-italiana text-[22px] outline-none pl-8 pr-4 py-2 focus:border-gold transition-colors w-36" placeholder="0" />
                    </div>
                    {discountCents > 0 && <span className="text-green-400 text-[12px]">Saving {fmt(discountCents)}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Overall reply */}
            <div className="border border-green-500/20 bg-[#050d05] p-6">
              <label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-green-400/70 block mb-3">
                Your Overall Reply to Customer
              </label>
              {latestRound?.customer_comments && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-4 py-3 mb-3 text-[12px] text-yellow-200/80">
                  <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-yellow-400/60 block mb-1">Customer said:</span>
                  "{latestRound.customer_comments}"
                </div>
              )}
              <textarea rows={4}
                value={overallReply}
                onChange={e => setOverallReply(e.target.value)}
                placeholder="Write your overall reply to customer here — this shows at the top of their Round N review page..."
                className="w-full bg-[#0a1f0a] border border-green-500/20 text-green-100/80 font-jost text-[13px] outline-none px-4 py-3 focus:border-green-500/40 transition-colors placeholder:text-green-900/50 rounded-sm resize-none"
              />
            </div>

          </div>

          {/* Right: Summary */}
          <div className="xl:sticky xl:top-[88px] h-fit flex flex-col gap-4">
            <div className="border border-gold/30 bg-royal-mid p-6">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-5">Updated Quote Summary</span>
              <div className="mb-4 pb-4 border-b border-gold/10">
                <p className="text-cream text-[14px]">{enquiry?.customer_name}</p>
                <p className="text-cream/50 text-[12px]">{enquiry?.guest_count} guests</p>
                <p className="text-amber-400/70 text-[11px] mt-1">
                  Round {latestRound?.round_number} → Sending Round {(latestRound?.round_number || 1) + 1}
                </p>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-cream/50">Food subtotal</span><span className="text-cream">{fmt(subtotal)}</span></div>
                {discountCents > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>−{fmt(discountCents)}</span></div>}
                {deliveryCents > 0 && <div className="flex justify-between"><span className="text-cream/50">🚚 Delivery</span><span className="text-cream">{fmt(deliveryCents)}</span></div>}
                {setupCents > 0 && <div className="flex justify-between"><span className="text-cream/50">🏗️ Setup</span><span className="text-cream">{fmt(setupCents)}</span></div>}
                {serviceCents > 0 && <div className="flex justify-between"><span className="text-cream/50">👨‍🍳 Service</span><span className="text-cream">{fmt(serviceCents)}</span></div>}
                <div className="flex justify-between"><span className="text-cream/50">Tax (7%)</span><span className="text-cream">{fmt(taxCents)}</span></div>
                <div className="flex justify-between border-t border-gold/20 pt-3 mt-1">
                  <span className="font-italiana text-[20px] text-cream">Grand Total</span>
                  <span className="font-italiana text-[28px] text-gold">{fmt(totalCents)}</span>
                </div>
                {totalCents > 0 && (
                  <div className="mt-2 pt-2 border-t border-gold/10">
                    <div className="flex justify-between text-[12px] text-cream/50 mb-1"><span>20% Deposit</span><span>{fmt(depositCents)}</span></div>
                    <div className="flex justify-between text-[12px] text-cream/50"><span>Balance</span><span>{fmt(balanceCents)}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer comments summary */}
            {hasCustomerComments && (
              <div className="border border-yellow-500/20 bg-yellow-500/5 p-5">
                <span className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-yellow-400/70 block mb-3">
                  Customer Feedback Summary
                </span>
                <div className="flex flex-col gap-2">
                  {items.filter(i => i.customer_comment).map(i => (
                    <div key={i.id} className="text-[12px]">
                      <span className="text-cream/60 font-medium">{i.dish_name}:</span>{' '}
                      <span className="text-yellow-200/70 italic">{i.customer_comment}</span>
                      {i.admin_reply && <div className="text-green-300/60 text-[11px] mt-0.5">↳ {i.admin_reply}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending}
              className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-4 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center justify-center gap-2 w-full">
              <Send size={14} />
              {sending ? 'Sending...' : `Send Round ${(latestRound?.round_number || 1) + 1} to Customer`}
            </button>

            <Link href={`/admin/enquiries/${id}`}
              className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/20 text-gold/60 px-6 py-3 hover:bg-gold/5 transition-colors flex items-center justify-center gap-2 w-full text-center">
              ← Back Without Sending
            </Link>
          </div>
        </div>
      </div>

      {/* Menu Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}>
          <div className="bg-royal-mid border border-gold/30 w-[680px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gold/20">
              <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold block mb-3">Pick from Master Menu</span>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" />
                <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
                  className="w-full bg-royal border border-gold/20 text-cream font-jost text-[14px] pl-9 pr-4 py-2.5 outline-none focus:border-gold transition-colors placeholder:text-cream/20"
                  placeholder="Search dishes..." />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {Object.entries(byCategory).map(([cat, catItems]: any) => (
                <div key={cat} className="mb-4">
                  <div className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-gold/60 mb-2 px-2 pb-1 border-b border-gold/10">{cat}</div>
                  {catItems.map((dish: any) => (
                    <button key={dish.id} onClick={() => addFromMaster(dish)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gold/10 transition-colors border-b border-gold/5 last:border-b-0 text-left">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dish.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-cream text-[13px]">{dish.name}</span>
                      </div>
                      <div className="flex gap-3 text-[11px] text-cream/40">
                        {dish.has_tray && <span>M:{fmt(dish.medium_tray_cents)}</span>}
                        {dish.has_per_person && <span className="text-amber-400/70">👤 {fmt(dish.per_person_cents)}/pp</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gold/20 flex justify-end">
              <button onClick={() => setShowPicker(false)}
                className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/20 text-gold/60 px-4 py-2 hover:bg-gold/10 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
