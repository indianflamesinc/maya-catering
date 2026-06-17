'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Condiment {
  id: string; name: string; is_active: boolean; sort_order: number
}
interface CondimentMap {
  id: string; menu_item_id: string; condiment_id: string
  default_qty: number; default_unit: string
  show_on_quote: boolean; is_mandatory: boolean; sort_order: number
  condiments: { id: string; name: string } | { id: string; name: string }[]
}
interface MenuItem {
  id: string; name: string; category: string; cuisine_region: string
  is_veg: boolean; is_active: boolean
  half_tray_cents: number; medium_tray_cents: number; full_tray_cents: number
  per_person_cents: number; per_piece_cents: number
  has_tray: boolean; has_per_person: boolean; has_per_piece: boolean
  notes: string; sort_order: number
}

const STANDARD_UNITS = ['Oz', 'Gallon', 'Tray', 'Piece']
const CATEGORIES = ['All','Appetizer','Main Course','Bread','Rice','Dessert','Beverage','Chaat','Live Station','Other']

function cents(n: number) { return n > 0 ? `$${(n/100).toFixed(2)}` : '—' }

// ── Unit input: standard dropdown + optional custom free text ──────────────────
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
        className="border border-gray-200 rounded px-1.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 w-24"
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
          className="border border-amber-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      )}
    </div>
  )
}

// ── Condiment panel per dish ───────────────────────────────────────────────────
function CondimentPanel({ dish, allCondiments }: { dish: MenuItem; allCondiments: Condiment[] }) {
  const [mappings, setMappings] = useState<CondimentMap[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCondimentId, setAddingCondimentId] = useState('')
  const [addingQty, setAddingQty] = useState('1')
  const [addingUnit, setAddingUnit] = useState('Oz')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('menu_condiment_map')
        .select('id,menu_item_id,condiment_id,default_qty,default_unit,show_on_quote,is_mandatory,sort_order,condiments(id,name)')
        .eq('menu_item_id', dish.id)
        .order('sort_order')
      setMappings((data as unknown as CondimentMap[]) || [])
      setLoading(false)
    }
    load()
  }, [dish.id])

  const addCondiment = async () => {
    if (!addingCondimentId) return
    if (mappings.some(m => m.condiment_id === addingCondimentId)) {
      alert(`${allCondiments.find(c => c.id === addingCondimentId)?.name} already linked.`)
      return
    }
    setSaving('add')
    const { data, error } = await supabase
      .from('menu_condiment_map')
      .insert({ menu_item_id: dish.id, condiment_id: addingCondimentId, default_qty: parseFloat(addingQty) || 1, default_unit: addingUnit, show_on_quote: false, is_mandatory: true, sort_order: mappings.length })
      .select('id,menu_item_id,condiment_id,default_qty,default_unit,show_on_quote,is_mandatory,sort_order,condiments(id,name)')
      .single()
    if (!error && data) { setMappings(prev => [...prev, data as unknown as CondimentMap]); setAddingCondimentId(''); setAddingQty('1'); setAddingUnit('Oz') }
    setSaving(null)
  }

  const patch = async (id: string, field: string, value: any) => {
    setSaving(id)
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    await supabase.from('menu_condiment_map').update({ [field]: value }).eq('id', id)
    setSaving(null)
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this condiment?')) return
    setSaving(id)
    await supabase.from('menu_condiment_map').delete().eq('id', id)
    setMappings(prev => prev.filter(m => m.id !== id))
    setSaving(null)
  }

  const available = allCondiments.filter(c => !mappings.some(m => m.condiment_id === c.id))

  if (loading) return <div className="text-xs text-gray-400 py-3">Loading…</div>

  return (
    <div className="pt-3">
      {mappings.length === 0
        ? <p className="text-xs text-gray-400 italic mb-3">No condiments linked yet.</p>
        : (
          <div className="mb-3 rounded-lg border border-amber-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-1 bg-gray-800 px-3 py-2 text-xs font-semibold text-white uppercase tracking-wide">
              <div className="col-span-4">Condiment</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-3">Unit</div>
              <div className="col-span-2 text-center">Show on Quote</div>
              <div className="col-span-1 text-center">Required</div>
              <div className="col-span-1"></div>
            </div>
            {mappings.map((m, idx) => (
              <div key={m.id} className={`grid grid-cols-12 gap-1 px-3 py-2 items-center border-b border-amber-50 last:border-0 ${saving === m.id ? 'opacity-50' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                <div className="col-span-4 flex items-center gap-1.5">
                  <span className="text-amber-400 text-xs">↳</span>
                  <span className="text-sm font-medium text-gray-800">{Array.isArray(m.condiments) ? m.condiments[0]?.name : m.condiments?.name}</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <input type="number" min="0.25" step="0.25" value={m.default_qty}
                    onChange={e => patch(m.id, 'default_qty', parseFloat(e.target.value) || 1)}
                    className="w-14 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" />
                </div>
                <div className="col-span-3">
                  <UnitInput value={m.default_unit} onChange={v => patch(m.id, 'default_unit', v)} />
                </div>
                <div className="col-span-2 flex items-center justify-center gap-1.5">
                  <button onClick={() => patch(m.id, 'show_on_quote', !m.show_on_quote)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${m.show_on_quote ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${m.show_on_quote ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-xs font-medium whitespace-nowrap ${m.show_on_quote ? 'text-green-700' : 'text-gray-400'}`}>
                    {m.show_on_quote ? 'Quote' : 'Kitchen'}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => patch(m.id, 'is_mandatory', !m.is_mandatory)}
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${m.is_mandatory ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    {m.is_mandatory ? 'Must' : 'Opt'}
                  </button>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
      {/* Add row */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={addingCondimentId} onChange={e => setAddingCondimentId(e.target.value)}
          className="flex-1 min-w-40 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white">
          <option value="">Select condiment to add…</option>
          {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="number" min="0.25" step="0.25" value={addingQty} onChange={e => setAddingQty(e.target.value)}
          placeholder="Qty" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-300" />
        <UnitInput value={addingUnit} onChange={setAddingUnit} />
        <button onClick={addCondiment} disabled={!addingCondimentId || saving === 'add'}
          className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 font-medium">
          {saving === 'add' ? 'Adding…' : 'Add'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Default qty and unit are suggestions — admin adjusts per event on the quote.</p>
    </div>
  )
}

// ── Condiments master modal ────────────────────────────────────────────────────
function CondimentsMasterModal({ condiments, onClose, onUpdated }: { condiments: Condiment[]; onClose: () => void; onUpdated: (l: Condiment[]) => void }) {
  const [list, setList] = useState<Condiment[]>(condiments)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('condiments').insert({ name: newName.trim(), sort_order: list.length }).select().single()
    if (!error && data) { const updated = [...list, data as Condiment]; setList(updated); onUpdated(updated); setNewName('') }
    setSaving(false)
  }

  const deactivate = async (id: string) => {
    if (!confirm('Remove from master list?')) return
    await supabase.from('condiments').update({ is_active: false }).eq('id', id)
    const updated = list.filter(c => c.id !== id); setList(updated); onUpdated(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Condiments Master List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3">
          <p className="text-xs text-gray-500 mb-3">All condiments available to link to menu items.</p>
          <div className="space-y-1">
            {list.map((c, idx) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                </div>
                <button onClick={() => deactivate(c.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="New condiment name…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button onClick={add} disabled={saving || !newName.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-40">
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MenuAdminPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [condiments, setCondiments] = useState<Condiment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showMaster, setShowMaster] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: menuData }, { data: condData }] = await Promise.all([
        supabase.from('master_menu').select('*').order('sort_order').order('name'),
        supabase.from('condiments').select('*').eq('is_active', true).order('sort_order').order('name'),
      ])
      setItems((menuData as MenuItem[]) || [])
      setCondiments((condData as Condiment[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleActive = async (item: MenuItem) => {
    await supabase.from('master_menu').update({ is_active: !item.is_active }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !item.is_active } : i))
  }

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || (i.cuisine_region || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterCategory === 'All' || i.category === filterCategory)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} dishes · {condiments.length} condiments</p>
        </div>
        <button onClick={() => setShowMaster(true)}
          className="px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 font-medium">
          🥣 Manage Condiments List
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 w-52" />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${filterCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Loading menu…</div>}

      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className={`bg-white border rounded-xl overflow-hidden ${!item.is_active ? 'opacity-50 border-gray-100' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="text-gray-400 hover:text-amber-600 w-5 text-sm text-center flex-shrink-0 font-mono">
                {expandedId === item.id ? '▾' : '▸'}
              </button>
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 border-2 ${item.is_veg ? 'border-green-600 bg-green-500' : 'border-red-600 bg-red-500'}`} title={item.is_veg ? 'Veg' : 'Non-Veg'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                  {item.cuisine_region && <span className="text-xs text-gray-400">{item.cuisine_region}</span>}
                </div>
                <div className="flex gap-3 mt-0.5 flex-wrap text-xs text-gray-400">
                  {item.has_tray && <span>Tray: {cents(item.half_tray_cents)} / {cents(item.medium_tray_cents)} / {cents(item.full_tray_cents)}</span>}
                  {item.has_per_person && <span>Per person: {cents(item.per_person_cents)}</span>}
                  {item.has_per_piece && <span>Per piece: {cents(item.per_piece_cents)}</span>}
                </div>
              </div>
              <button onClick={() => toggleActive(item)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium border flex-shrink-0 ${item.is_active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                {item.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            {expandedId === item.id && (
              <div className="px-4 pb-4 pt-1 border-t border-amber-100 bg-amber-50/20">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Condiments for {item.name}</p>
                <CondimentPanel dish={item} allCondiments={condiments} />
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
            No dishes found.
          </div>
        )}
      </div>

      {showMaster && <CondimentsMasterModal condiments={condiments} onClose={() => setShowMaster(false)} onUpdated={setCondiments} />}
    </div>
  )
}
