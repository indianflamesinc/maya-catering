'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ArrowLeft, Edit2, Check, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

interface MenuItem {
  id: string; name: string; category: string; cuisine_region: string
  is_veg: boolean; is_active: boolean
  half_tray_cents: number; medium_tray_cents: number; full_tray_cents: number
  per_person_cents: number; per_piece_cents: number
  has_tray: boolean; has_per_person: boolean; has_per_piece: boolean
  notes: string; sort_order: number
}

// ── Condiment types (FIX-091) ─────────────────────────────────────────────────
interface Condiment {
  id: string; name: string; is_active: boolean; sort_order: number
}
interface CondimentMap {
  id: string; menu_item_id: string; condiment_id: string
  default_qty: number; default_unit: string
  show_on_quote: boolean; is_mandatory: boolean; sort_order: number
  condiments: { id: string; name: string } | { id: string; name: string }[]
}

const INITIAL_CAT_OPTIONS = [
  { value: 'soup',            label: 'Soup' },
  { value: 'chaat',           label: 'Chaat & Live Stations' },
  { value: 'wrap',            label: 'Wraps & Rolls' },
  { value: 'south_indian',    label: 'South Indian' },
  { value: 'veg_appetizer',   label: 'Veg Appetizers' },
  { value: 'nonveg_appetizer',label: 'Non-Veg Appetizers' },
  { value: 'veg_curry',       label: 'Veg Curries' },
  { value: 'nonveg_curry',    label: 'Non-Veg Curries' },
  { value: 'rice',            label: 'Rice & Biryani' },
  { value: 'bread',           label: 'Breads' },
  { value: 'dessert',         label: 'Desserts' },
  { value: 'drinks',          label: 'Drinks & Beverages' },
  { value: 'other',           label: 'Other' },
]

const EMPTY = {
  name: '', category: 'veg_appetizer', cuisine_region: 'North Indian',
  is_veg: true, is_active: true,
  half_tray_cents: 0, medium_tray_cents: 0, full_tray_cents: 0,
  per_person_cents: 0, per_piece_cents: 0,
  has_tray: true, has_per_person: false, has_per_piece: false,
  notes: '', sort_order: 0,
}

const fmt = (c: number) => (c / 100).toFixed(2)

// ── Fixed price input ──────────────────────────────────────
function PriceField({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  const [raw, setRaw] = React.useState(cents > 0 ? String(cents / 100) : '')
  React.useEffect(() => { setRaw(cents > 0 ? String(cents / 100) : '') }, [cents])
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
      className="bg-royal border border-gold/20 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-gold transition-colors w-full text-right" />
  )
}

// ── Condiment unit input: standard dropdown + custom free text (FIX-091) ──────
const STANDARD_UNITS = ['Oz', 'Gallon', 'Tray', 'Piece']
function UnitInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = !STANDARD_UNITS.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)
  const [customVal, setCustomVal] = useState(isCustom ? value : '')

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__custom__') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      setCustomVal('')
      onChange(e.target.value)
    }
  }

  return (
    <div className="flex gap-1 items-center">
      <select
        value={showCustom ? '__custom__' : value}
        onChange={handleSelect}
        className="bg-royal border border-gold/20 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-gold transition-colors w-24"
      >
        {STANDARD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        <option value="__custom__">Custom…</option>
      </select>
      {showCustom && (
        <input
          value={customVal}
          onChange={e => { setCustomVal(e.target.value); onChange(e.target.value) }}
          placeholder="e.g. 32 Oz"
          autoFocus
          className="bg-royal border border-amber-500/40 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-amber-400 transition-colors w-24"
        />
      )}
    </div>
  )
}

// ── Condiment panel per dish (FIX-091) ─────────────────────────────────────────
function CondimentPanel({ dishId, dishName, allCondiments }: { dishId: string; dishName: string; allCondiments: Condiment[] }) {
  const [mappings, setMappings] = useState<CondimentMap[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCondimentId, setAddingCondimentId] = useState('')
  const [addingQty, setAddingQty] = useState('1')
  const [addingUnit, setAddingUnit] = useState('Oz')
  const [saving, setSaving] = useState<string | null>(null)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/menu-condiment-map?menu_item_id=${dishId}`)
      const data = await res.json()
      setMappings(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [dishId])

  const addCondiment = async () => {
    if (!addingCondimentId) return
    if (mappings.some(m => m.condiment_id === addingCondimentId)) {
      alert(`${allCondiments.find(c => c.id === addingCondimentId)?.name} already linked.`)
      return
    }
    setSaving('add')
    setAddError('')
    try {
      const res = await fetch('/api/menu-condiment-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: dishId,
          condiment_id: addingCondimentId,
          default_qty: parseFloat(addingQty) || 1,
          default_unit: addingUnit,
          show_on_quote: false,
          is_mandatory: true,
          sort_order: mappings.length,
        }),
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        setAddError(`Server returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`)
        setSaving(null)
        return
      }
      if (!res.ok || data.error) {
        setAddError(data.error || `Request failed with status ${res.status}`)
        setSaving(null)
        return
      }
      setMappings(prev => [...prev, data])
      setAddingCondimentId(''); setAddingQty('1'); setAddingUnit('Oz')
    } catch (err: any) {
      setAddError(err.message || 'Network error')
    }
    setSaving(null)
  }

  const patch = async (id: string, field: string, value: any) => {
    setSaving(id)
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    await fetch('/api/menu-condiment-map', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    })
    setSaving(null)
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this condiment?')) return
    setSaving(id)
    await fetch(`/api/menu-condiment-map?id=${id}`, { method: 'DELETE' })
    setMappings(prev => prev.filter(m => m.id !== id))
    setSaving(null)
  }

  const available = allCondiments.filter(c => !mappings.some(m => m.condiment_id === c.id))

  if (loading) return <div className="text-[11px] text-cream/50 py-3">Loading condiments…</div>

  return (
    <div className="pt-3 pb-2 px-3 border-t border-amber-500/15 bg-amber-500/[0.03]">
      <div className="font-cinzel text-[7.5px] tracking-[0.25em] uppercase text-amber-300/80 mb-3">
        Condiments for {dishName}
      </div>

      {mappings.length === 0 ? (
        <p className="text-cream/50 text-[12px] italic mb-3">No condiments linked yet.</p>
      ) : (
        <div className="mb-3 border border-amber-500/15">
          <div className="grid grid-cols-12 gap-1 bg-royal-mid px-3 py-1.5 font-cinzel text-[7px] tracking-[0.15em] uppercase text-amber-300/60">
            <div className="col-span-4">Condiment</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-3">Unit</div>
            <div className="col-span-2 text-center">Show on Quote</div>
            <div className="col-span-1 text-center">Required</div>
            <div className="col-span-1"></div>
          </div>
          {mappings.map((m, idx) => {
            const condimentName = Array.isArray(m.condiments) ? m.condiments[0]?.name : m.condiments?.name
            return (
              <div key={m.id} className={`grid grid-cols-12 gap-1 px-3 py-2 items-center border-t border-amber-500/10 ${saving === m.id ? 'opacity-50' : ''} ${idx % 2 === 0 ? 'bg-transparent' : 'bg-royal/30'}`}>
                <div className="col-span-4 flex items-center gap-1.5">
                  <span className="text-amber-400/60 text-[11px]">↳</span>
                  <span className="text-cream text-[12px]">{condimentName}</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <input type="number" min="0.25" step="0.25" value={m.default_qty}
                    onChange={e => patch(m.id, 'default_qty', parseFloat(e.target.value) || 1)}
                    className="w-12 text-center bg-royal border border-gold/20 text-cream text-[12px] outline-none px-1 py-1 focus:border-gold" />
                </div>
                <div className="col-span-3">
                  <UnitInput value={m.default_unit} onChange={v => patch(m.id, 'default_unit', v)} />
                </div>
                <div className="col-span-2 flex items-center justify-center gap-1.5">
                  <button onClick={() => patch(m.id, 'show_on_quote', !m.show_on_quote)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${m.show_on_quote ? 'bg-green-500' : 'bg-cream/15'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-cream shadow transition-transform ${m.show_on_quote ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-[10px] font-medium whitespace-nowrap ${m.show_on_quote ? 'text-green-400' : 'text-cream/50'}`}>
                    {m.show_on_quote ? 'Quote' : 'Kitchen'}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => patch(m.id, 'is_mandatory', !m.is_mandatory)}
                    className={`text-[10px] px-1.5 py-0.5 border font-medium ${m.is_mandatory ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-cream/5 border-cream/15 text-cream/40'}`}>
                    {m.is_mandatory ? 'Must' : 'Opt'}
                  </button>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => remove(m.id)} className="text-red-400/40 hover:text-red-400 text-[13px] px-1">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add row */}
      {addError && (
        <p className="text-red-400 text-[11px] mb-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5">
          ⚠ {addError}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={addingCondimentId} onChange={e => setAddingCondimentId(e.target.value)}
          className="flex-1 min-w-40 bg-royal border border-dashed border-gold/20 text-cream/70 text-[12px] outline-none px-3 py-1.5 focus:border-amber-400/40">
          <option value="">Select condiment to add…</option>
          {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" min="0.25" step="0.25" value={addingQty} onChange={e => setAddingQty(e.target.value)}
          placeholder="Qty" className="w-14 bg-royal border border-gold/20 text-cream text-[12px] text-center outline-none px-2 py-1.5 focus:border-gold" />
        <UnitInput value={addingUnit} onChange={setAddingUnit} />
        <button onClick={addCondiment} disabled={!addingCondimentId || saving === 'add'}
          className="font-cinzel text-[8px] tracking-[0.2em] uppercase bg-amber-500 text-ink px-4 py-1.5 hover:bg-amber-400 transition-colors disabled:opacity-40">
          {saving === 'add' ? '…' : 'Add'}
        </button>
      </div>
      <p className="text-cream/60 text-[10.5px] mt-2">Default qty/unit are suggestions — admin adjusts per event on the quote.</p>
    </div>
  )
}

// ── Condiments master list modal (FIX-091) ────────────────────────────────────
function CondimentsMasterModal({ condiments, onClose, onUpdated }: { condiments: Condiment[]; onClose: () => void; onUpdated: (l: Condiment[]) => void }) {
  const [list, setList] = useState<Condiment[]>(condiments)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const [addError, setAddError] = useState('')

  const add = async () => {
    if (!newName.trim()) return
    setSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/condiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), sort_order: list.length }),
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        setAddError(`Server returned non-JSON (status ${res.status}): ${text.slice(0, 200)}`)
        setSaving(false)
        return
      }
      if (!res.ok || data.error) {
        setAddError(data.error || `Request failed with status ${res.status}`)
        setSaving(false)
        return
      }
      const updated = [...list, data]
      setList(updated); onUpdated(updated); setNewName('')
    } catch (err: any) {
      setAddError(err.message || 'Network error')
    }
    setSaving(false)
  }

  const deactivate = async (id: string) => {
    if (!confirm('Remove from master list?')) return
    await fetch(`/api/condiments?id=${id}`, { method: 'DELETE' })
    const updated = list.filter(c => c.id !== id)
    setList(updated); onUpdated(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-royal-mid border border-gold/30 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold/20">
          <h2 className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-gold">Condiments Master List</h2>
          <button onClick={onClose} className="text-cream/50 hover:text-cream text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3">
          <p className="text-cream/40 text-[11.5px] mb-3">All condiments available to link to menu items.</p>
          <div className="space-y-1">
            {list.map((c, idx) => (
              <div key={c.id} className="flex items-center justify-between bg-royal px-3 py-2 border border-gold/10">
                <div className="flex items-center gap-2">
                  <span className="text-cream/50 text-[11px] w-5 text-right">{idx + 1}.</span>
                  <span className="text-cream text-[13px]">{c.name}</span>
                </div>
                <button onClick={() => deactivate(c.id)} className="text-[11px] text-red-400/50 hover:text-red-400 hover:underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gold/20">
          {addError && (
            <p className="text-red-400 text-[11.5px] mb-2 bg-red-500/10 border border-red-500/30 px-3 py-2">
              ⚠ {addError}
            </p>
          )}
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="New condiment name…"
              className="flex-1 bg-royal border border-gold/20 text-cream text-[13px] outline-none px-3 py-2 focus:border-gold" />
            <button onClick={add} disabled={saving || !newName.trim()}
              className="font-cinzel text-[8px] tracking-[0.2em] uppercase bg-amber-500 text-ink px-4 py-2 hover:bg-amber-400 transition-colors disabled:opacity-40">
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function MasterMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<MenuItem>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState<any>(EMPTY)
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  // Category manager
  const [showCatManager, setShowCatManager] = useState(false)
  const [catOptions, setCatOptions] = useState(INITIAL_CAT_OPTIONS)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatValue, setNewCatValue] = useState('')
  // Bulk price editor
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkField, setBulkField] = useState('half_tray_cents')
  const [bulkValue, setBulkValue] = useState('')
  // Condiments (FIX-091)
  const [condiments, setCondiments] = useState<Condiment[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCondimentsMaster, setShowCondimentsMaster] = useState(false)

  useEffect(() => { load(); loadCondiments() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/menu-master')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  async function loadCondiments() {
    const res = await fetch('/api/condiments')
    const data = await res.json()
    setCondiments(Array.isArray(data) ? data : [])
  }

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setEditData({
      name: item.name, is_veg: item.is_veg,
      half_tray_cents: item.half_tray_cents,
      medium_tray_cents: item.medium_tray_cents,
      full_tray_cents: item.full_tray_cents,
      per_person_cents: item.per_person_cents,
      per_piece_cents: item.per_piece_cents,
      has_tray: item.has_tray || item.half_tray_cents > 0 || item.medium_tray_cents > 0 || item.full_tray_cents > 0,
      has_per_person: item.has_per_person || item.per_person_cents > 0,
      has_per_piece: item.has_per_piece || item.per_piece_cents > 0,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await fetch('/api/menu-master', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editData }),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...editData } : i))
    setEditingId(null); setEditData({})
    showMsg('✅ Saved!')
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    await fetch('/api/menu-master', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function addItem() {
    if (!newItem.name) return
    setSaving(true)
    const res = await fetch('/api/menu-master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    })
    const data = await res.json()
    setItems(prev => [...prev, data])
    setNewItem(EMPTY); setShowAdd(false)
    showMsg('✅ Item added!')
    setSaving(false)
  }

  async function updateSortOrder(id: string, direction: 'up' | 'down', category: string) {
    const catItems = [...items].filter(i => i.category === category).sort((a, b) => (a.sort_order||0) - (b.sort_order||0))
    const idx = catItems.findIndex(i => i.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === catItems.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const item = catItems[idx]; const swap = catItems[swapIdx]
    const newSortA = swap.sort_order || swapIdx
    const newSortB = item.sort_order || idx
    await Promise.all([
      fetch('/api/menu-master', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: item.id, sort_order: newSortA }) }),
      fetch('/api/menu-master', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: swap.id, sort_order: newSortB }) }),
    ])
    setItems(prev => prev.map(i => {
      if (i.id === item.id) return { ...i, sort_order: newSortA }
      if (i.id === swap.id) return { ...i, sort_order: newSortB }
      return i
    }))
  }

  async function bulkUpdatePrice() {
    if (!bulkCategory || !bulkValue) return
    setSaving(true)
    const targetItems = items.filter(i => i.category === bulkCategory)
    const cents = Math.round(parseFloat(bulkValue) * 100)
    for (const item of targetItems) {
      const update: any = { id: item.id, [bulkField]: cents }
      if (['half_tray_cents','medium_tray_cents','full_tray_cents'].includes(bulkField)) update.has_tray = true
      if (bulkField === 'per_person_cents') update.has_per_person = true
      if (bulkField === 'per_piece_cents') update.has_per_piece = true
      await fetch('/api/menu-master', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(update) })
    }
    await load()
    setBulkValue(''); setShowBulkEdit(false)
    showMsg(`✅ Updated ${targetItems.length} items!`)
    setSaving(false)
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const byCategory = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  const inp = "bg-transparent border-b border-gold/20 text-cream font-jost text-[13px] outline-none focus:border-gold transition-colors w-full pb-1"
  const numInp = "bg-royal border border-gold/20 text-cream font-jost text-[12px] outline-none px-2 py-1 focus:border-gold transition-colors w-full text-right"
  const sel = "w-full bg-royal border border-gold/20 text-cream font-jost text-[13px] outline-none px-2 py-2 focus:border-gold transition-colors"

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-4">
        <Link href="/admin" className="text-gold/50 hover:text-gold transition-colors"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">Admin</span>
          <h1 className="font-italiana text-[32px] text-cream leading-none">Master Menu & Prices</h1>
        </div>
        {msg && <span className="text-green-400 text-[13px]">{msg}</span>}
        <span className="text-cream/40 text-[13px]">{items.length} items · {condiments.length} condiments</span>
        <div className="flex gap-2">
          <button onClick={() => setShowCondimentsMaster(true)}
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase border border-amber-500/40 text-amber-300 px-4 py-3 hover:bg-amber-500/10 transition-colors flex items-center gap-2">
            🥣 Condiments List
          </button>
          <button onClick={() => setShowBulkEdit(!showBulkEdit)}
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase border border-amber-500/40 text-amber-300 px-4 py-3 hover:bg-amber-500/10 transition-colors flex items-center gap-2">
            💰 Bulk Edit
          </button>
          <button onClick={() => setShowCatManager(!showCatManager)}
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase border border-gold/30 text-gold px-4 py-3 hover:bg-gold/10 transition-colors flex items-center gap-2">
            🗂️ Categories
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="btn-royal flex items-center gap-2"><Plus size={14} /> Add Item</button>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">

        {/* ── BULK EDIT PANEL ── */}
        {showBulkEdit && (
          <div className="border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-amber-300">💰 Bulk Edit Prices</span>
              <button onClick={() => setShowBulkEdit(false)} className="text-cream/50 hover:text-cream text-xl">×</button>
            </div>
            <p className="text-cream/50 text-[12px] mb-4">Update one price field for ALL items in a category at once.</p>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Category</label>
                <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className={sel}>
                  <option value="">Select category...</option>
                  {catOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Price Field</label>
                <select value={bulkField} onChange={e => setBulkField(e.target.value)} className={sel}>
                  <option value="half_tray_cents">Small (1/2 tray)</option>
                  <option value="medium_tray_cents">Medium (3/4 tray)</option>
                  <option value="full_tray_cents">Full Tray</option>
                  <option value="per_person_cents">Per Person</option>
                  <option value="per_piece_cents">Per Piece</option>
                </select>
              </div>
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">New Price ($)</label>
                <PriceField cents={Math.round((parseFloat(bulkValue)||0)*100)} onChange={v => setBulkValue(String(v/100))} />
              </div>
              <div className="flex gap-2">
                <button onClick={bulkUpdatePrice} disabled={saving || !bulkCategory || !bulkValue}
                  className="flex-1 font-cinzel text-[8px] tracking-[0.2em] uppercase bg-amber-500 text-ink px-4 py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-40">
                  {saving ? 'Updating...' : 'Apply to All'}
                </button>
              </div>
            </div>
            {bulkCategory && (
              <p className="text-amber-400/60 text-[11px] mt-3">
                Will update {items.filter(i => i.category === bulkCategory).length} items in "{catOptions.find(c=>c.value===bulkCategory)?.label}"
              </p>
            )}
          </div>
        )}

        {/* ── CATEGORY MANAGER ── */}
        {showCatManager && (
          <div className="border border-gold/30 bg-royal-mid p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">🗂️ Manage Categories</span>
              <button onClick={() => setShowCatManager(false)} className="text-cream/50 hover:text-cream text-xl">×</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {catOptions.map((c, i) => (
                <div key={c.value} className="flex items-center gap-1 border border-gold/20 bg-royal px-3 py-1.5">
                  <span className="font-cinzel text-[7.5px] tracking-[0.15em] uppercase text-gold">{c.label}</span>
                  <button onClick={() => setCatOptions(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400/40 hover:text-red-400 transition-colors ml-2 text-[14px] leading-none">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Category Name</label>
                <input value={newCatLabel}
                  onChange={e => { setNewCatLabel(e.target.value); setNewCatValue(e.target.value.toLowerCase().replace(/\s+/g, '_')) }}
                  className={inp} placeholder="e.g. Indo Chinese" />
              </div>
              <div className="flex-1">
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Key (auto)</label>
                <input value={newCatValue} onChange={e => setNewCatValue(e.target.value)} className={inp + ' text-cream/50'} placeholder="indo_chinese" />
              </div>
              <button onClick={() => {
                if (!newCatLabel || !newCatValue || catOptions.find(c => c.value === newCatValue)) return
                setCatOptions(prev => [...prev, { value: newCatValue, label: newCatLabel }])
                setNewCatLabel(''); setNewCatValue('')
              }} disabled={!newCatLabel}
                className="font-cinzel text-[8px] tracking-[0.2em] uppercase bg-gold text-ink px-5 py-2.5 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center gap-2 flex-shrink-0">
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        )}

        {/* ── ADD ITEM FORM ── */}
        {showAdd && (
          <div className="border border-gold/30 bg-royal-mid p-6 mb-6">
            <span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold block mb-5">Add New Item</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-4">
              <div className="col-span-2">
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Dish Name *</label>
                <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className={inp} placeholder="e.g. Paneer Tikka" />
              </div>
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Category</label>
                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className={sel}>
                  {catOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-cinzel text-[7.5px] tracking-[0.22em] uppercase text-gold/60 block mb-1.5">Cuisine</label>
                <input value={newItem.cuisine_region} onChange={e => setNewItem({...newItem, cuisine_region: e.target.value})} className={inp} placeholder="North Indian" />
              </div>
            </div>
            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.is_veg} onChange={e => setNewItem({...newItem, is_veg: e.target.checked})} className="accent-green-500 w-4 h-4" />
                <span className="text-[13px] text-cream/70">Vegetarian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.has_tray} onChange={e => setNewItem({...newItem, has_tray: e.target.checked})} className="accent-yellow-500 w-4 h-4" />
                <span className="text-[13px] text-cream/70">Tray pricing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.has_per_person} onChange={e => setNewItem({...newItem, has_per_person: e.target.checked})} className="accent-yellow-500 w-4 h-4" />
                <span className="text-[13px] text-cream/70">Per person</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newItem.has_per_piece} onChange={e => setNewItem({...newItem, has_per_piece: e.target.checked})} className="accent-yellow-500 w-4 h-4" />
                <span className="text-[13px] text-cream/70">Per piece</span>
              </label>
            </div>
            <div className="grid grid-cols-5 gap-4 mb-5">
              {newItem.has_tray && <>
                <div><label className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60 block mb-1">Small $</label><PriceField cents={newItem.half_tray_cents} onChange={v => setNewItem({...newItem, half_tray_cents: v})} /></div>
                <div><label className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60 block mb-1">Medium $</label><PriceField cents={newItem.medium_tray_cents} onChange={v => setNewItem({...newItem, medium_tray_cents: v})} /></div>
                <div><label className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60 block mb-1">Full Tray $</label><PriceField cents={newItem.full_tray_cents} onChange={v => setNewItem({...newItem, full_tray_cents: v})} /></div>
              </>}
              {newItem.has_per_person && <div><label className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60 block mb-1">Per Person $</label><PriceField cents={newItem.per_person_cents} onChange={v => setNewItem({...newItem, per_person_cents: v})} /></div>}
              {newItem.has_per_piece && <div><label className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60 block mb-1">Per Piece $</label><PriceField cents={newItem.per_piece_cents} onChange={v => setNewItem({...newItem, per_piece_cents: v})} /></div>}
            </div>
            <div className="flex gap-3">
              <button onClick={addItem} disabled={saving || !newItem.name}
                className="btn-royal flex items-center gap-2 disabled:opacity-40">
                <Plus size={14} />{saving ? 'Saving...' : 'Save Item'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {/* ── CATEGORY FILTER ── */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button onClick={() => setFilter('all')}
            className={`font-cinzel text-[7.5px] tracking-[0.18em] uppercase px-3 py-2 border transition-all ${filter === 'all' ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>
            All ({items.length})
          </button>
          {catOptions.map(c => {
            const count = items.filter(i => i.category === c.value).length
            if (!count) return null
            return (
              <button key={c.value} onClick={() => setFilter(c.value)}
                className={`font-cinzel text-[7.5px] tracking-[0.18em] uppercase px-3 py-2 border transition-all ${filter === c.value ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>
                {c.label} ({count})
              </button>
            )
          })}
        </div>

        {/* ── MENU TABLE ── */}
        {loading ? (
          <div className="text-center py-20 text-cream/50 font-italiana text-[24px]">Loading menu...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border border-gold/20 bg-royal-mid">
            <p className="font-italiana text-[28px] text-cream/50 mb-3">No menu items yet</p>
            <p className="text-cream/60 text-[13px] mb-6">Run the SQL file in Supabase first, then items will appear here.</p>
            <button onClick={() => setShowAdd(true)} className="btn-royal">Add First Item</button>
          </div>
        ) : (
          Object.entries(byCategory)
            .sort(([a], [b]) => {
              const ai = catOptions.findIndex(c => c.value === a)
              const bi = catOptions.findIndex(c => c.value === b)
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
            })
            .map(([cat, catItems]) => (
              <div key={cat} className="mb-8">
                <div className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold border-b border-gold/20 pb-3 mb-3">
                  {catOptions.find(c => c.value === cat)?.label || cat} ({catItems.length})
                </div>
                {/* Table header */}
                <div className="grid gap-2 mb-2 px-3" style={{gridTemplateColumns:'20px 2fr 60px 90px 90px 90px 90px 90px 26px 36px'}}>
                  {['','Dish','Veg','Small','Medium','Full','Per Person','Per Piece','','↕'].map((h,i) => (
                    <span key={i} className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/40">{h}</span>
                  ))}
                </div>
                {[...catItems].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(item => {
                  const isExpanded = expandedId === item.id
                  return (
                  <div key={item.id} className="mb-1">
                    <div
                      className={`grid gap-2 px-3 py-3 border transition-colors items-center ${editingId === item.id ? 'border-gold/40 bg-gold/5' : isExpanded ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-gold/10 bg-royal-mid hover:border-gold/25'}`}
                      style={{gridTemplateColumns:'20px 2fr 60px 90px 90px 90px 90px 90px 26px 36px'}}>

                      {/* FIX-091: expand toggle for condiments — leftmost column, doesn't disturb existing layout */}
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-amber-400/40 hover:text-amber-400 transition-colors flex items-center justify-center"
                        title="Show/hide condiments">
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>

                      {editingId === item.id ? (
                        <>
                          <input value={editData.name ?? ''} onChange={e => setEditData({...editData, name: e.target.value})} className={inp} />
                          <label className="flex items-center justify-center">
                            <input type="checkbox" checked={!!editData.is_veg} onChange={e => setEditData({...editData, is_veg: e.target.checked})} className="accent-green-500 w-4 h-4" />
                          </label>
                          <PriceField cents={editData.half_tray_cents ?? 0}
                            onChange={v => setEditData(d => ({...d, half_tray_cents: v, has_tray: v > 0 || (d.medium_tray_cents??0) > 0 || (d.full_tray_cents??0) > 0}))} />
                          <PriceField cents={editData.medium_tray_cents ?? 0}
                            onChange={v => setEditData(d => ({...d, medium_tray_cents: v, has_tray: v > 0 || (d.half_tray_cents??0) > 0 || (d.full_tray_cents??0) > 0}))} />
                          <PriceField cents={editData.full_tray_cents ?? 0}
                            onChange={v => setEditData(d => ({...d, full_tray_cents: v, has_tray: v > 0 || (d.half_tray_cents??0) > 0 || (d.medium_tray_cents??0) > 0}))} />
                          <PriceField cents={editData.per_person_cents ?? 0}
                            onChange={v => setEditData(d => ({...d, per_person_cents: v, has_per_person: v > 0}))} />
                          <PriceField cents={editData.per_piece_cents ?? 0}
                            onChange={v => setEditData(d => ({...d, per_piece_cents: v, has_per_piece: v > 0}))} />
                          <button onClick={() => saveEdit(item.id)} className="text-green-400 hover:text-green-300 transition-colors"><Check size={14} /></button>
                          <button onClick={() => { setEditingId(null); setEditData({}) }} className="text-red-400/60 hover:text-red-400 transition-colors"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <span className="text-cream text-[13px]">{item.name}</span>
                          <span className={`text-[11px] text-center ${item.is_veg ? 'text-green-400' : 'text-red-400'}`}>{item.is_veg ? '🟢' : '🔴'}</span>
                          <span className="text-cream/50 text-[12px] text-right">{item.half_tray_cents > 0 ? `$${fmt(item.half_tray_cents)}` : '—'}</span>
                          <span className="text-cream/50 text-[12px] text-right">{item.medium_tray_cents > 0 ? `$${fmt(item.medium_tray_cents)}` : '—'}</span>
                          <span className="text-cream/50 text-[12px] text-right">{item.full_tray_cents > 0 ? `$${fmt(item.full_tray_cents)}` : '—'}</span>
                          <span className="text-cream/50 text-[12px] text-right">{item.per_person_cents > 0 ? `$${fmt(item.per_person_cents)}/pp` : '—'}</span>
                          <span className="text-cream/50 text-[12px] text-right">{item.per_piece_cents > 0 ? `$${fmt(item.per_piece_cents)}/pc` : '—'}</span>
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(item)} className="text-gold/40 hover:text-gold transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-red-400/20 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                          </div>
                          <div className="flex flex-col gap-0.5 items-center">
                            <button onClick={() => updateSortOrder(item.id, 'up', cat)} className="text-gold/20 hover:text-gold transition-colors text-[11px] leading-none">▲</button>
                            <button onClick={() => updateSortOrder(item.id, 'down', cat)} className="text-gold/20 hover:text-gold transition-colors text-[11px] leading-none">▼</button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* FIX-091: condiment panel, only rendered when expanded */}
                    {isExpanded && (
                      <CondimentPanel dishId={item.id} dishName={item.name} allCondiments={condiments} />
                    )}
                  </div>
                )})}
              </div>
            ))
        )}
      </div>

      {/* FIX-091: condiments master modal */}
      {showCondimentsMaster && (
        <CondimentsMasterModal
          condiments={condiments}
          onClose={() => setShowCondimentsMaster(false)}
          onUpdated={setCondiments}
        />
      )}
    </div>
  )
}
