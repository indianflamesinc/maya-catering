'use client'
// src/app/admin/enquiries/[id]/reply/page.tsx
// FIX-038 (Jun 16 2026): Redirect uses enquiry_id from API response not from URL
// FIX-073 (Jun 16 2026): Custom tray multiplier — dropdown not spinner in Reply Builder
// FIX-052 (Jun 16 2026): Tray multiplier as dropdown — only 1×, 1.5×, 1.75×, 2×
//   BEFORE: free number input allowed invalid values like 1.25, 1.375
//   AFTER:  dropdown with only valid Maya tray multiples
// FIX-053 (Jun 16 2026): Maya Note label fix — editable field now says 'Update Note'
//   BEFORE: both thread display and editable field said 'Maya Note' — confusing
//   AFTER:  thread = 'Maya Note' (read-only), edit field = 'Update Note'
// FIX-060 (Jun 16 2026): Success state shown after send instead of immediate redirect
//   BEFORE: router.push() fired immediately → admin saw no confirmation → clicked Send again
//   AFTER:  success page shown with round number, WhatsApp button, preview link, back button
//           Admin must explicitly click "Back to Enquiry" — prevents accidental double-send
//   BEFORE: used URL param [id] for redirect — wrong if token belongs to different enquiry
//   AFTER:  data.enquiry_id from send-reply API response used for redirect
// FIX-039 (Jun 16 2026): Price auto-updates when tray size changes
//   BEFORE: snapshot has no master_id so price lookup impossible
//   AFTER:  fetches master menu, matches by dish name, auto-updates price on tray_size change
// FIX-042 (Jun 16 2026): Reply Builder loads correctly when opened from email link
//   BEFORE: only searched by enquiry_id from URL param → failed when token's enquiry_id differs
//   AFTER:  also accepts ?token= query param; loads directly from token if provided
//           email's "Open Reply Builder" link now passes token so it always loads correctly
//   ALSO:   ReviewRoundsPanel email link updated to include token param

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
  notes_to_customer: string
  admin_reply: string
  thread: { round: number; customer_comment: string; admin_reply: string }[]
  customer_comment: string
  // FIX-039: store master menu prices for auto-lookup
  master_prices?: {
    half_tray_cents: number
    medium_tray_cents: number
    full_tray_cents: number
    per_person_cents: number
    per_piece_cents: number
  }
  // FIX-093 (Jun 18 2026): condiment support — same shape as TrayLineItem in
  // TrayItemsSection.tsx, so condiment rows survive the Round 1 → Round 2+ → Round 3+
  // journey without losing their qty/unit/visibility settings.
  is_condiment?: boolean
  parent_item_id?: string
  condiment_map_id?: string
  condiment_qty?: string
  condiment_unit?: string
  show_on_quote?: boolean
}

function calcTotal(item: DishItem): number {
  // FIX-093: condiment rows are included in the parent dish price — never charged separately
  if (item.is_condiment) return 0
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

const numInp = "bg-royal-mid border border-gold/20 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors w-full text-right"

// FIX-073 v5 (Jun 17 2026): TrayQtyInput — raw string state prevents mid-type resets
// e.g. typing "2.75": "2" → "2." → "2.7" → "2.75" all work without snapping back
function TrayQtyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => { setRaw(String(value)) }, [value])
  return (
    <div className="flex items-center gap-1 mt-1">
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder="e.g. 1.75"
        onChange={e => {
          const str = e.target.value
          // Allow typing in progress: digits, single dot, partial decimals
          if (/^\d*\.?\d*$/.test(str) || str === '') {
            setRaw(str)
            const n = parseFloat(str)
            if (!isNaN(n) && n > 0) onChange(n)
          }
        }}
        onBlur={() => {
          const n = parseFloat(raw)
          if (!isNaN(n) && n > 0) {
            setRaw(String(n))
            onChange(n)
          } else {
            setRaw('1')
            onChange(1)
          }
        }}
        style={{ width: 80 }}
        className="bg-royal-mid border border-gold/30 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm text-right"
      />
      <span className="text-cream/40 text-[10px]">×</span>
    </div>
  )
}

export default function ReplyBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  // FIX-042: token from email stored in state, read inside useEffect
  // BEFORE: read window.location.search at component level — null during SSR
  // AFTER:  read inside useEffect where window is always available
  const [tokenFromEmail, setTokenFromEmail] = useState<string | null>(null)

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
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null) // FIX-045
  // FIX-060 (Jun 16 2026): show success state instead of immediate redirect
  // BEFORE: router.push() immediately after send — admin didn't see confirmation
  //         If redirect was slow, admin clicked Send again → duplicate rounds
  // AFTER:  show success banner with WhatsApp button and "Back to Enquiry" link
  //         Admin clearly sees "Round N sent successfully" before navigating away
  const [sentSuccess, setSentSuccess] = useState<{ roundNumber: number; reviewUrl: string } | null>(null)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [masterMenu, setMasterMenu] = useState<any[]>([])
  const [masterMenuMap, setMasterMenuMap] = useState<Record<string, any>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    // FIX-042: read token from URL query string inside useEffect (window is available here)
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token') || null
    setTokenFromEmail(t)
    loadAll(t)
  }, [id])

  async function loadAll(emailToken?: string | null) {
    try {
      const eRes = await fetch(`/api/enquiries/${id}`)
      const eData = await eRes.json()
      setEnquiry(eData)

      const qRes = await fetch(`/api/quotes?enquiry_id=${id}`)
      const qData = await qRes.json()
      const quote = qData.quotes?.[0]
      if (quote) {
        if (quote.delivery_fee_cents) setDeliveryFee(String(quote.delivery_fee_cents / 100))
        if (quote.setup_fee_cents) setSetupFee(String(quote.setup_fee_cents / 100))
        if (quote.service_fee_cents) setServiceFee(String(quote.service_fee_cents / 100))
        if (quote.discount_type && quote.discount_type !== 'none') {
          setDiscountType(quote.discount_type)
          setDiscountValue(String(quote.discount_value || ''))
        }
      }

      // FIX-039: load master menu for price lookup by dish name
      const mRes = await fetch('/api/menu-master')
      const mData = await mRes.json()
      const menu = mData.items || []
      setMasterMenu(menu)
      // Build name→prices map (lowercase for matching)
      const menuMap: Record<string, any> = {}
      for (const dish of menu) {
        menuMap[dish.name?.toLowerCase()] = dish
      }
      setMasterMenuMap(menuMap)

      // FIX-042: if token provided (from email link), load that specific round directly
      // This handles the case where the token's enquiry_id differs from URL param
      // (can happen due to test data or manual DB edits)
      let latest: any = null
      let rounds: any[] = []

      // FIX-042: use emailToken param (passed from useEffect where window is available)
      if (emailToken) {
        // Load directly from token — most reliable path (email link)
        const tRes = await fetch(`/api/review/${emailToken}`)
        const tData = await tRes.json()
        if (tData && !tData.error && (tData.status === 'pending_maya' || tData.status === 'submitted')) {
          // Build a round object from the token data
          // Also load full round data from review-rounds using the token's enquiry_id
          const tokenEnquiryId = tData.enquiry?.id || id
          const rRes = await fetch(`/api/quotes/review-rounds?enquiry_id=${tokenEnquiryId}`)
          const rData = await rRes.json()
          rounds = rData.rounds || []
          const submitted = rounds.filter((r: any) => r.status === 'pending_maya' || r.status === 'submitted')
          latest = submitted[submitted.length - 1]
        }
      }

      // Fallback: search by enquiry_id from URL (normal path — Open Reply Builder button in CRM)
      if (!latest) {
        const rRes = await fetch(`/api/quotes/review-rounds?enquiry_id=${id}`)
        const rData = await rRes.json()
        rounds = rData.rounds || []
        const submitted = rounds.filter((r: any) => r.status === 'pending_maya' || r.status === 'submitted')
        latest = submitted[submitted.length - 1]
      }

      if (!latest) {
        setError('No customer response found. Customer may not have submitted their review yet.')
        setLoading(false)
        return
      }
      setLatestRound(latest)

      // Build thread history per dish from all previous rounds
      const threadMap: Record<string, any[]> = {}
      for (const round of rounds) {
        if (!round.customer_changes) continue
        const adminReplies: any[] = round.admin_replies || []
        for (const change of round.customer_changes) {
          if (!change.customer_comments?.trim()) continue
          const key = change.dish_name?.toLowerCase()
          if (!threadMap[key]) threadMap[key] = []
          const adminReply = adminReplies.find(r => r.dish_name?.toLowerCase() === key)
          threadMap[key].push({
            round: round.round_number,
            customer_comment: change.customer_comments,
            admin_reply: adminReply?.reply || '',
          })
        }
      }

      const snapshot = latest.sent_snapshot
      const trayItems = snapshot?.tray_items || []
      const customerCommentMap: Record<string, string> = {}
      for (const change of (latest.customer_changes || [])) {
        if (change.customer_comments?.trim()) {
          customerCommentMap[change.dish_name?.toLowerCase()] = change.customer_comments
        }
      }

      setItems(trayItems.map((item: any) => {
        const key = item.dish_name?.toLowerCase()
        const masterDish = menuMap[key]
        return {
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
          thread: threadMap[key] || [],
          customer_comment: customerCommentMap[key] || '',
          // FIX-039: attach master prices for tray size switching
          master_prices: masterDish ? {
            half_tray_cents: masterDish.half_tray_cents || 0,
            medium_tray_cents: masterDish.medium_tray_cents || 0,
            full_tray_cents: masterDish.full_tray_cents || 0,
            per_person_cents: masterDish.per_person_cents || 0,
            per_piece_cents: masterDish.per_piece_cents || 0,
          } : undefined,
          // FIX-093 (Jun 18 2026): carry condiment fields forward from the snapshot.
          // BEFORE: these fields didn't exist on this interface at all — condiment rows
          //         built in Round 1's TrayItemsSection would vanish the moment the quote
          //         entered Round 2+ editing in this Reply Builder.
          is_condiment: item.is_condiment || false,
          parent_item_id: item.parent_item_id || undefined,
          condiment_map_id: item.condiment_map_id || undefined,
          condiment_qty: item.condiment_qty || undefined,
          condiment_unit: item.condiment_unit || undefined,
          show_on_quote: item.show_on_quote !== false,
        }
      }))

    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  function updateItem(itemId: string, updates: Partial<DishItem>) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, ...updates }

      // FIX-039: auto-update price when tray_size changes (if master prices available)
      if (updates.tray_size !== undefined && item.master_prices) {
        const mp = item.master_prices
        if (updates.tray_size === 'half')   updated.unit_price_cents = mp.half_tray_cents || item.unit_price_cents
        if (updates.tray_size === 'medium') updated.unit_price_cents = mp.medium_tray_cents || item.unit_price_cents
        if (updates.tray_size === 'full')   updated.unit_price_cents = mp.full_tray_cents || item.unit_price_cents
        if (updates.tray_size === 'custom') updated.unit_price_cents = mp.full_tray_cents || item.unit_price_cents
      }

      return updated
    }))
  }

  function removeItem(itemId: string) {
    // FIX-093: removing a parent dish also removes its condiment children
    setItems(prev => prev.filter(item => item.id !== itemId && item.parent_item_id !== itemId))
  }

  function addBlank() {
    setItems(prev => [...prev, {
      id: uid(), dish_name: '', pricing_type: 'tray', tray_size: 'medium',
      tray_quantity: 1, unit_price_cents: 0, guest_count: enquiry?.guest_count || 100,
      piece_count: 1, notes_to_customer: '', admin_reply: '', thread: [], customer_comment: '',
    }])
  }

  // FIX-093 (Jun 18 2026): addFromMaster is now async — after adding the dish row,
  // it fetches that dish's condiments from menu_condiment_map and inserts them as
  // child rows immediately below it, same as the Round 1 Quote Builder behavior.
  async function addFromMaster(dish: any) {
    const pricing: PricingType = dish.has_tray ? 'tray' : dish.has_per_person ? 'per_person' : 'per_piece'
    const parentId = uid()

    const newRows: DishItem[] = [{
      id: parentId, dish_name: dish.name, pricing_type: pricing,
      tray_size: 'medium', tray_quantity: 1,
      unit_price_cents: dish.medium_tray_cents || dish.per_person_cents || dish.per_piece_cents || 0,
      guest_count: enquiry?.guest_count || 100,
      piece_count: 1, notes_to_customer: '', admin_reply: '', thread: [], customer_comment: '',
      master_prices: {
        half_tray_cents: dish.half_tray_cents || 0,
        medium_tray_cents: dish.medium_tray_cents || 0,
        full_tray_cents: dish.full_tray_cents || 0,
        per_person_cents: dish.per_person_cents || 0,
        per_piece_cents: dish.per_piece_cents || 0,
      },
    }]

    try {
      const res = await fetch(`/api/menu-condiment-map?menu_item_id=${dish.id}`)
      const mappings = await res.json()
      if (Array.isArray(mappings)) {
        for (const m of mappings) {
          const condimentName = Array.isArray(m.condiments) ? m.condiments[0]?.name : m.condiments?.name
          newRows.push({
            id: uid(),
            dish_name: condimentName || 'Condiment',
            pricing_type: 'tray',
            tray_quantity: 1,
            unit_price_cents: 0,
            guest_count: 0,
            piece_count: 0,
            notes_to_customer: '',
            admin_reply: '',
            thread: [],
            customer_comment: '',
            is_condiment: true,
            parent_item_id: parentId,
            condiment_map_id: m.id,
            condiment_qty: String(m.default_qty ?? 1),
            condiment_unit: m.default_unit || 'Oz',
            show_on_quote: !!m.show_on_quote,
          })
        }
      }
    } catch (e) {
      console.warn('Could not load condiments for', dish.name, e)
    }

    setItems(prev => [...prev, ...newRows])
    setShowPicker(false); setSearch('')
  }

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
            // FIX-093 (Jun 18 2026): condiment fields — were missing from this payload,
            // so send-reply's snapshot rebuild would silently drop condiment rows on
            // every Round 2+ save even though they survived the in-memory edit session.
            is_condiment: i.is_condiment || false,
            parent_item_id: i.parent_item_id || null,
            condiment_map_id: i.condiment_map_id || null,
            condiment_qty: i.condiment_qty || null,
            condiment_unit: i.condiment_unit || null,
            show_on_quote: i.show_on_quote !== false,
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

      // FIX-045 (Jun 16 2026): WhatsApp link not opening after async send
      // BEFORE: window.open() after await — browsers block popups from async callbacks
      // AFTER:  store WA URL in state → show clickable button after send completes
      if (data.whatsapp_message && enquiry?.customer_phone) {
        const phone = enquiry.customer_phone.replace(/\D/g, '')
        const waUrl = `https://wa.me/1${phone}?text=${encodeURIComponent(data.whatsapp_message)}`
        setWhatsAppUrl(waUrl)
      }

      // FIX-038: use enquiry_id from API response (guaranteed correct)
      const targetEnquiryId = data.enquiry_id || id
      router.push(`/admin/enquiries/${targetEnquiryId}`)
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

  // FIX-060: Success state — shown after send, prevents double-send
  if (sentSuccess) {
    const targetEnquiryId = id
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="max-w-lg w-full mx-8 flex flex-col gap-6">
          <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-italiana text-[32px] text-cream mb-2">
              Round {sentSuccess.roundNumber} Sent!
            </h2>
            <p className="text-cream/60 text-[13px] mb-6">
              Customer has been emailed their updated quote with your replies.
            </p>
            {whatsAppUrl && (
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white font-cinzel text-[8px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-green-500 transition-colors mb-4 rounded">
                📱 Send WhatsApp to Customer
              </a>
            )}
            <div className="mt-2">
              <a href={sentSuccess.reviewUrl} target="_blank" rel="noopener noreferrer"
                className="text-gold/60 text-[12px] hover:text-gold transition-colors block mb-4">
                👁 Preview customer Round {sentSuccess.roundNumber} link ↗
              </a>
              <a href={`/admin/enquiries/${targetEnquiryId}`}
                className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-6 py-3 hover:bg-gold/10 transition-colors inline-block">
                ← Back to Enquiry
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <p className="font-italiana text-[28px] text-cream/30">Loading reply builder...</p>
    </div>
  )

  if (error && !latestRound) return (
    <div className="min-h-screen bg-ink flex items-center justify-center flex-col gap-4">
      <p className="text-red-700 text-[14px]">{error}</p>
      <Link href={`/admin/enquiries/${id}`} className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-4 py-2">← Back</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-4 sticky top-0 z-30">
        <Link href={`/admin/enquiries/${id}`} className="text-gold/50 hover:text-gold transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">
            Reply Builder · Round {(latestRound?.round_number || 1) + 1}
          </span>
          <h1 className="font-italiana text-[28px] text-cream leading-none">
            {enquiry?.customer_name} — {enquiry?.event_date ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </h1>
        </div>
        <div className="border border-gold/20 px-5 py-3 bg-royal text-right">
          <span className="font-cinzel text-[7px] tracking-[0.3em] uppercase text-gold/60 block">Updated Total</span>
          <span className="font-italiana text-[32px] text-gold-hi leading-none">{fmt(totalCents)}</span>
        </div>
        <button onClick={handleSend} disabled={sending}
          className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-3 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center gap-2">
          <Send size={14} />{sending ? 'Sending...' : `Send Round ${(latestRound?.round_number || 1) + 1}`}
        </button>
        {/* FIX-045: WhatsApp button appears after send completes — avoids popup blocker */}
        {whatsAppUrl && (
          <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-green-600 text-white px-4 py-3 hover:bg-green-500 transition-colors flex items-center gap-2">
            📱 WhatsApp
          </a>
        )}
      </div>

      {error && <div className="mx-8 mt-4 border border-red-500/40 bg-red-500/10 px-5 py-3 text-red-700 text-[13px]">{error}</div>}

      {latestRound?.customer_comments && (
        <div className="mx-8 mt-4 border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
          <span className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-yellow-400/70 block mb-1">Overall Customer Comment (Round {latestRound.round_number})</span>
          <p className="text-yellow-200/80 text-[13px]">"{latestRound.customer_comments}"</p>
        </div>
      )}

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
          <div className="flex flex-col gap-4">

            <div className="border border-gold/20 bg-royal-mid px-5 py-4 flex items-start gap-3">
              <span className="text-gold text-lg">💡</span>
              <div>
                <p className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold mb-1">Reply Builder — Round {(latestRound?.round_number || 1) + 1}</p>
                <p className="text-cream/50 text-[12px] leading-relaxed">
                  Customer comments in <span className="text-yellow-300">yellow</span>. Type your reply in the green box.
                  Update qty/price/tray size as needed. <span className="text-gold/70">Prices auto-update when you change tray size.</span>
                </p>
              </div>
            </div>

            {items.map((item, idx) => {
              const lineTotal = calcTotal(item)
              const hasComment = !!item.customer_comment

              // FIX-093 (Jun 18 2026): condiment rows render as a compact strip — no
              // pricing controls, no thread/reply box, just qty/unit/visibility editing
              // and a remove button. Matches the pattern used in TrayItemsSection.tsx.
              if (item.is_condiment) {
                return (
                  <div key={item.id} className="ml-6 flex items-center gap-3 px-3 py-2 border border-gold/25 bg-royal-mid rounded-sm">
                    <span className="text-gold text-[12px] flex-shrink-0">↳</span>
                    <input value={item.dish_name}
                      onChange={e => updateItem(item.id, { dish_name: e.target.value })}
                      className="bg-transparent border-b border-gold/30 text-cream font-jost font-light text-[13px] outline-none focus:border-gold transition-colors flex-1"
                      placeholder="Condiment name..." />
                    <input value={item.condiment_qty || ''}
                      onChange={e => updateItem(item.id, { condiment_qty: e.target.value })}
                      className="bg-royal border border-gold/30 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-gold transition-colors w-14 text-center rounded-sm"
                      placeholder="Qty" />
                    <input value={item.condiment_unit || ''}
                      onChange={e => updateItem(item.id, { condiment_unit: e.target.value })}
                      className="bg-royal border border-gold/30 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-gold transition-colors w-20 rounded-sm"
                      placeholder="Unit" />
                    <button onClick={() => updateItem(item.id, { show_on_quote: !item.show_on_quote })}
                      title={item.show_on_quote ? 'Visible to customer — click to hide' : 'Kitchen-only — click to show on quote'}
                      className={`flex-shrink-0 font-cinzel text-[7px] tracking-[0.15em] uppercase px-2.5 py-1.5 border transition-colors ${
                        item.show_on_quote
                          ? 'border-green-600/50 text-green-700 bg-green-500/10'
                          : 'border-cream/25 text-cream/50 bg-transparent'
                      }`}>
                      {item.show_on_quote ? 'On Quote' : 'Kitchen Only'}
                    </button>
                    <span className="text-cream/50 text-[10px] flex-shrink-0">Included</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-500/60 hover:text-red-600 transition-colors flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              }

              return (
                <div key={item.id} className={`border rounded-sm overflow-hidden ${hasComment ? 'border-gold/50' : 'border-gold/20'}`}>
                  {/* Dish row */}
                  {/* FIX-099 (Jun 20 2026): bg-[#1a1200] (a hardcoded dark brown-black highlight
                      for dishes with customer comments) is invisible-equivalent on the white
                      theme — replaced with bg-gold/10, a token-based tint that scales correctly
                      regardless of which theme is active. */}
                  <div className={`px-5 py-4 ${hasComment ? 'bg-gold/10' : idx % 2 === 0 ? 'bg-royal' : 'bg-royal-mid'}`}>
                    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '2fr 120px 120px 110px 110px 28px' }}>
                      <div>
                        <input value={item.dish_name}
                          onChange={e => updateItem(item.id, { dish_name: e.target.value })}
                          className="bg-transparent border-b border-gold/20 text-cream font-jost font-semibold text-[15px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors w-full pb-1" />
                        <span className="text-[10px] text-gold/50 font-cinzel tracking-wider mt-0.5 block">
                          {getTrayLabel(item)} · {getQtyDisplay(item)} · {fmt(item.unit_price_cents)}/unit
                          {item.master_prices && <span className="text-green-700/90 ml-2">● prices from menu</span>}
                        </span>
                      </div>

                      {/* Pricing type */}
                      <select value={item.pricing_type}
                        onChange={e => updateItem(item.id, { pricing_type: e.target.value as PricingType })}
                        className="bg-royal-mid border border-gold/20 text-cream font-jost text-[11px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm">
                        {[
                          { v: 'tray', l: 'Per Tray' }, { v: 'per_person', l: 'Per Person' },
                          { v: 'per_piece', l: 'Per Piece' }, { v: 'per_gallon', l: 'Per Gallon' },
                          { v: 'per_portion', l: 'Per Portion' },
                        ].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                      </select>

                      {/* Size / Count */}
                      <div>
                        {item.pricing_type === 'tray' ? (
                          <select value={item.tray_size}
                            onChange={e => updateItem(item.id, { tray_size: e.target.value as TraySize })}
                            className="bg-royal-mid border border-gold/20 text-cream font-jost text-[11px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm w-full">
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
                          /* FIX-073 final v5 (Jun 17 2026): TrayQtyInput component
                             Uses local raw string state so "2." doesn't reset to "2" mid-type.
                             Only calls updateItem on blur OR when value is a valid number.
                             Allows: 1, 1.5, 1.75, 2, 2.5, 2.75, 5, 7.5, 10, 15 etc */
                          <TrayQtyInput
                            value={item.tray_quantity ?? 1}
                            onChange={v => updateItem(item.id, { tray_quantity: v })}
                          />
                        )}
                      </div>

                      {/* Unit price */}
                      <div>
                        <span className="text-cream/30 text-[9px] font-cinzel tracking-wider block mb-1">Unit Price $</span>
                        <input type="number" min="0" step="0.5"
                          value={item.unit_price_cents / 100}
                          onChange={e => updateItem(item.id, { unit_price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                          className={numInp} />
                        {/* FIX-039: show price hint from master menu */}
                        {item.master_prices && item.pricing_type === 'tray' && (
                          <div className="text-[9px] text-green-700/85 mt-0.5 text-right">
                            S:{fmt(item.master_prices.half_tray_cents)} M:{fmt(item.master_prices.medium_tray_cents)} F:{fmt(item.master_prices.full_tray_cents)}
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <span className="text-cream/30 text-[9px] font-cinzel tracking-wider block mb-1">Total</span>
                        <span className="font-italiana text-[20px] text-gold-hi">{fmt(lineTotal)}</span>
                      </div>

                      <button onClick={() => removeItem(item.id)} className="text-red-600/50 hover:text-red-700 transition-colors mt-3"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Thread */}
                  <div className="border-t border-gold/10 px-5 py-3 bg-[#050d1a] flex flex-col gap-2">
                    {item.notes_to_customer && (
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-cinzel tracking-wider text-gold/50 uppercase w-24 flex-shrink-0 mt-0.5">Maya Note</span>
                        <span className="text-cream/50 text-[12px] italic">{item.notes_to_customer}</span>
                      </div>
                    )}
                    {/* FIX-043 (Jun 16 2026): thread[] contains PREVIOUS rounds only
                         Current round customer comment shown separately as highlighted box
                         BEFORE: thread included current round → showed twice
                         AFTER:  thread = history only; current round shown once highlighted */}
                    {item.thread.map((t, ti) => (
                      <div key={ti}>
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-cinzel tracking-wider text-yellow-400/60 uppercase w-24 flex-shrink-0 mt-0.5">R{t.round} Customer</span>
                          <span className="text-yellow-200/70 text-[12px]">{t.customer_comment}</span>
                        </div>
                        {t.admin_reply && (
                          <div className="flex items-start gap-2 pl-4">
                            <span className="text-[9px] font-cinzel tracking-wider text-green-700/80 uppercase w-20 flex-shrink-0 mt-0.5">R{t.round} Maya</span>
                            <span className="text-green-200/70 text-[12px]">{t.admin_reply}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Current round customer comment — shown highlighted, separate from thread history */}
                    {item.customer_comment && !item.thread.some((t: any) => t.customer_comment === item.customer_comment) && (
                      <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2 mt-1">
                        <span className="text-[9px] font-cinzel tracking-wider text-yellow-400/80 uppercase w-24 flex-shrink-0 mt-0.5">R{latestRound?.round_number} Customer</span>
                        <span className="text-yellow-200/90 text-[12px] font-medium">{item.customer_comment}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 mt-1">
                      <span className="text-[9px] font-cinzel tracking-wider text-green-700/80 uppercase w-24 flex-shrink-0 mt-2">Your Reply</span>
                      <input value={item.admin_reply}
                        onChange={e => updateItem(item.id, { admin_reply: e.target.value })}
                        placeholder={item.customer_comment ? "Type your reply..." : "Add a note (optional)..."}
                        className="flex-1 bg-[#0a1f0a] border border-green-500/20 text-green-100/80 font-jost text-[12px] outline-none px-3 py-2 focus:border-green-500/40 transition-colors placeholder:text-green-900/60 rounded-sm" />
                    </div>
                    <div className="flex items-start gap-2 mt-0.5">
                      <span className="text-[9px] font-cinzel tracking-wider text-gold/40 uppercase w-24 flex-shrink-0 mt-2">Maya Note</span>
                      <input value={item.notes_to_customer}
                        onChange={e => updateItem(item.id, { notes_to_customer: e.target.value })}
                        placeholder="Update dish note..."
                        className="flex-1 bg-transparent border-b border-gold/10 text-cream/40 font-jost text-[12px] outline-none pb-1 focus:border-gold/30 transition-colors placeholder:text-cream/15" />
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowPicker(true)} className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-4 py-2.5 hover:bg-gold/10 transition-colors flex items-center gap-2"><Search size={13} /> Pick from Menu</button>
              <button onClick={addBlank} className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/20 text-gold/60 px-4 py-2.5 hover:bg-gold/5 transition-colors flex items-center gap-2"><Plus size={13} /> Add Custom Item</button>
            </div>

            {/* Fees */}
            <div className="border border-gold/20 bg-royal-mid p-7 mt-2">
              <div className="flex items-center gap-3 mb-5"><span className="text-lg">💰</span><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Fees & Adjustments</span></div>
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
                      <input type="number" min="0" step="50" value={f.val} onChange={e => f.set(e.target.value)}
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
                      <input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                        className="bg-royal border border-gold/20 text-cream font-italiana text-[22px] outline-none pl-8 pr-4 py-2 focus:border-gold transition-colors w-36" placeholder="0" />
                    </div>
                    {discountCents > 0 && <span className="text-green-700 text-[12px]">Saving {fmt(discountCents)}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Overall reply */}
            <div className="border border-green-500/20 bg-[#050d05] p-6">
              <label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-green-700/90 block mb-3">Your Overall Reply to Customer</label>
              {latestRound?.customer_comments && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-4 py-3 mb-3 text-[12px] text-yellow-200/80">
                  <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-yellow-400/60 block mb-1">Customer said:</span>
                  "{latestRound.customer_comments}"
                </div>
              )}
              <textarea rows={4} value={overallReply} onChange={e => setOverallReply(e.target.value)}
                placeholder="Write your overall reply to customer..."
                className="w-full bg-[#0a1f0a] border border-green-500/20 text-green-100/80 font-jost text-[13px] outline-none px-4 py-3 focus:border-green-500/40 transition-colors placeholder:text-green-900/50 rounded-sm resize-none" />
            </div>
          </div>

          {/* Right summary */}
          <div className="xl:sticky xl:top-[88px] h-fit flex flex-col gap-4">
            <div className="border border-gold/30 bg-royal-mid p-6">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-5">Updated Quote Summary</span>
              <div className="mb-4 pb-4 border-b border-gold/10">
                <p className="text-cream text-[14px]">{enquiry?.customer_name}</p>
                <p className="text-gold-hi text-[11px] mt-1">Round {latestRound?.round_number} → Sending Round {(latestRound?.round_number || 1) + 1}</p>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-cream/50">Food subtotal</span><span className="text-cream">{fmt(subtotal)}</span></div>
                {discountCents > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>−{fmt(discountCents)}</span></div>}
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
            {items.some(i => i.customer_comment) && (
              <div className="border border-yellow-500/20 bg-yellow-500/5 p-5">
                <span className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-yellow-400/70 block mb-3">Customer Feedback</span>
                <div className="flex flex-col gap-2">
                  {items.filter(i => i.customer_comment).map(i => (
                    <div key={i.id} className="text-[12px]">
                      <span className="text-cream/60 font-medium">{i.dish_name}:</span>{' '}
                      <span className="text-yellow-200/70 italic">{i.customer_comment}</span>
                      {i.admin_reply && <div className="text-green-700/85 text-[11px] mt-0.5">↳ {i.admin_reply}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending}
              className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-4 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center justify-center gap-2 w-full">
              <Send size={14} />{sending ? 'Sending...' : `Send Round ${(latestRound?.round_number || 1) + 1} to Customer`}
            </button>
            <Link href={`/admin/enquiries/${id}`}
              className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/20 text-gold/60 px-6 py-3 hover:bg-gold/5 transition-colors flex items-center justify-center gap-2 w-full text-center">
              ← Back Without Sending
            </Link>
          </div>
        </div>
      </div>

      {/* Menu Picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
          <div className="bg-royal-mid border border-gold/30 w-[680px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
                        {dish.has_tray && <span>S:{fmt(dish.half_tray_cents)} M:{fmt(dish.medium_tray_cents)} F:{fmt(dish.full_tray_cents)}</span>}
                        {dish.has_per_person && <span className="text-gold-hi">👤 {fmt(dish.per_person_cents)}/pp</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gold/20 flex justify-end">
              <button onClick={() => setShowPicker(false)} className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/20 text-gold/60 px-4 py-2 hover:bg-gold/10 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
