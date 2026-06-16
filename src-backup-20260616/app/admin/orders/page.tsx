'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

const fmt = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  confirmed: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  preparing: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  ready:     'bg-green-500/20 text-green-300 border-green-500/40',
  collected: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/40',
}
const NEXT: Record<string, string> = { pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'collected' }
const NEXT_LABEL: Record<string, string> = { pending:'✓ Confirm', confirmed:'👨‍🍳 Prepare', preparing:'✅ Ready', ready:'📦 Collected' }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setUpdating(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts: Record<string, number> = orders.reduce((a, o) => ({ ...a, [o.status]: (a[o.status] || 0) + 1 }), {})
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_cents, 0)
  const pendingCount = counts['pending'] || 0

  return (
    <div className="min-h-screen bg-ink">
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-gold/50 hover:text-gold transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <div className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold mb-0.5">Online Tray Orders</div>
            <h1 className="font-italiana text-[36px] text-cream leading-none">Orders Dashboard</h1>
          </div>
          {pendingCount > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/40 px-4 py-2">
              <span className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-yellow-300">⚡ {pendingCount} pending confirmation</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold/60">Total Revenue</div>
            <div className="font-italiana text-[32px] text-gold-hi leading-none">{fmt(totalRevenue)}</div>
          </div>
          <button onClick={load} className="border border-gold/30 p-2.5 text-gold hover:bg-gold/10 transition-colors"><RefreshCw size={16} /></button>
          <Link href="/admin" className="font-cinzel text-[8px] tracking-[0.2em] uppercase border border-gold/20 text-gold/60 px-4 py-2.5 hover:bg-gold/10 transition-colors">← Hub</Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Status pills */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {['all','pending','confirmed','preparing','ready','collected','cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`border py-4 px-2 text-center transition-all ${filter === s ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold/40 bg-royal-mid'}`}>
              <span className="font-italiana text-[32px] text-cream block leading-none mb-1">{s === 'all' ? orders.length : counts[s] || 0}</span>
              <span className="font-cinzel text-[7px] tracking-[0.18em] uppercase text-gold capitalize block">{s}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24 border border-gold/20"><div className="font-italiana text-[24px] text-cream/40">Loading orders...</div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-gold/20 bg-royal-mid">
            <div className="font-italiana text-[28px] text-cream/30 mb-2">No orders yet</div>
            <p className="text-cream/20 text-[13px]">Tray orders placed on your website will appear here.</p>
            <Link href="/order" target="_blank" className="inline-block mt-6 btn-ghost">View Order Page →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(order => (
              <div key={order.id} className={`border transition-all ${order.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gold/20 bg-royal-mid'}`}>
                <div className="grid grid-cols-[2fr_150px_110px_160px_220px] gap-4 items-center px-6 py-4">
                  <div>
                    <p className="text-cream text-[15px] font-light mb-0.5">{order.customer_name}</p>
                    <p className="text-cream/50 text-[12px]">{order.customer_email}</p>
                    {order.customer_phone && <p className="text-cream/35 text-[11px]">{order.customer_phone}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-cream/20 text-[9px] font-cinzel tracking-wider">#{order.id.slice(0,8).toUpperCase()}</span>
                      <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="text-gold/50 text-[9px] font-cinzel tracking-wider hover:text-gold transition-colors">
                        {expanded === order.id ? '▲ hide' : '▼ items'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-cream/80 text-[13px]">{new Date(order.pickup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-gold text-[13px]">{order.pickup_time}</p>
                  </div>
                  <div>
                    <p className="font-italiana text-[26px] text-gold-hi leading-none">{fmt(order.total_cents)}</p>
                    <p className="text-cream/25 text-[10px]">incl. 6.25% tax</p>
                  </div>
                  <div>
                    {(order.order_items || []).slice(0, 3).map((item: any, i: number) => (
                      <p key={i} className="text-cream/50 text-[11px] leading-relaxed">{item.dish_name} <span className="text-gold/40">({item.tray_size} ×{item.quantity})</span></p>
                    ))}
                    {(order.order_items?.length || 0) > 3 && <p className="text-cream/25 text-[10px]">+{order.order_items.length - 3} more</p>}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`font-cinzel text-[8px] tracking-[0.15em] uppercase border px-3 py-1.5 ${STATUS_STYLE[order.status] || ''}`}>{order.status}</span>
                    {NEXT[order.status] && (
                      <button onClick={() => updateStatus(order.id, NEXT[order.status])} disabled={updating === order.id}
                        className="font-cinzel text-[8px] tracking-[0.15em] uppercase border border-gold/40 text-gold px-3 py-1.5 hover:bg-gold hover:text-ink transition-all disabled:opacity-40 w-full text-center">
                        {updating === order.id ? 'Updating...' : NEXT_LABEL[order.status]}
                      </button>
                    )}
                    {order.notes && <p className="text-cream/25 text-[10px] italic text-right max-w-[200px]">"{order.notes}"</p>}
                  </div>
                </div>
                {expanded === order.id && (
                  <div className="border-t border-gold/10 px-6 py-4 bg-black/20">
                    <p className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-gold mb-3">Order Items</p>
                    {(order.order_items || []).map((item: any) => (
                      <div key={item.id} className="flex justify-between py-2 border-t border-gold/10 text-[13px]">
                        <span className="text-cream/80">{item.dish_name}</span>
                        <span className="text-cream/40 capitalize">{item.tray_size} × {item.quantity}</span>
                        <span className="text-gold-hi">{fmt(item.total_price_cents)}</span>
                      </div>
                    ))}
                    <div className="flex justify-end gap-8 pt-3 mt-2 border-t border-gold/20 text-[13px]">
                      <span className="text-cream/40">Tax: {fmt(order.tax_cents)}</span>
                      <span className="text-gold font-italiana text-[20px]">Total: {fmt(order.total_cents)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
