'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminHubPage() {
  const [stats, setStats] = useState({ total: 0, newEnq: 0, confirmed: 0, thisWeek: 0 })
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/enquiries')
        const data = await res.json()
        const enqs = data.enquiries || []
        setRecent(enqs.slice(0, 6))
        setStats({
          total: enqs.length,
          newEnq: enqs.filter((e: any) => e.status === 'new').length,
          confirmed: enqs.filter((e: any) => ['confirmed','deposit_paid','approved'].includes(e.status)).length,
          thisWeek: enqs.filter((e: any) => e.event_date >= todayStr && e.event_date <= weekStr).length,
        })
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  const STATUS_COLOR: Record<string, string> = {
    new: 'text-amber-400', contacted: 'text-blue-400', tasting: 'text-teal-400',
    quoted: 'text-purple-400', negotiating: 'text-orange-400', approved: 'text-indigo-400',
    deposit_paid: 'text-violet-400', confirmed: 'text-green-400',
    completed: 'text-gray-400', cancelled: 'text-red-400',
  }

  const navItems = [
    { href: '/admin/enquiries/new', icon: '📞', label: 'New Enquiry',   desc: 'Capture a phone call now',     border: 'border-gold/40 hover:border-gold bg-gold/5' },
    { href: '/admin/enquiries',     icon: '📋', label: 'CRM Pipeline',  desc: 'All enquiries · Kanban board', border: 'border-blue-500/30 hover:border-blue-500/60' },
    { href: '/admin/calendar',      icon: '📅', label: 'Calendar',      desc: 'Month view · All events',      border: 'border-purple-500/30 hover:border-purple-500/60' },
    { href: '/admin/menu',          icon: '🍽️', label: 'Master Menu',   desc: 'Dishes · Prices · Categories', border: 'border-teal-500/30 hover:border-teal-500/60' },
    { href: '/admin/orders',        icon: '🥘', label: 'Tray Orders',   desc: 'Online orders · Status',       border: 'border-amber-500/30 hover:border-amber-500/60' },
    { href: '/',                    icon: '🌐', label: 'View Website',  desc: 'Customer-facing site',         border: 'border-gray-500/20 hover:border-gray-500/40' },
  ]

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-1">Operations Centre</span>
            <h1 className="font-italiana text-[48px] text-cream leading-none">MAYA Hub</h1>
            <p className="text-cream/40 text-[13px] mt-1">
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="font-cinzel text-[18px] tracking-[0.2em] text-gold-hi" style={{fontFamily:'Cinzel Decorative,serif'}}>MAYA</div>
            <span className="font-cormorant italic text-[18px] text-gold opacity-60">Indian Catering · Wakefield, MA</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { n: stats.total,     l: 'Total Enquiries',  c: 'text-cream' },
            { n: stats.newEnq,    l: 'Need Follow-up',   c: stats.newEnq > 0 ? 'text-amber-400' : 'text-cream' },
            { n: stats.confirmed, l: 'Confirmed Events', c: 'text-green-400' },
            { n: stats.thisWeek,  l: 'Events This Week', c: stats.thisWeek > 0 ? 'text-gold-hi' : 'text-cream' },
          ].map(s => (
            <div key={s.l} className="border border-gold/20 bg-royal-mid p-6 text-center">
              <span className={`font-italiana text-[48px] block leading-none mb-1 ${s.c}`}>
                {loading ? '—' : s.n}
              </span>
              <span className="font-cinzel text-[7.5px] tracking-[0.2em] uppercase text-gold/50">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div>
            {/* Alerts */}
            {stats.newEnq > 0 && (
              <div className="border border-amber-500/30 bg-amber-500/10 p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-amber-300 font-cinzel text-[9px] tracking-[0.2em] uppercase">{stats.newEnq} new enquir{stats.newEnq > 1 ? 'ies' : 'y'} need follow-up</p>
                    <p className="text-amber-400/60 text-[11px] mt-0.5">Call back to confirm interest</p>
                  </div>
                </div>
                <Link href="/admin/enquiries" className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-amber-500/40 text-amber-300 px-3 py-2 hover:bg-amber-500/10 transition-colors">View →</Link>
              </div>
            )}
            {stats.thisWeek > 0 && (
              <div className="border border-green-500/30 bg-green-500/10 p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="text-green-300 font-cinzel text-[9px] tracking-[0.2em] uppercase">{stats.thisWeek} event{stats.thisWeek > 1 ? 's' : ''} this week</p>
                    <p className="text-green-400/60 text-[11px] mt-0.5">Check kitchen prep lists are ready</p>
                  </div>
                </div>
                <Link href="/admin/calendar" className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-green-500/40 text-green-300 px-3 py-2 hover:bg-green-500/10 transition-colors">Calendar →</Link>
              </div>
            )}

            {/* Nav grid */}
            <span className="section-label mb-4">Quick Actions</span>
            <div className="grid grid-cols-3 gap-3">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}
                  className={`border bg-royal-mid p-6 transition-all duration-200 block ${item.border}`}>
                  <span className="text-3xl block mb-3">{item.icon}</span>
                  <span className="font-cinzel text-[9px] tracking-[0.22em] uppercase text-gold block mb-1">{item.label}</span>
                  <span className="text-cream/50 text-[12px] leading-relaxed">{item.desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent enquiries */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="section-label">Recent Enquiries</span>
              <Link href="/admin/enquiries" className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase text-gold/50 hover:text-gold transition-colors">View all →</Link>
            </div>
            <div className="border border-gold/20 mb-4">
              {loading ? (
                <div className="py-10 text-center font-italiana text-[20px] text-cream/30">Loading...</div>
              ) : recent.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-cream/30 text-[13px] mb-4">No enquiries yet</p>
                  <Link href="/admin/enquiries/new" className="btn-royal">+ New Enquiry</Link>
                </div>
              ) : recent.map((e, i) => (
                <Link key={e.id} href={`/admin/enquiries/${e.id}`}
                  className={`flex items-center gap-4 px-5 py-3.5 border-b border-gold/10 last:border-b-0 hover:bg-gold/5 transition-colors ${i % 2 === 0 ? 'bg-royal/20' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-[13px] truncate">{e.customer_name}</p>
                    <p className="text-cream/40 text-[11px]">{e.event_type?.replace(/_/g,' ')} · {e.guest_count} guests</p>
                    <p className="text-cream/25 text-[10px]">{new Date(e.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span className={`font-cinzel text-[7.5px] tracking-[0.15em] uppercase flex-shrink-0 ${STATUS_COLOR[e.status] || 'text-cream/40'}`}>
                    {e.status?.replace(/_/g,' ')}
                  </span>
                </Link>
              ))}
            </div>

            <div className="border border-gold/20 bg-royal-mid p-5">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Online Tray Orders</span>
              <p className="text-cream/40 text-[12px] mb-3">Orders placed directly on mayacater.com</p>
              <Link href="/admin/orders" className="font-cinzel text-[7.5px] tracking-[0.18em] uppercase border border-gold/30 text-gold px-4 py-2 hover:bg-gold/10 transition-colors inline-block">
                View Tray Orders →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
