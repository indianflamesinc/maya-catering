'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, MessageSquare } from 'lucide-react'

type PricingType = 'tray' | 'per_person' | 'per_piece' | 'per_gallon' | 'per_portion'
type TraySize = 'half' | 'medium' | 'full' | 'custom'

export interface TrayLineItem {
  id: string
  dish_name: string
  pricing_type: PricingType
  tray_size?: TraySize
  tray_quantity?: number
  unit_price_cents: number
  guest_count?: number
  per_person_price_cents?: number
  piece_count?: number
  per_piece_price_cents?: number
  // FIX-026 (Jun 15 2026): renamed customer_comments → notes_to_customer
  // These notes appear in ALL quote emails (Round 1 and Round 2) in the dish table
  // Previously called 'customer_comments' but was never shown to customer — now it is
  notes_to_customer: string
  customer_feedback?: string
  master_id?: string
}

interface MasterMenuItem {
  id: string; name: string; category: string; is_veg: boolean
  half_tray_cents: number; medium_tray_cents: number; full_tray_cents: number
  per_person_cents: number; per_piece_cents: number
  has_tray: boolean; has_per_person: boolean; has_per_piece: boolean
}

const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)

const TRAY_SIZES: { value: TraySize; label: string; note: string }[] = [
  { value: 'half',   label: 'Small',     note: '1/2 tray' },
  { value: 'medium', label: 'Medium',    note: '3/4 tray' },
  { value: 'full',   label: 'Full Tray', note: '1 tray'   },
  { value: 'custom', label: 'Multiple',  note: '1.5× / 2× etc' },
]

const PRICING_TYPES: { value: PricingType; label: string; unit: string }[] = [
  { value: 'tray',        label: 'Per Tray',    unit: 'tray'     },
  { value: 'per_person',  label: 'Per Person',  unit: 'ppl'      },
  { value: 'per_piece',   label: 'Per Piece',   unit: 'pcs'      },
  { value: 'per_gallon',  label: 'Per Gallon',  unit: 'gal'      },
  { value: 'per_portion', label: 'Per Portion', unit: 'portions' },
]

const CAT_LABELS: Record<string, string> = {
  veg_appetizer: 'Veg Appetizers', nonveg_appetizer: 'Non-Veg Appetizers',
  chaat: 'Chaat & Live Stations', soup: 'Soup', wrap: 'Wraps',
  veg_curry: 'Veg Curries', nonveg_curry: 'Non-Veg Curries',
  rice: 'Rice & Biryani', bread: 'Breads', dessert: 'Desserts',
  south_indian: 'South Indian', drinks: 'Drinks', other: 'Other',
}

export function calcLineTotal(item: TrayLineItem): number {
  if (item.pricing_type === 'tray') {
    if (item.tray_size === 'custom') return Math.round((item.tray_quantity || 1) * (item.unit_price_cents || 0))
    return item.unit_price_cents || 0
  }
  if (item.pricing_type === 'per_person')  return (item.guest_count || 0) * (item.per_person_price_cents || 0)
  if (item.pricing_type === 'per_piece')   return (item.piece_count || 0) * (item.per_piece_price_cents || 0)
  if (item.pricing_type === 'per_gallon')  return (item.piece_count || 0) * (item.unit_price_cents || 0)
  if (item.pricing_type === 'per_portion') return (item.piece_count || 0) * (item.unit_price_cents || 0)
  return 0
}

function PriceInput({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  const [raw, setRaw] = useState(cents > 0 ? String(cents / 100) : '')
  useEffect(() => { setRaw(cents > 0 ? String(cents / 100) : '') }, [cents])
  return (
    <input type="text" inputMode="decimal" value={raw} placeholder="0.00"
      onChange={e => {
        const v = e.target.value
        if (/^[\d]*\.?[\d]*$/.test(v) || v === '') {
          setRaw(v)
          const n = parseFloat(v)
          if (!isNaN(n)) onChange(Math.round(n * 100))
          if (v === '' || v === '.') onChange(0)
        }
      }}
      onBlur={() => { const n = parseFloat(raw); setRaw(!isNaN(n) ? n.toFixed(2) : '') }}
      className="bg-[#0a1428] border border-gold/30 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors w-full text-right rounded-sm" />
  )
}

function QtyInput({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit: string }) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : '')
  useEffect(() => { setRaw(value > 0 ? String(value) : '') }, [value])
  return (
    <div className="flex items-center gap-1">
      <input type="text" inputMode="decimal" value={raw} placeholder="0"
        onChange={e => {
          const v = e.target.value
          if (/^[\d]*\.?[\d]*$/.test(v) || v === '') {
            setRaw(v)
            const n = parseFloat(v)
            if (!isNaN(n)) onChange(n)
          }
        }}
        onBlur={() => { const n = parseFloat(raw); setRaw(!isNaN(n) ? String(n) : '') }}
        className="bg-[#0a1428] border border-gold/30 text-cream font-jost text-[13px] outline-none px-2 py-1.5 focus:border-gold transition-colors w-full text-right rounded-sm" />
      <span className="text-cream/30 text-[10px] flex-shrink-0">{unit}</span>
    </div>
  )
}

interface Props {
  items: TrayLineItem[]
  onChange: (items: TrayLineItem[]) => void
  guestCount?: number
}

export default function TrayItemsSection({ items, onChange, guestCount = 50 }: Props) {
  const [masterMenu, setMasterMenu] = useState<MasterMenuItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/menu-master').then(r => r.json()).then(d => setMasterMenu(d.items || []))
  }, [])

  function addFromMaster(dish: MasterMenuItem) {
    const pricing: PricingType = dish.has_tray ? 'tray' : dish.has_per_person ? 'per_person' : 'per_piece'
    onChange([...items, {
      id: uid(), dish_name: dish.name, master_id: dish.id,
      pricing_type: pricing,
      tray_size: 'medium', tray_quantity: 1,
      unit_price_cents: dish.medium_tray_cents || 0,
      guest_count: guestCount,
      per_person_price_cents: dish.per_person_cents || 0,
      piece_count: 1,
      per_piece_price_cents: dish.per_piece_cents || 0,
      notes_to_customer: '',  // FIX-026: renamed from customer_comments
    }])
    setShowPicker(false); setSearch('')
  }

  function addBlank() {
    onChange([...items, {
      id: uid(), dish_name: '', pricing_type: 'tray',
      tray_size: 'medium', tray_quantity: 1, unit_price_cents: 0,
      guest_count: guestCount, per_person_price_cents: 0,
      piece_count: 1, per_piece_price_cents: 0,
      notes_to_customer: '',  // FIX-026
    }])
  }

  function updateItem(id: string, updates: Partial<TrayLineItem>) {
    onChange(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, ...updates }
      if (updates.tray_size && item.master_id) {
        const master = masterMenu.find(m => m.id === item.master_id)
        if (master) {
          if (updates.tray_size === 'half')   updated.unit_price_cents = master.half_tray_cents
          else if (updates.tray_size === 'medium') updated.unit_price_cents = master.medium_tray_cents
          else if (updates.tray_size === 'full' || updates.tray_size === 'custom') updated.unit_price_cents = master.full_tray_cents
        }
      }
      return updated
    }))
  }

  const subtotal = items.reduce((s, i) => s + calcLineTotal(i), 0)
  const filteredMenu = masterMenu.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
  const byCategory = filteredMenu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MasterMenuItem[]>)

  // FIX-026: added Notes to Customer column
  const colStyle = { gridTemplateColumns: '2fr 120px 180px 100px 100px 1fr 28px' }

  return (
    <div>
      {items.length > 0 && (
        <div className="grid gap-3 mb-2 px-2" style={colStyle}>
          {['Dish', 'Pricing', 'Size / Count', 'Qty/Multiplier', 'Unit Price', 'Notes to Customer', ''].map(h => (
            <span key={h} className="font-cinzel text-[7px] tracking-[0.18em] uppercase text-gold/50">{h}</span>
          ))}
        </div>
      )}

      {items.map((item, idx) => {
        const lineTotal = calcLineTotal(item)
        const isEven = idx % 2 === 0

        return (
          <div key={item.id} className="mb-1">
            <div
              className={`grid gap-3 items-center px-2 py-3 border border-gold/10 rounded-sm transition-colors hover:border-gold/25 ${isEven ? 'bg-[#071020]' : 'bg-[#090f1e]'}`}
              style={colStyle}>

              {/* Dish name */}
              <div>
                <input value={item.dish_name}
                  onChange={e => updateItem(item.id, { dish_name: e.target.value })}
                  className="bg-transparent border-b border-gold/20 text-cream font-jost font-light text-[14px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors w-full pb-1"
                  placeholder="Dish name..." />
                <span className={`text-[9px] mt-0.5 block font-cinzel tracking-wider ${
                  item.pricing_type === 'tray'       ? 'text-blue-400' :
                  item.pricing_type === 'per_person' ? 'text-amber-400' :
                  item.pricing_type === 'per_piece'  ? 'text-teal-400' :
                  item.pricing_type === 'per_gallon' ? 'text-purple-400' : 'text-pink-400'
                }`}>
                  {PRICING_TYPES.find(p => p.value === item.pricing_type)?.label}
                </span>
              </div>

              {/* Pricing type */}
              <select value={item.pricing_type}
                onChange={e => updateItem(item.id, { pricing_type: e.target.value as PricingType })}
                className="bg-[#0a1428] border border-gold/30 text-cream font-jost font-light text-[12px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm">
                {PRICING_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>

              {/* Size / Count */}
              {item.pricing_type === 'tray' ? (
                <select value={item.tray_size}
                  onChange={e => updateItem(item.id, { tray_size: e.target.value as TraySize })}
                  className="bg-[#0a1428] border border-gold/30 text-cream font-jost font-light text-[12px] outline-none px-2 py-1.5 focus:border-gold transition-colors rounded-sm">
                  {TRAY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label} ({s.note})</option>)}
                </select>
              ) : (
                <QtyInput
                  value={item.pricing_type === 'per_person' ? (item.guest_count || 0) : (item.piece_count || 0)}
                  onChange={v => {
                    if (item.pricing_type === 'per_person') updateItem(item.id, { guest_count: v })
                    else updateItem(item.id, { piece_count: v })
                  }}
                  unit={PRICING_TYPES.find(p => p.value === item.pricing_type)?.unit || ''}
                />
              )}

              {/* Qty / Multiplier */}
              {item.pricing_type === 'tray' && item.tray_size === 'custom' ? (
                <QtyInput value={item.tray_quantity || 1} onChange={v => updateItem(item.id, { tray_quantity: v })} unit="× full" />
              ) : (
                <div className="text-cream/20 text-[11px] flex items-center justify-center">—</div>
              )}

              {/* Unit price */}
              <PriceInput
                cents={
                  item.pricing_type === 'per_person' ? (item.per_person_price_cents || 0) :
                  item.pricing_type === 'per_piece'  ? (item.per_piece_price_cents  || 0) :
                  (item.unit_price_cents || 0)
                }
                onChange={c => {
                  if (item.pricing_type === 'per_person')     updateItem(item.id, { per_person_price_cents: c })
                  else if (item.pricing_type === 'per_piece') updateItem(item.id, { per_piece_price_cents: c })
                  else                                         updateItem(item.id, { unit_price_cents: c })
                }}
              />

              {/* FIX-026: Notes to Customer — shown in email */}
              <input value={item.notes_to_customer || ''}
                onChange={e => updateItem(item.id, { notes_to_customer: e.target.value })}
                className="bg-transparent border-b border-gold/15 text-cream/70 font-jost font-light text-[12px] outline-none placeholder:text-cream/15 focus:border-gold/40 transition-colors w-full pb-1"
                placeholder="e.g. comes with chutney, mild spicy..." />

              {/* Delete */}
              <button onClick={() => onChange(items.filter(i => i.id !== item.id))}
                className="text-red-400/30 hover:text-red-400 transition-colors flex items-center justify-center">
                <Trash2 size={13} />
              </button>

              {/* Line total */}
              <div className="col-span-7 flex items-center justify-between mt-0.5 pt-1.5 border-t border-gold/10">
                <span className="text-cream/25 text-[10px] font-cinzel tracking-wider">
                  {item.pricing_type === 'tray' && item.tray_size !== 'custom' && TRAY_SIZES.find(s => s.value === item.tray_size)?.label}
                  {item.pricing_type === 'tray' && item.tray_size === 'custom' && `${item.tray_quantity}× full tray × ${fmt(item.unit_price_cents)}`}
                  {item.pricing_type === 'per_person' && `${item.guest_count} people × ${fmt(item.per_person_price_cents || 0)}/pp`}
                  {item.pricing_type === 'per_piece'  && `${item.piece_count} pcs × ${fmt(item.per_piece_price_cents || 0)}/pc`}
                  {item.pricing_type === 'per_gallon' && `${item.piece_count} gal × ${fmt(item.unit_price_cents)}/gal`}
                  {item.pricing_type === 'per_portion' && `${item.piece_count} portions × ${fmt(item.unit_price_cents)}/portion`}
                </span>
                <span className="text-gold font-italiana text-[18px]">{fmt(lineTotal)}</span>
              </div>
            </div>

            {/* Customer feedback banner from review round */}
            {item.customer_feedback && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 border-t-0 rounded-b-sm">
                <MessageSquare size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-amber-300/80 text-[11px] italic">{item.customer_feedback}</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Subtotal */}
      {items.length > 0 && (
        <div className="flex justify-end mt-4 mb-4 pr-2 border-t border-gold/20 pt-3">
          <span className="text-cream/60 text-[13px]">
            Food Subtotal: <span className="text-gold-hi font-italiana text-[24px] ml-3">{fmt(subtotal)}</span>
          </span>
        </div>
      )}

      {/* Add buttons */}
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

      {/* Tray size reference */}
      <div className="mt-4 border border-gold/10 bg-royal/30 px-4 py-3 rounded-sm">
        <p className="font-cinzel text-[7px] tracking-[0.2em] uppercase text-gold/50 mb-1.5">Tray Size Reference</p>
        <p className="text-cream/30 text-[11px] leading-relaxed">
          <span className="text-cream/50">Small</span> = Half Tray (1/2) &nbsp;·&nbsp;
          <span className="text-cream/50">Medium</span> = 3/4 Tray &nbsp;·&nbsp;
          <span className="text-cream/50">Full Tray</span> = 1 Tray (Large) &nbsp;·&nbsp;
          <span className="text-cream/50">Multiple</span> = 1.5×, 1.75×, 2× etc. of Full Tray price
        </p>
        <p className="text-cream/20 text-[10px] mt-1">
          We interchangeably use: Small / Half Tray &nbsp;|&nbsp; Medium / ¾ Tray &nbsp;|&nbsp; Full / Large / 1 Tray
        </p>
      </div>

      {/* Menu picker */}
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
              {Object.entries(byCategory).map(([cat, catItems]) => (
                <div key={cat} className="mb-4">
                  <div className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-gold/60 mb-2 px-2 pb-1 border-b border-gold/10">
                    {CAT_LABELS[cat] || cat}
                  </div>
                  {catItems.map(dish => (
                    <button key={dish.id} onClick={() => addFromMaster(dish)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gold/10 transition-colors border-b border-gold/5 last:border-b-0 text-left">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dish.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-cream text-[13px]">{dish.name}</span>
                      </div>
                      <div className="flex gap-3 text-[11px] text-cream/40">
                        {dish.has_tray && dish.medium_tray_cents > 0 && <span>S:{fmt(dish.half_tray_cents)} M:{fmt(dish.medium_tray_cents)} F:{fmt(dish.full_tray_cents)}</span>}
                        {dish.has_per_person && dish.per_person_cents > 0 && <span className="text-amber-400/70">👤 {fmt(dish.per_person_cents)}/pp</span>}
                        {dish.has_per_piece && dish.per_piece_cents > 0 && <span className="text-teal-400/70">🔢 {fmt(dish.per_piece_cents)}/pc</span>}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gold/20 flex justify-between">
              <button onClick={() => { addBlank(); setShowPicker(false) }}
                className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase text-gold/50 hover:text-gold transition-colors flex items-center gap-1.5">
                <Plus size={12} /> Add custom item
              </button>
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
