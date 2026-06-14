'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Phone, Calendar, Users, Search, RefreshCw } from 'lucide-react'
import { Enquiry, LeadStatus, LEAD_STATUS_LABELS, STATUS_COLORS, EVENT_TYPE_LABELS, EventType } from '@/types/crm'

const PIPELINE_COLUMNS: LeadStatus[] = [
  'new', 'contacted', 'tasting', 'quoted', 'negotiating',
  'approved', 'deposit_paid', 'confirmed'
]

const ARCHIVED: LeadStatus[] = ['completed', 'cancelled', 'lost']

function EnquiryCard({ e, onStatusChange }: { e: Enquiry; onStatusChange: (id: string, status: LeadStatus) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const daysUntil = Math.ceil((new Date(e.event_date).getTime() - Date.now()) / 86400000)
  const isUrgent = daysUntil <= 14 && daysUntil > 0

  return (
    <div className={`border bg-royal-mid p-4 mb-2 hover:border-gold/40 transition-all cursor-default ${
      isUrgent ? 'border-amber-500/40' : 'border-gold/15'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-cream text-[13px] font-light leading-tight">{e.customer_name}</p>
          <p className="text-cream/40 text-[11px] mt-0.5">{e.customer_phone}</p>
        </div>
        {isUrgent && (
          <span className="text-[9px] font-cinzel tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 flex-shrink-0">
            {daysUntil}d
          </span>
        )}
      </div>

      {/* Event info */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] text-cream/60">
          <Calendar size={10} className="text-gold/50 flex-shrink-0" />
          {new Date(e.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
          {e.event_time && ` · ${e.event_time}`}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-cream/60">
          <Users size={10} className="text-gold/50 flex-shrink-0" />
          {e.guest_count} guests
        </div>
        <p className="text-[11px] text-gold/70">{EVENT_TYPE_LABELS[e.event_type as EventType]}</p>
        {e.venue_name && <p className="text-[10px] text-cream/30 leading-tight">{e.venue_name}</p>}
        {e.cuisine_preferences?.length ? (
          <p className="text-[10px] text-cream/30">{e.cuisine_preferences.slice(0, 2).join(', ')}{e.cuisine_preferences.length > 2 ? ` +${e.cuisine_preferences.length - 2}` : ''}</p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <Link href={`/admin/enquiries/${e.id}`}
          className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-gold/20 text-gold px-2 py-1 hover:bg-gold/10 transition-colors">
          View
        </Link>
        <Link href={`/admin/enquiries/${e.id}/quote`}
          className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-gold/20 text-gold px-2 py-1 hover:bg-gold/10 transition-colors">
          Quote
        </Link>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="font-cinzel text-[7px] tracking-[0.15em] uppercase border border-gold/20 text-gold/60 px-2 py-1 hover:bg-gold/10 transition-colors">
            Status ▾
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-royal-mid border border-gold/30 min-w-[160px]">
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map(s => (
                <button key={s} onClick={() => { onStatusChange(e.id, s); setMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 font-cinzel text-[7.5px] tracking-[0.15em] uppercase transition-colors hover:bg-gold/10 ${
                    e.status === s ? 'text-gold' : 'text-cream/60'
                  }`}>
                  {LEAD_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assigned */}
      <div className="mt-2 pt-2 border-t border-gold/10 flex justify-between items-center">
        <span className="text-[9px] text-cream/25 font-cinzel tracking-wider">{e.assigned_to}</span>
        {e.follow_up_date && (
          <span className="text-[9px] text-amber-400/70">Follow up: {new Date(e.follow_up_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </div>
  )
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/enquiries')
    const data = await res.json()
    setEnquiries(data.enquiries || [])
    setLoading(false)
  }

  async function changeStatus(id: string, status: LeadStatus) {
    await fetch(`/api/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  const filtered = enquiries.filter(e =>
    !search ||
    e.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_phone.includes(search) ||
    (e.customer_email || '').toLowerCase().includes(search.toLowerCase())
  )

  const pipeline = filtered.filter(e => !ARCHIVED.includes(e.status as LeadStatus))
  const archived = filtered.filter(e => ARCHIVED.includes(e.status as LeadStatus))

  const totalValue = enquiries
    .filter(e => ['approved','deposit_paid','confirmed'].includes(e.status))
    .reduce((s, e) => s + (e.budget_max || e.budget_min || 0), 0)

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">CRM Pipeline</span>
            <h1 className="font-italiana text-[36px] text-cream leading-none">Enquiries</h1>
          </div>
          <div className="flex items-center gap-4">
            {totalValue > 0 && (
              <div className="text-right">
                <div className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold/60">Confirmed pipeline</div>
                <div className="font-italiana text-[28px] text-gold-hi leading-none">${totalValue.toLocaleString()}</div>
              </div>
            )}
            <button onClick={load} className="border border-gold/20 p-2.5 text-gold/60 hover:text-gold hover:border-gold/40 transition-colors">
              <RefreshCw size={16} />
            </button>
            <Link href="/admin/enquiries/new" className="btn-royal flex items-center gap-2">
              <Plus size={14} />
              New Enquiry
            </Link>
            <Link href="/admin" className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold/40 hover:text-gold transition-colors">
              ← Admin
            </Link>
          </div>
        </div>

        {/* Stats + search */}
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            {(['new','quoted','confirmed'] as LeadStatus[]).map(s => {
              const count = enquiries.filter(e => e.status === s).length
              return (
                <div key={s} className="border border-gold/15 px-4 py-2 text-center bg-royal">
                  <span className="font-italiana text-[24px] text-cream block leading-none">{count}</span>
                  <span className="font-cinzel text-[7px] tracking-[0.15em] uppercase text-gold/60">{LEAD_STATUS_LABELS[s]}</span>
                </div>
              )
            })}
          </div>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-royal border border-gold/20 text-cream font-jost font-light text-[13px] pl-9 pr-4 py-2.5 outline-none focus:border-gold transition-colors placeholder:text-cream/20"
              placeholder="Search by name, phone or email..." />
          </div>
          <div className="flex gap-1">
            {(['kanban','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`font-cinzel text-[8px] tracking-[0.15em] uppercase px-4 py-2.5 border transition-all ${
                  view === v ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold/60 hover:border-gold/40'
                }`}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-cream/30 font-italiana text-[24px]">Loading enquiries...</div>
        ) : view === 'kanban' ? (
          /* KANBAN VIEW */
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-4">
              {PIPELINE_COLUMNS.map(col => {
                const cards = pipeline.filter(e => e.status === col)
                return (
                  <div key={col} className="w-[220px] flex-shrink-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold/70">
                        {LEAD_STATUS_LABELS[col]}
                      </span>
                      <span className="font-italiana text-[18px] text-cream/40">{cards.length}</span>
                    </div>
                    <div className="min-h-[120px]">
                      {cards.length === 0 ? (
                        <div className="border border-dashed border-gold/10 h-16 flex items-center justify-center">
                          <span className="text-cream/20 text-[11px]">empty</span>
                        </div>
                      ) : (
                        cards.map(e => <EnquiryCard key={e.id} e={e} onStatusChange={changeStatus} />)
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="border border-gold/20">
            <div className="grid grid-cols-[2fr_120px_100px_160px_120px_160px] gap-0 bg-royal-mid px-5 py-3 border-b border-gold/20">
              {['Customer','Event Date','Guests','Event Type','Status','Actions'].map(h => (
                <span key={h} className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold">{h}</span>
              ))}
            </div>
            {filtered.filter(e => showArchived || !ARCHIVED.includes(e.status as LeadStatus)).map((e, i) => (
              <div key={e.id} className={`grid grid-cols-[2fr_120px_100px_160px_120px_160px] gap-0 px-5 py-4 border-b border-gold/10 hover:bg-gold/5 transition-colors ${i % 2 === 0 ? 'bg-royal/20' : ''}`}>
                <div>
                  <p className="text-cream text-[14px]">{e.customer_name}</p>
                  <p className="text-cream/40 text-[11px]">{e.customer_phone}</p>
                </div>
                <span className="text-cream/70 text-[13px] self-center">
                  {new Date(e.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-cream/70 text-[13px] self-center">{e.guest_count}</span>
                <span className="text-gold/70 text-[12px] self-center">{EVENT_TYPE_LABELS[e.event_type as EventType]}</span>
                <div className="self-center">
                  <span className={`font-cinzel text-[7.5px] tracking-[0.15em] uppercase border px-2 py-1 ${STATUS_COLORS[e.status as LeadStatus] || ''}`}>
                    {LEAD_STATUS_LABELS[e.status as LeadStatus]}
                  </span>
                </div>
                <div className="self-center flex gap-2">
                  <Link href={`/admin/enquiries/${e.id}`} className="font-cinzel text-[7.5px] tracking-[0.15em] uppercase border border-gold/30 text-gold px-2 py-1 hover:bg-gold/10 transition-colors">View</Link>
                  <Link href={`/admin/enquiries/${e.id}/quote`} className="font-cinzel text-[7.5px] tracking-[0.15em] uppercase border border-gold/30 text-gold px-2 py-1 hover:bg-gold/10 transition-colors">Quote</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived toggle */}
        {archived.length > 0 && (
          <div className="mt-6 text-center">
            <button onClick={() => setShowArchived(!showArchived)}
              className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-cream/30 hover:text-cream/60 transition-colors">
              {showArchived ? '▲ Hide' : '▼ Show'} {archived.length} archived (completed / cancelled / lost)
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-24 border border-gold/20 bg-royal-mid mt-4">
            <p className="font-italiana text-[32px] text-cream/30 mb-3">No enquiries yet</p>
            <p className="text-cream/20 text-[13px] mb-8">Every customer call starts here.</p>
            <Link href="/admin/enquiries/new" className="btn-royal">
              + New Enquiry
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
