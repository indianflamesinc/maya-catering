'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'

interface CalendarEvent {
  id: string
  customer_name: string
  event_type: string
  event_date: string
  event_time?: string
  guest_count: number
  venue_name?: string
  status: string
  is_tray_order?: boolean
  total_cents?: number
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  new:          { bg: 'bg-amber-500/20',   text: 'text-amber-300',  dot: 'bg-amber-400' },
  contacted:    { bg: 'bg-blue-500/20',    text: 'text-blue-300',   dot: 'bg-blue-400' },
  tasting:      { bg: 'bg-teal-500/20',    text: 'text-teal-300',   dot: 'bg-teal-400' },
  quoted:       { bg: 'bg-purple-500/20',  text: 'text-purple-300', dot: 'bg-purple-400' },
  negotiating:  { bg: 'bg-orange-500/20',  text: 'text-orange-300', dot: 'bg-orange-400' },
  approved:     { bg: 'bg-indigo-500/20',  text: 'text-indigo-300', dot: 'bg-indigo-400' },
  deposit_paid: { bg: 'bg-violet-500/20',  text: 'text-violet-300', dot: 'bg-violet-400' },
  confirmed:    { bg: 'bg-green-500/20',   text: 'text-green-300',  dot: 'bg-green-400' },
  completed:    { bg: 'bg-gray-500/20',    text: 'text-gray-400',   dot: 'bg-gray-400' },
  cancelled:    { bg: 'bg-red-500/20',     text: 'text-red-400',    dot: 'bg-red-400' },
  lost:         { bg: 'bg-red-500/10',     text: 'text-red-600',    dot: 'bg-red-600' },
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', tasting: 'Tasting', quoted: 'Quoted',
  negotiating: 'Negotiating', approved: 'Approved', deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', lost: 'Lost',
}

const EVENT_TYPE_SHORT: Record<string, string> = {
  wedding: '💍 Wedding', engagement: '💍 Engagement', sangeet: '🎵 Sangeet',
  mehndi: '🌿 Mehndi', baraat: '🎺 Baraat', birthday: '🎂 Birthday',
  corporate: '🏢 Corporate', home_party: '🏠 Home Party', puja: '🙏 Puja',
  festival: '🎊 Festival', graduation: '🎓 Graduation', anniversary: '❤️ Anniversary',
  food_tasting: '🍽️ Tasting', tray_order: '🥘 Tray Order', other: '📅 Event',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date())
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'list'>('month')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    setLoading(true)
    // Load both CRM enquiries and tray orders
    const [enqRes, ordRes] = await Promise.all([
      fetch('/api/enquiries'),
      fetch('/api/admin/orders'),
    ])
    const enqData = await enqRes.json()
    const ordData = await ordRes.json()

    const enquiries = (enqData.enquiries || [])

    // Convert tray orders to calendar event format
    const trayOrders: CalendarEvent[] = (ordData.orders || [])
      .filter((o: any) => o.status !== 'cancelled')
      .map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name,
        event_type: 'tray_order',
        event_date: o.pickup_date,
        event_time: o.pickup_time,
        guest_count: 0,
        venue_name: '33 Tuttle St, Wakefield (Pickup)',
        status: o.status === 'collected' ? 'completed' :
                o.status === 'ready' ? 'confirmed' :
                o.status === 'confirmed' ? 'approved' : 'new',
        is_tray_order: true,
        total_cents: o.total_cents,
      }))

    setEvents([...enquiries, ...trayOrders])
    setLoading(false)
  }

  // Calendar grid helpers
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Build 6-week grid
  const cells: { date: number; month: 'prev' | 'cur' | 'next'; dateStr: string }[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ date: d, month: 'prev', dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, month: 'cur', dateStr: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  let next = 1
  while (cells.length < 42) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ date: next, month: 'next', dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(next).padStart(2,'0')}` })
    next++
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  function getEventsForDate(dateStr: string) {
    return events.filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      return e.event_date === dateStr
    })
  }

  const selectedEvents = selected ? getEventsForDate(selected) : []

  // Upcoming events (next 30 days)
  const upcomingEvents = events
    .filter(e => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      const d = new Date(e.event_date + 'T12:00:00')
      const diff = (d.getTime() - today.getTime()) / 86400000
      return diff >= 0 && diff <= 60
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  // Stats
  const thisMonthEvents = events.filter(e => {
    const d = new Date(e.event_date + 'T12:00:00')
    return d.getFullYear() === year && d.getMonth() === month
  })

  const confirmedThisMonth = thisMonthEvents.filter(e => ['confirmed','deposit_paid','approved'].includes(e.status))

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-4">
        <Link href="/admin" className="text-gold/50 hover:text-gold transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">MAYA Hub</span>
          <h1 className="font-italiana text-[36px] text-cream leading-none">Catering Calendar</h1>
        </div>

        {/* Month stats */}
        <div className="flex gap-4">
          <div className="border border-gold/20 px-4 py-2 text-center bg-royal">
            <span className="font-italiana text-[28px] text-cream block leading-none">{thisMonthEvents.length}</span>
            <span className="font-cinzel text-[7px] tracking-[0.18em] uppercase text-gold/60">Events {MONTHS[month]}</span>
          </div>
          <div className="border border-green-500/30 px-4 py-2 text-center bg-green-500/5">
            <span className="font-italiana text-[28px] text-green-300 block leading-none">{confirmedThisMonth.length}</span>
            <span className="font-cinzel text-[7px] tracking-[0.18em] uppercase text-green-600">Confirmed</span>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1">
          {(['month','list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`font-cinzel text-[8px] tracking-[0.15em] uppercase px-4 py-2.5 border transition-all ${view === v ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>
              {v === 'month' ? '📅 Month' : '📋 List'}
            </button>
          ))}
        </div>

        <Link href="/admin/enquiries/new" className="btn-royal flex items-center gap-2">
          <Plus size={14} /> New Enquiry
        </Link>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

          {/* LEFT: Calendar */}
          <div>
            {/* Month navigator */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
                className="border border-gold/20 p-2 text-gold hover:bg-gold/10 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <h2 className="font-italiana text-[36px] text-cream leading-none">{MONTHS[month]}</h2>
                <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-gold">{year}</span>
              </div>
              <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
                className="border border-gold/20 p-2 text-gold hover:bg-gold/10 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={() => setFilterStatus('all')}
                className={`font-cinzel text-[7px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-all ${filterStatus === 'all' ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold hover:border-gold/40'}`}>
                All
              </button>
              {['confirmed','deposit_paid','approved','quoted','new'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`font-cinzel text-[7px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-all ${filterStatus === s ? `${STATUS_COLORS[s]?.bg} ${STATUS_COLORS[s]?.text} border-current` : 'border-gold/20 text-gold/60 hover:border-gold/40'}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            {view === 'month' ? (
              /* MONTH VIEW */
              <div className="border border-gold/20">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gold/20">
                  {DAYS.map(d => (
                    <div key={d} className="py-2 text-center font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold/50">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {cells.map((cell, i) => {
                    const dayEvents = getEventsForDate(cell.dateStr)
                    const isToday = cell.dateStr === todayStr
                    const isSelected = cell.dateStr === selected
                    const isCurrent = cell.month === 'cur'

                    return (
                      <div key={i}
                        onClick={() => setSelected(cell.dateStr === selected ? null : cell.dateStr)}
                        className={`min-h-[100px] p-2 border-b border-r border-gold/10 cursor-pointer transition-colors ${
                          isSelected ? 'bg-gold/10 border-gold/30' :
                          isCurrent ? 'hover:bg-gold/5' : 'opacity-30'
                        }`}>
                        {/* Date number */}
                        <div className={`w-7 h-7 flex items-center justify-center mb-1 ${
                          isToday ? 'bg-gold rounded-full' : ''
                        }`}>
                          <span className={`font-cinzel text-[11px] ${
                            isToday ? 'text-ink font-semibold' :
                            isCurrent ? 'text-cream/70' : 'text-cream/30'
                          }`}>{cell.date}</span>
                        </div>

                        {/* Events */}
                        <div className="flex flex-col gap-0.5">
                          {dayEvents.slice(0, 3).map(ev => {
                            const colors = STATUS_COLORS[ev.status] || STATUS_COLORS.new
                            return (
                              <Link key={ev.id}
                                href={ev.is_tray_order ? `/admin/orders` : `/admin/enquiries/${ev.id}`}
                                onClick={e => e.stopPropagation()}
                                className={`${colors.bg} ${colors.text} text-[10px] px-1.5 py-0.5 rounded-sm truncate block hover:opacity-80 transition-opacity`}>
                                {ev.is_tray_order ? '🥘 ' : ''}{ev.customer_name}
                              </Link>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-gold/50 text-[9px] px-1">+{dayEvents.length - 3} more</span>
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
                <div className="bg-royal-mid px-5 py-3 border-b border-gold/20 grid grid-cols-[120px_1fr_100px_120px_120px]">
                  {['Date','Customer / Event','Guests','Venue','Status'].map(h => (
                    <span key={h} className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold">{h}</span>
                  ))}
                </div>
                {upcomingEvents.length === 0 ? (
                  <div className="py-16 text-center text-cream/30 font-italiana text-[20px]">No upcoming events</div>
                ) : upcomingEvents.map((ev, i) => {
                  const colors = STATUS_COLORS[ev.status] || STATUS_COLORS.new
                  const d = new Date(ev.event_date + 'T12:00:00')
                  const daysAway = Math.ceil((d.getTime() - today.getTime()) / 86400000)
                  return (
                    <Link key={ev.id}
                      href={ev.is_tray_order ? `/admin/orders` : `/admin/enquiries/${ev.id}`}
                      className={`grid grid-cols-[120px_1fr_100px_120px_120px] px-5 py-4 border-b border-gold/10 hover:bg-gold/5 transition-colors ${i % 2 === 0 ? 'bg-royal/20' : ''}`}>
                      <div>
                        <p className="text-cream text-[13px]">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-cream/40 text-[11px]">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        {daysAway <= 7 && <span className="text-amber-400 text-[10px]">⚡ {daysAway}d away</span>}
                        {daysAway === 0 && <span className="text-green-400 text-[10px] font-cinzel tracking-wider uppercase">Today!</span>}
                      </div>
                      <div>
                        <p className="text-cream text-[13px]">{ev.customer_name}</p>
                        <p className="text-gold/60 text-[11px]">{EVENT_TYPE_SHORT[ev.event_type] || ev.event_type}</p>
                        {ev.event_time && <p className="text-cream/40 text-[11px]">{ev.event_time}</p>}
                      </div>
                      <span className="text-cream/60 text-[13px] self-center">{ev.guest_count}</span>
                      <span className="text-cream/50 text-[12px] self-center truncate">{ev.venue_name || '—'}</span>
                      <div className="self-center">
                        <span className={`font-cinzel text-[7.5px] tracking-[0.15em] uppercase border px-2 py-1 ${colors.bg} ${colors.text}`}>
                          {STATUS_LABELS[ev.status]}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="flex flex-col gap-4">

            {/* Selected day detail */}
            {selected && (
              <div className="border border-gold/30 bg-royal-mid p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold">
                    {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-cream/30 hover:text-cream transition-colors text-lg">×</button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-cream/30 text-[13px] mb-3">No events on this day</p>
                    <Link href="/admin/enquiries/new" className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase border border-gold/30 text-gold px-4 py-2 hover:bg-gold/10 transition-colors">
                      + Add Enquiry
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedEvents.map(ev => {
                      const colors = STATUS_COLORS[ev.status] || STATUS_COLORS.new
                      return (
                        <Link key={ev.id}
                          href={ev.is_tray_order ? `/admin/orders` : `/admin/enquiries/${ev.id}`}
                          className="border border-gold/15 bg-royal p-4 hover:border-gold/40 transition-colors block">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-cream text-[14px]">{ev.customer_name}</p>
                            <span className={`font-cinzel text-[7px] tracking-[0.12em] uppercase border px-2 py-0.5 ${colors.bg} ${colors.text}`}>
                              {STATUS_LABELS[ev.status]}
                            </span>
                          </div>
                          <p className="text-gold/60 text-[12px]">{EVENT_TYPE_SHORT[ev.event_type] || ev.event_type}</p>
                          {ev.event_time && <p className="text-cream/50 text-[12px]">⏰ {ev.event_time}</p>}
                          {ev.is_tray_order ? (
                            <p className="text-gold text-[13px]">💰 ${((ev.total_cents||0)/100).toFixed(2)}</p>
                          ) : (
                            <p className="text-cream/50 text-[12px]">👥 {ev.guest_count} guests</p>
                          )}
                          {ev.venue_name && <p className="text-cream/50 text-[12px]">📍 {ev.venue_name}</p>}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="border border-gold/20 bg-royal-mid p-5">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-4">Status Legend</span>
              <div className="flex flex-col gap-2">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const colors = STATUS_COLORS[key]
                  if (!colors) return null
                  const count = events.filter(e => e.status === key).length
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        <span className="text-cream/70 text-[12px]">{label}</span>
                      </div>
                      <span className="font-italiana text-[16px] text-cream/40">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upcoming this week */}
            <div className="border border-gold/20 bg-royal-mid p-5">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-4">Next 7 Days</span>
              {events.filter(e => {
                const d = new Date(e.event_date + 'T12:00:00')
                const diff = (d.getTime() - today.getTime()) / 86400000
                return diff >= 0 && diff <= 7
              }).sort((a,b) => a.event_date.localeCompare(b.event_date)).length === 0 ? (
                <p className="text-cream/30 text-[12px]">No events in next 7 days</p>
              ) : (
                events.filter(e => {
                  const d = new Date(e.event_date + 'T12:00:00')
                  const diff = (d.getTime() - today.getTime()) / 86400000
                  return diff >= 0 && diff <= 7
                }).sort((a,b) => a.event_date.localeCompare(b.event_date)).map(ev => {
                  const colors = STATUS_COLORS[ev.status] || STATUS_COLORS.new
                  const daysAway = Math.ceil((new Date(ev.event_date + 'T12:00:00').getTime() - today.getTime()) / 86400000)
                  return (
                    <Link key={ev.id} href={`/admin/enquiries/${ev.id}`}
                      className="flex items-start gap-3 py-2.5 border-b border-gold/10 last:border-b-0 hover:bg-gold/5 transition-colors -mx-2 px-2">
                      <div className={`w-1 self-stretch rounded-full ${colors.dot} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-cream text-[13px] truncate">{ev.customer_name}</p>
                        <p className="text-cream/40 text-[11px]">{new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {ev.event_time && `· ${ev.event_time}`}</p>
                      </div>
                      <span className={`text-[10px] font-cinzel tracking-wider flex-shrink-0 ${daysAway === 0 ? 'text-green-400' : daysAway <= 3 ? 'text-amber-400' : 'text-cream/30'}`}>
                        {daysAway === 0 ? 'Today' : `${daysAway}d`}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Quick nav */}
            <div className="flex gap-2">
              <button onClick={() => { setCurrent(new Date()); setSelected(todayStr) }}
                className="flex-1 font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/20 text-gold px-3 py-2.5 hover:bg-gold/10 transition-colors">
                📅 Today
              </button>
              <Link href="/admin/enquiries"
                className="flex-1 font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/20 text-gold px-3 py-2.5 hover:bg-gold/10 transition-colors text-center">
                📋 All Enquiries
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
