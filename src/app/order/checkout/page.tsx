'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { getCart, getCartTotals, CartItem } from '@/lib/store'

const fmt = (c:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100)
const TRAYS:Record<string,string> = {half:'Half Tray',medium:'Medium Tray',full:'Full Tray'}
const TIMES = ['10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM']

function CheckoutForm() {
  const [items, setItems] = useState<CartItem[]>([])
  const [form, setForm] = useState({name:'',email:'',phone:'',pickupDate:'',pickupTime:'',notes:''})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => setItems(getCart()), [])
  const totals = getCartTotals(items)
  const minDate = new Date(); minDate.setDate(minDate.getDate()+1)

  async function submit(e:React.FormEvent) {
    e.preventDefault()
    if(!items.length){setError('Your cart is empty.'); return}
    if(!form.pickupDate||!form.pickupTime){setError('Please select pickup date and time.'); return}
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,customerName:form.name,customerEmail:form.email,customerPhone:form.phone,pickupDate:form.pickupDate,pickupTime:form.pickupTime,notes:form.notes})})
      const data = await res.json()
      if(data.url) window.location.href = data.url
      else setError(data.error||'Something went wrong. Please try again.')
    } catch { setError('Connection error. Please try again.') }
    setLoading(false)
  }

  return (
    <div className="max-w-[1100px] mx-auto px-[5%] py-16">
      <span className="section-label">Almost There</span>
      <h1 className="display-h text-[clamp(32px,4vw,52px)]">Complete Your <em className="font-cormorant italic text-gold-pale">Order</em></h1>
      {items.length===0?(
        <div className="text-center py-20 border border-gold/20 mt-8">
          <p className="text-cream/40 text-[15px] mb-4">Your cart is empty.</p>
          <Link href="/order" className="btn-royal">Browse Menu</Link>
        </div>
      ):(
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 mt-8">
          <div className="border border-gold/20 bg-royal-mid p-8">
            <h2 className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold mb-6">Your Details</h2>
            <div className="flex flex-col gap-5">
              <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Full Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input-royal" placeholder="Priya Sharma"/></div>
              <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Email *</label><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input-royal" placeholder="priya@example.com"/></div>
              <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Phone</label><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input-royal" placeholder="617-000-0000"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Pickup Date *</label><input required type="date" min={minDate.toISOString().split('T')[0]} value={form.pickupDate} onChange={e=>setForm({...form,pickupDate:e.target.value})} className="input-royal"/></div>
                <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Pickup Time *</label><select required value={form.pickupTime} onChange={e=>setForm({...form,pickupTime:e.target.value})} className="select-royal"><option value="">Select time</option>{TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div><label className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">Special Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="input-royal" rows={3} placeholder="Dietary requirements, allergies..."/></div>
            </div>
            {error&&<p className="text-red-400 text-[13px] mt-4 border border-red-400/30 p-3">{error}</p>}
            <button type="submit" disabled={loading} className={`btn-royal w-full text-center mt-6 ${loading?'opacity-50 cursor-not-allowed':''}`}>{loading?'Processing...':`Pay ${fmt(totals.total)} — Secure Checkout`}</button>
            <p className="text-center text-[10px] text-cream/30 mt-3">Secure payment via Stripe · Pickup at 33 Tuttle St, Wakefield MA</p>
          </div>
          <div className="h-fit border border-gold/20 bg-royal-mid">
            <div className="p-5 border-b border-gold/20"><span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-gold">Order Summary</span></div>
            <div className="p-4">
              <div className="flex flex-col gap-3 mb-4 max-h-[300px] overflow-y-auto">
                {items.map(item=>(
                  <div key={item.id} className="flex justify-between gap-3">
                    <div><p className="text-cream text-[13px]">{item.dishName}</p><p className="text-cream/40 text-[10px]">{TRAYS[item.traySize]} × {item.quantity}</p></div>
                    <span className="text-gold-hi text-[13px]">{fmt(item.totalPriceCents)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gold/20 pt-4 flex flex-col gap-2">
                <div className="flex justify-between text-[12px] text-cream/60"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                <div className="flex justify-between text-[12px] text-cream/60"><span>MA Tax (6.25%)</span><span>{fmt(totals.tax)}</span></div>
                <div className="flex justify-between font-italiana text-xl text-cream border-t border-gold/20 pt-2 mt-1"><span>Total</span><span className="text-gold">{fmt(totals.total)}</span></div>
              </div>
              <Link href="/order" className="block text-center font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold mt-4 hover:text-gold-hi transition-colors">← Edit Order</Link>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <Nav />
      <main className="pt-[88px] min-h-screen bg-ink">
        <Suspense fallback={<div className="text-center pt-20 text-cream/40">Loading...</div>}><CheckoutForm/></Suspense>
      </main>
      <Footer />
    </>
  )
}
