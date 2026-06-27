'use client'
// src/app/admin/enquiries/[id]/quote/page.tsx
// FIX-005 (Jun 15 2026): all 3 fee fields restored when loading existing quote
//   BEFORE: only delivery fee loaded; setup and service reset to $0 on reload
//   AFTER:  delivery/setup/service all read from DB with old field name fallback
// FIX-010 (Jun 15 2026): tray_quantity read from DB for custom items
//   BEFORE: tray_quantity undefined → 'UNDEFINED× FULL TRAY' label in quote builder
//   AFTER:  tray_quantity explicitly read as item.tray_quantity || 1
// FIX-011 (Jun 15 2026): customer feedback loaded from review rounds into quote builder
//   BEFORE: admin had to cross-reference ReviewRoundsPanel to see customer comments per dish
//   AFTER:  amber banners per dish with customer comment from latest submitted review round
// FIX-025 (Jun 15 2026): removed auto per_person switch for wedding/engagement events
//   BEFORE: loadAll() auto-switched catering type to per_person for wedding events
//   AFTER:  always defaults to tray; admin switches manually if needed

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'
import { Enquiry, EVENT_TYPE_LABELS, EventType } from '@/types/crm'
import TrayItemsSection, { TrayLineItem, calcLineTotal } from '@/components/crm/TrayItemsSection'

type CateringType = 'tray' | 'per_person' | 'hybrid'
interface SessionDish { id: string; dish_name: string; is_live_station: boolean; is_passing: boolean; notes: string }
interface SessionCategory { id: string; category_name: string; price_per_person: number; dishes: SessionDish[] }
interface Session {
  id: string; session_name: string; guest_count: number
  use_overall_price: boolean; price_per_person: number
  categories: SessionCategory[]
  labour_staff: number; labour_rate: number; labour_note: string
}

const DEFAULT_CATS = ['Welcome / Beverages', 'Appetizers', 'Main Course', 'Desserts']
const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)
const inp = "bg-transparent border-b border-gold/20 text-cream font-jost font-light text-[14px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors w-full pb-2"
const numInp = "bg-royal border border-gold/20 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors w-full text-right"

export default function QuoteBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [existingVersion, setExistingVersion] = useState(0)
  const [cateringType, setCateringType] = useState<CateringType>('tray')
  const [changeNotes, setChangeNotes] = useState('')
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [discountNote, setDiscountNote] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [setupFee, setSetupFee] = useState('')
  const [serviceFee, setServiceFee] = useState('')
  const [trayItems, setTrayItems] = useState<TrayLineItem[]>([])
  const [sessions, setSessions] = useState<Session[]>([{
    id: uid(), session_name: 'Dinner', guest_count: 100,
    use_overall_price: false, price_per_person: 0,
    categories: DEFAULT_CATS.map(n => ({ id: uid(), category_name: n, price_per_person: 0, dishes: [] })),
    labour_staff: 0, labour_rate: 300, labour_note: '',
  }])

  useEffect(() => {
    async function loadAll() {
      try {
        const eRes = await fetch(`/api/enquiries/${id}`)
        const d = await eRes.json()
        const gc = d.guest_count || 100
        setEnquiry(d)
        setSessions(prev => prev.map((s, i) => i === 0 ? { ...s, guest_count: gc } : s))
        // FIX-025 (Jun 15 2026): removed auto per_person switch — always default to tray
        // Admin can manually switch catering type if needed
        setCateringType('tray')

        const qRes = await fetch(`/api/quotes?enquiry_id=${id}`)
        const qData = await qRes.json()

        if (qData.quotes?.length > 0) {
          const q = qData.quotes[0]
          setExistingVersion(q.version)
          setCateringType(q.catering_type || 'tray')
          if (q.discount_type) setDiscountType(q.discount_type)
          if (q.discount_value) setDiscountValue(String(q.discount_value))
          if (q.discount_note) setDiscountNote(q.discount_note)

          // FIX-005 (Jun 15 2026): restore all 3 fee fields from DB
          // Previously only delivery_cents was read; setup_cents / service_cents were ignored.
          // Also changed field names: API now saves delivery_fee_cents / setup_fee_cents / service_fee_cents.
          // We fall back to the old delivery_cents field for backwards compat with pre-FIX-005 quotes.
          const deliveryCents = q.delivery_fee_cents || q.delivery_cents || 0
          const setupCents    = q.setup_fee_cents    || q.setup_cents    || 0
          const serviceCents  = q.service_fee_cents  || q.service_cents  || 0
          if (deliveryCents) setDeliveryFee(String(deliveryCents / 100))
          if (setupCents)    setSetupFee(String(setupCents / 100))
          if (serviceCents)  setServiceFee(String(serviceCents / 100))
          // END FIX-005

          if (q.change_notes) setChangeNotes(q.change_notes)

          // FIX-011 (Jun 15 2026): load customer feedback from latest review round
          // so it shows as amber banners on each dish row in TrayItemsSection.
          // Fetch review rounds and find the most recent submitted one.
          let customerFeedbackMap: Record<string, string> = {}
          try {
            const rRes = await fetch(`/api/quotes/review-rounds?enquiry_id=${id}`)
            const rData = await rRes.json()
            const rounds = rData.rounds || []
            // Find latest submitted round
            const latestSubmitted = rounds.find((r: any) => r.status === 'submitted')
            if (latestSubmitted?.customer_changes) {
              // Build map: dish_name (lowercase) → comment
              for (const change of latestSubmitted.customer_changes) {
                if (change.customer_comments) {
                  customerFeedbackMap[change.dish_name?.toLowerCase()] = change.customer_comments
                }
              }
            }
          } catch(e) {
            // Non-fatal: if review rounds fail to load, just skip customer feedback
            console.warn('Could not load review rounds for customer feedback:', e)
          }
          // END FIX-011

          if (q.quote_tray_items?.length > 0) {
            setTrayItems(q.quote_tray_items.map((item: any) => {
              // FIX-010 (Jun 15 2026): tray_quantity was undefined for 'custom' items on load
              // because it wasn't being read from DB. This caused "UNDEFINED× FULL TRAY" label.
              // Fix: explicitly read tray_quantity from DB item.
              const trayQty = item.tray_quantity || 1

              return {
                // FIX-093 (Jun 18 2026): use the DB row's real id, not a fresh uid().
                // BEFORE: id: uid() generated a new random id every load, so condiment rows'
                //         parent_item_id (saved against the OLD id) could never match up with
                //         the freshly-generated parent id on reload — condiments would silently
                //         lose their link to the parent dish after any save/reload cycle.
                // AFTER:  id: item.id keeps the real DB id stable across loads.
                id: item.id,
                dish_name: item.dish_name,
                pricing_type: item.pricing_type || 'tray',
                tray_size: item.tray_size || 'medium',
                // FIX-010: use tray_quantity from DB, not undefined
                tray_quantity: trayQty,
                quantity: item.quantity || 1,
                unit_price_cents: item.unit_price_cents || 0,
                guest_count: item.guest_count || gc,
                per_person_price_cents: item.pricing_type === 'per_person' ? item.unit_price_cents : 0,
                // FIX-003: piece_count now saved to DB, read it back here
                piece_count: item.piece_count || 1,
                per_piece_price_cents: item.pricing_type === 'per_piece' ? item.unit_price_cents : 0,
                notes_to_customer: item.notes_to_customer || item.customer_comments || '',  // FIX-026
                customer_comments: item.customer_comments || '',
                // FIX-011: attach customer feedback per dish for display in TrayItemsSection
                customer_feedback: customerFeedbackMap[item.dish_name?.toLowerCase()] || undefined,
                // FIX-093: read condiment fields back from DB
                is_condiment: item.is_condiment || false,
                parent_item_id: item.parent_item_id || undefined,
                condiment_map_id: item.condiment_map_id || undefined,
                condiment_qty: item.condiment_qty || undefined,
                condiment_unit: item.condiment_unit || undefined,
                show_on_quote: item.show_on_quote !== false,
              }
            }))
          }

          if (q.quote_sessions?.length > 0) {
            setSessions(q.quote_sessions.map((sess: any) => ({
              id: uid(), session_name: sess.session_name, guest_count: sess.guest_count,
              use_overall_price: !!sess.price_per_person,
              price_per_person: sess.price_per_person ? sess.price_per_person / 100 : 0,
              categories: (sess.quote_session_categories || []).map((cat: any) => ({
                id: uid(), category_name: cat.category_name,
                price_per_person: (cat.price_per_person || 0) / 100,
                dishes: (cat.quote_session_dishes || []).map((dd: any) => ({
                  id: uid(), dish_name: dd.dish_name,
                  is_live_station: dd.is_live_station || false,
                  is_passing: dd.is_passing || false, notes: dd.notes || '',
                })),
              })),
              labour_staff: 0, labour_rate: 300, labour_note: '',
            })))
          }
        }
      } catch(e) { console.error('Load error:', e) }
      setLoading(false)
    }
    loadAll()
  }, [id])

  const calcSessionTotal = (s: Session) =>
    s.use_overall_price ? s.guest_count * Math.round(s.price_per_person * 100)
    : s.categories.reduce((sum, c) => sum + s.guest_count * Math.round(c.price_per_person * 100), 0)
  const calcSessionLabour = (s: Session) => s.labour_staff * Math.round(s.labour_rate * 100)
  const calcSubtotal = () => cateringType === 'tray'
    ? trayItems.reduce((s, i) => s + calcLineTotal(i), 0)
    : sessions.reduce((s, sess) => s + calcSessionTotal(sess), 0)
  const calcLabour = () => cateringType !== 'tray' ? sessions.reduce((s, sess) => s + calcSessionLabour(sess), 0) : 0
  const calcDiscount = (sub: number) => { if (discountType === 'none') return 0; const v = parseFloat(discountValue) || 0; return discountType === 'percent' ? Math.round(sub * v / 100) : Math.round(v * 100) }
  const calcFees = () => Math.round((parseFloat(deliveryFee)||0)*100) + Math.round((parseFloat(setupFee)||0)*100) + Math.round((parseFloat(serviceFee)||0)*100)

  const sub = calcSubtotal(); const labour = calcLabour(); const disc = calcDiscount(sub)
  const tax = Math.round((sub - disc) * 0.07); const fees = calcFees(); const total = sub + labour - disc + tax + fees

  function addSession() {
    setSessions(prev => [...prev, { id: uid(), session_name: '', guest_count: enquiry?.guest_count || 100, use_overall_price: false, price_per_person: 0, categories: DEFAULT_CATS.map(n => ({ id: uid(), category_name: n, price_per_person: 0, dishes: [] })), labour_staff: 0, labour_rate: 300, labour_note: '' }])
  }
  function updateSession(sid: string, field: keyof Session, value: any) { setSessions(prev => prev.map(s => s.id === sid ? { ...s, [field]: value } : s)) }
  function updateCategory(sessId: string, catId: string, field: keyof SessionCategory, value: any) { setSessions(prev => prev.map(s => s.id !== sessId ? s : { ...s, categories: s.categories.map(c => c.id === catId ? { ...c, [field]: value } : c) })) }
  function addDishToCategory(sessId: string, catId: string) { setSessions(prev => prev.map(s => s.id !== sessId ? s : { ...s, categories: s.categories.map(c => c.id !== catId ? c : { ...c, dishes: [...c.dishes, { id: uid(), dish_name: '', is_live_station: false, is_passing: false, notes: '' }] }) })) }
  function updateDish(sessId: string, catId: string, dishId: string, field: string, value: any) { setSessions(prev => prev.map(s => s.id !== sessId ? s : { ...s, categories: s.categories.map(c => c.id !== catId ? c : { ...c, dishes: c.dishes.map(d => d.id !== dishId ? d : { ...d, [field]: value }) }) })) }
  function removeDish(sessId: string, catId: string, dishId: string) { setSessions(prev => prev.map(s => s.id !== sessId ? s : { ...s, categories: s.categories.map(c => c.id !== catId ? c : { ...c, dishes: c.dishes.filter(d => d.id !== dishId) }) })) }
  function addCategory(sessId: string) { setSessions(prev => prev.map(s => s.id !== sessId ? s : { ...s, categories: [...s.categories, { id: uid(), category_name: '', price_per_person: 0, dishes: [] }] })) }

  async function handleSave(sendToCustomer = false) {
    setSaving(true); setError('')
    try {
      const deliveryCents = Math.round((parseFloat(deliveryFee)||0)*100)
      const setupCents    = Math.round((parseFloat(setupFee)||0)*100)
      const serviceCents  = Math.round((parseFloat(serviceFee)||0)*100)

      // FIX-005 (Jun 15 2026): send all fee fields with BOTH old and new field names
      // for backwards compatibility. API route now reads delivery_fee_cents etc.
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiry_id: id,
          catering_type: cateringType,
          subtotal_cents: sub,
          labour_cents: labour,
          discount_type: discountType === 'none' ? null : discountType,
          discount_value: discountType === 'none' ? 0 : Math.round(parseFloat(discountValue)||0),
          discount_amount_cents: disc,
          discount_cents: disc,           // FIX-005: new field for snapshot
          discount_note: discountNote||null,
          tax_rate: 7,
          tax_cents: tax,
          // Old field names (keep for backwards compat)
          delivery_cents: deliveryCents,
          setup_cents: setupCents,
          service_cents: serviceCents,
          // FIX-005: new field names saved to DB columns
          delivery_fee_cents: deliveryCents,
          setup_fee_cents: setupCents,
          service_fee_cents: serviceCents,
          total_cents: total,
          change_notes: changeNotes||null,
          status: sendToCustomer ? 'sent' : 'draft',
          sessions: cateringType !== 'tray' ? sessions : [],
          tray_items: cateringType === 'tray' ? trayItems : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true); setExistingVersion(data.version); setTimeout(() => setSaved(false), 3000)
      if (sendToCustomer) router.push(`/admin/enquiries/${id}`)
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-paper flex items-center justify-center"><p className="font-italiana text-[28px] text-cream/30">Loading quote...</p></div>

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-4 sticky top-0 z-30">
        <Link href={`/admin/enquiries/${id}`} className="text-gold/50 hover:text-gold transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">Quote Builder {existingVersion > 0 && `· v${existingVersion}`}</span>
          <h1 className="font-italiana text-[28px] text-cream leading-none">{enquiry?.customer_name} — {enquiry?.event_date ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</h1>
        </div>
        <div className="border border-gold/20 px-5 py-3 bg-royal text-right">
          <span className="font-cinzel text-[7px] tracking-[0.3em] uppercase text-gold/60 block">Grand Total</span>
          <span className="font-italiana text-[32px] text-gold-hi leading-none">{fmt(total)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={saving} className="font-cinzel text-[8px] tracking-[0.22em] uppercase border border-gold/30 text-gold px-5 py-3 hover:bg-gold/10 transition-colors disabled:opacity-40 flex items-center gap-2"><Save size={14} />{saving ? 'Saving...' : 'Save Draft'}</button>
          <button onClick={() => handleSave(true)} disabled={saving} className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-3 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center gap-2"><Send size={14} />Send to Customer</button>
        </div>
      </div>

      {error && <div className="mx-8 mt-4 border border-red-500/40 bg-red-500/10 px-5 py-3 text-red-700 text-[13px]">{error}</div>}
      {saved && <div className="mx-8 mt-4 border border-green-500/40 bg-green-500/10 px-5 py-3 text-green-700 text-[13px]">✅ Quote saved as version {existingVersion}!</div>}

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
          <div className="flex flex-col gap-6">

            {/* Step 1: Catering Type */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-5"><span className="text-lg">1️⃣</span><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Catering Type</span></div>
              <div className="grid grid-cols-3 gap-3">
                {[{v:'tray' as CateringType,label:'Tray Order',desc:'Home parties · Small events',icon:'🥘'},{v:'per_person' as CateringType,label:'Per Person',desc:'Weddings · Large events',icon:'💍'},{v:'hybrid' as CateringType,label:'Hybrid / Custom',desc:'Mix of both',icon:'🔀'}].map(opt => (
                  <button key={opt.v} onClick={() => setCateringType(opt.v)} className={`p-5 border text-left transition-all ${cateringType === opt.v ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold/40'}`}>
                    <span className="text-2xl block mb-2">{opt.icon}</span>
                    <span className="font-cinzel text-[9px] tracking-[0.2em] uppercase text-gold block mb-1">{opt.label}</span>
                    <span className="text-cream/50 text-[11px]">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2a: Tray Items */}
            {(cateringType === 'tray' || cateringType === 'hybrid') && (
              <div className="border border-gold/20 bg-royal-mid p-7">
                <div className="flex items-center gap-3 mb-5"><span className="text-lg">🥘</span><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Tray Items</span></div>
                <TrayItemsSection items={trayItems} onChange={setTrayItems} guestCount={enquiry?.guest_count || 50} />
              </div>
            )}

            {/* Step 2b: Per Person Sessions */}
            {(cateringType === 'per_person' || cateringType === 'hybrid') && (
              <div className="flex flex-col gap-4">
                {sessions.map((sess, si) => (
                  <div key={sess.id} className="border border-gold/20 bg-royal-mid p-7">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold">Session {si + 1}</span>
                      <input value={sess.session_name} onChange={e => updateSession(sess.id, 'session_name', e.target.value)} className="bg-transparent border-b border-gold/30 text-cream font-italiana text-[22px] outline-none focus:border-gold transition-colors flex-1" placeholder="e.g. Baraat · Lunch · Dinner · Reception" />
                      {sessions.length > 1 && <button onClick={() => setSessions(prev => prev.filter(s => s.id !== sess.id))} className="text-red-600/60 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-5 mb-6">
                      <div><label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-2">Guest Count</label><input type="number" min="1" value={sess.guest_count} onChange={e => updateSession(sess.id, 'guest_count', parseInt(e.target.value)||0)} className={inp} /></div>
                      <div><label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-2">Pricing Mode</label>
                        <div className="flex gap-2">
                          {[{v:false,l:'By Category'},{v:true,l:'Overall $/person'}].map(opt => (
                            <button key={String(opt.v)} onClick={() => updateSession(sess.id, 'use_overall_price', opt.v)} className={`flex-1 font-cinzel text-[7.5px] tracking-[0.15em] uppercase py-2 border transition-all ${sess.use_overall_price === opt.v ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>{opt.l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {sess.use_overall_price && (
                      <div className="border border-gold/10 bg-royal p-4 mb-6 flex items-center gap-4">
                        <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60">Price per person ($)</label>
                        <input type="number" min="0" step="0.5" value={sess.price_per_person||''} onChange={e => updateSession(sess.id, 'price_per_person', parseFloat(e.target.value)||0)} className="bg-transparent border-b border-gold/30 text-cream font-italiana text-[24px] outline-none focus:border-gold transition-colors w-28 text-right" placeholder="0.00" />
                        <span className="text-cream/50 text-[13px]">× {sess.guest_count} = <strong className="text-gold-hi">{fmt(sess.guest_count * Math.round(sess.price_per_person * 100))}</strong></span>
                      </div>
                    )}
                    {!sess.use_overall_price && (
                      <div className="flex flex-col gap-4 mb-6">
                        {sess.categories.map(cat => (
                          <div key={cat.id} className="border border-gold/10 bg-royal p-5">
                            <div className="flex items-center gap-4 mb-4">
                              <input value={cat.category_name} onChange={e => updateCategory(sess.id, cat.id, 'category_name', e.target.value)} className="bg-transparent border-b border-gold/20 text-cream font-cinzel text-[9px] tracking-[0.25em] uppercase outline-none focus:border-gold transition-colors flex-1" placeholder="Category name" />
                              <div className="flex items-center gap-2">
                                <span className="text-cream/40 text-[12px]">$</span>
                                <input type="number" min="0" step="0.5" value={cat.price_per_person||''} onChange={e => updateCategory(sess.id, cat.id, 'price_per_person', parseFloat(e.target.value)||0)} className="bg-transparent border-b border-gold/30 text-gold-hi font-italiana text-[20px] outline-none focus:border-gold transition-colors w-20 text-right" placeholder="0" />
                                <span className="text-cream/40 text-[11px]">/person</span>
                              </div>
                              <span className="text-cream/50 text-[12px] min-w-[80px] text-right">{fmt(sess.guest_count * Math.round(cat.price_per_person * 100))}</span>
                            </div>
                            {cat.dishes.map(dish => (
                              <div key={dish.id} className="flex items-center gap-3 mb-2 pl-3 border-l border-gold/10">
                                <input value={dish.dish_name} onChange={e => updateDish(sess.id, cat.id, dish.id, 'dish_name', e.target.value)} className="bg-transparent border-b border-gold/10 text-cream/80 font-jost text-[13px] outline-none focus:border-gold/30 flex-1" placeholder="Dish name..." />
                                <label className="flex items-center gap-1 text-[11px] text-cream/40 cursor-pointer"><input type="checkbox" checked={dish.is_live_station} onChange={e => updateDish(sess.id, cat.id, dish.id, 'is_live_station', e.target.checked)} className="accent-yellow-500" />Live</label>
                                <label className="flex items-center gap-1 text-[11px] text-cream/40 cursor-pointer"><input type="checkbox" checked={dish.is_passing} onChange={e => updateDish(sess.id, cat.id, dish.id, 'is_passing', e.target.checked)} className="accent-yellow-500" />Passing</label>
                                <input value={dish.notes} onChange={e => updateDish(sess.id, cat.id, dish.id, 'notes', e.target.value)} className="bg-transparent border-b border-gold/10 text-cream/40 font-jost text-[11px] outline-none focus:border-gold/30 w-32" placeholder="Notes..." />
                                <button onClick={() => removeDish(sess.id, cat.id, dish.id)} className="text-red-600/50 hover:text-red-700 transition-colors"><Trash2 size={12} /></button>
                              </div>
                            ))}
                            <button onClick={() => addDishToCategory(sess.id, cat.id)} className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/40 hover:text-gold transition-colors flex items-center gap-1 mt-2 pl-3"><Plus size={11} /> Add dish</button>
                          </div>
                        ))}
                        <button onClick={() => addCategory(sess.id)} className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/20 text-gold/60 px-3 py-2 hover:border-gold/40 hover:text-gold transition-colors flex items-center gap-1.5"><Plus size={12} /> Add Category</button>
                      </div>
                    )}
                    <div className="border-t border-gold/10 pt-4 flex justify-between items-center mb-5">
                      <span className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold/60">Session Food Total</span>
                      <span className="font-italiana text-[24px] text-gold-hi">{fmt(calcSessionTotal(sess))}</span>
                    </div>
                    <div className="bg-royal border border-gold/10 p-4">
                      <span className="font-cinzel text-[8px] tracking-[0.22em] uppercase text-gold/60 block mb-3">Labour</span>
                      <div className="grid grid-cols-[100px_120px_1fr] gap-4 items-end">
                        <div><label className="text-[10px] text-cream/40 block mb-1">No. of staff</label><input type="number" min="0" value={sess.labour_staff||''} onChange={e => updateSession(sess.id, 'labour_staff', parseInt(e.target.value)||0)} className={numInp} placeholder="0" /></div>
                        <div><label className="text-[10px] text-cream/40 block mb-1">Rate per person ($)</label><input type="number" min="0" step="50" value={sess.labour_rate||''} onChange={e => updateSession(sess.id, 'labour_rate', parseFloat(e.target.value)||0)} className={numInp} placeholder="300" /></div>
                        <div><label className="text-[10px] text-cream/40 block mb-1">Note</label><input value={sess.labour_note} onChange={e => updateSession(sess.id, 'labour_note', e.target.value)} className={inp+' text-[13px]'} placeholder="Excluding Kannan & Bala..." /></div>
                      </div>
                      {sess.labour_staff > 0 && <p className="text-cream/50 text-[12px] mt-2">{sess.labour_staff} staff × ${sess.labour_rate} = <strong className="text-gold">{fmt(calcSessionLabour(sess))}</strong></p>}
                    </div>
                  </div>
                ))}
                <button onClick={addSession} className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-dashed border-gold/30 text-gold px-5 py-4 hover:border-gold/60 hover:bg-gold/5 transition-all w-full flex items-center justify-center gap-2"><Plus size={14} /> Add Another Session (Baraat / Lunch / Dinner etc.)</button>
              </div>
            )}

            {/* Step 3: Fees & Adjustments */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-5"><span className="text-lg">3️⃣</span><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Fees & Adjustments</span></div>
              <div className="grid grid-cols-3 gap-5 mb-6">
                {[{label:'Delivery Fee ($)',val:deliveryFee,set:setDeliveryFee,icon:'🚚'},{label:'Setup Fee ($)',val:setupFee,set:setSetupFee,icon:'🏗️'},{label:'Service Fee ($)',val:serviceFee,set:setServiceFee,icon:'👨‍🍳'}].map(f => (
                  <div key={f.label} className="border border-gold/10 bg-royal p-4">
                    <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-2">{f.icon} {f.label}</label>
                    <div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-cream/40">$</span><input type="number" min="0" step="50" value={f.val} onChange={e => f.set(e.target.value)} className="bg-transparent border-b border-gold/20 text-cream font-italiana text-[22px] outline-none pl-5 focus:border-gold transition-colors w-full" placeholder="0" /></div>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-3">Discount</label>
                <div className="flex gap-2 mb-3">
                  {(['none','percent','fixed'] as const).map(t => (
                    <button key={t} onClick={() => setDiscountType(t)} className={`font-cinzel text-[7.5px] tracking-[0.15em] uppercase px-3 py-2 border transition-all ${discountType === t ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>{t === 'none' ? 'None' : t === 'percent' ? '% Off' : '$ Fixed'}</button>
                  ))}
                </div>
                {discountType !== 'none' && (
                  <div className="flex gap-4 items-end">
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">{discountType === 'percent' ? '%' : '$'}</span><input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="bg-royal border border-gold/20 text-cream font-italiana text-[22px] outline-none pl-8 pr-4 py-2 focus:border-gold transition-colors w-36" placeholder="0" /></div>
                    <input value={discountNote} onChange={e => setDiscountNote(e.target.value)} className={inp+' text-[13px]'} placeholder="Reason for discount..." />
                    {disc > 0 && <span className="text-green-700 text-[12px] flex-shrink-0">Saving {fmt(disc)}</span>}
                  </div>
                )}
              </div>
              <div><label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-2">Version Notes</label><input value={changeNotes} onChange={e => setChangeNotes(e.target.value)} className={inp+' text-[13px]'} placeholder="e.g. Removed Cheese Platter, added Chicken Tikka..." /></div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="xl:sticky xl:top-[88px] h-fit flex flex-col gap-4">
            <div className="border border-gold/30 bg-royal-mid p-6">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-5">Quote Summary</span>
              <div className="mb-5 pb-5 border-b border-gold/10">
                <p className="text-cream text-[14px]">{enquiry?.customer_name}</p>
                <p className="text-cream/50 text-[12px]">{enquiry?.event_type ? EVENT_TYPE_LABELS[enquiry.event_type as EventType] : ''}</p>
                <p className="text-cream/50 text-[12px]">{enquiry?.guest_count} guests · {enquiry?.venue_name || 'Venue TBD'}</p>
                {existingVersion > 0 && <p className="text-gold/60 text-[11px] mt-1">Loaded: Version {existingVersion}</p>}
              </div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                <div className="flex justify-between"><span className="text-cream/50">Food subtotal</span><span className="text-cream">{fmt(sub)}</span></div>
                {/* FIX-007 (Jun 15 2026): hide Labour row when $0 — was showing $0.00 cluttering summary */}
                {labour > 0 && <div className="flex justify-between"><span className="text-cream/50">Labour</span><span className="text-cream">{fmt(labour)}</span></div>}
                {disc > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>−{fmt(disc)}</span></div>}
                {parseFloat(deliveryFee) > 0 && <div className="flex justify-between"><span className="text-cream/50">🚚 Delivery</span><span className="text-cream">{fmt(Math.round(parseFloat(deliveryFee)*100))}</span></div>}
                {parseFloat(setupFee) > 0 && <div className="flex justify-between"><span className="text-cream/50">🏗️ Setup</span><span className="text-cream">{fmt(Math.round(parseFloat(setupFee)*100))}</span></div>}
                {parseFloat(serviceFee) > 0 && <div className="flex justify-between"><span className="text-cream/50">👨‍🍳 Service</span><span className="text-cream">{fmt(Math.round(parseFloat(serviceFee)*100))}</span></div>}
                <div className="flex justify-between"><span className="text-cream/50">Tax (7%)</span><span className="text-cream">{fmt(tax)}</span></div>
                <div className="flex justify-between border-t border-gold/20 pt-3 mt-1">
                  <span className="font-italiana text-[20px] text-cream">Grand Total</span>
                  <span className="font-italiana text-[28px] text-gold">{fmt(total)}</span>
                </div>
              </div>
              {total > 0 && (
                <div className="mt-4 pt-4 border-t border-gold/10">
                  <div className="flex justify-between text-[12px] text-cream/50 mb-1"><span>20% Deposit</span><span>{fmt(Math.round(total*0.2))}</span></div>
                  <div className="flex justify-between text-[12px] text-cream/50"><span>Balance (3 days before)</span><span>{fmt(total-Math.round(total*0.2))}</span></div>
                </div>
              )}
            </div>
            {cateringType !== 'tray' && sessions.map(s => (
              <div key={s.id} className="border border-gold/15 bg-royal p-4 text-[12px]">
                <div className="flex justify-between mb-2"><span className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase text-gold">{s.session_name||'Session'}</span><span className="text-gold-hi font-italiana text-[16px]">{fmt(calcSessionTotal(s))}</span></div>
                {!s.use_overall_price && s.categories.filter(c => c.price_per_person > 0).map(c => (<div key={c.id} className="flex justify-between text-cream/40 mb-0.5"><span>{c.category_name}</span><span>${c.price_per_person}/pp × {s.guest_count}</span></div>))}
                {s.labour_staff > 0 && <div className="flex justify-between text-cream/40 mt-1 pt-1 border-t border-gold/10"><span>Labour ({s.labour_staff} × ${s.labour_rate})</span><span>{fmt(calcSessionLabour(s))}</span></div>}
              </div>
            ))}
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-ghost w-full text-center flex items-center justify-center gap-2"><Save size={14} />{saving ? 'Saving...' : 'Save Draft'}</button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-royal w-full text-center flex items-center justify-center gap-2"><Send size={14} />Send Quote to Customer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
