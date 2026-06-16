'use client'
import { useState, useEffect } from 'react'
import { Plus, Minus, ShoppingBag, Filter } from 'lucide-react'
import Link from 'next/link'
import { addToCart, updateQty, getCart, getCartTotals, CartItem } from '@/lib/store'

const TRAYS = { half:{label:'Half Tray',serves:'5–6 people',oz:'120 oz'}, medium:{label:'Medium Tray',serves:'10–12 people',oz:'228 oz'}, full:{label:'Full Tray',serves:'25–30 people',oz:'346 oz'} }
const CAT: Record<string,string> = { appetizer:'Appetizers', veg_curry:'Veg Curries', nonveg_curry:'Non-Veg Curries', rice:'Rice & Biryani', bread:'Breads', dessert:'Desserts', chaat:'Chaat', All:'All Dishes' }
const REGIONS = ['All','North Indian','Punjabi','Rajasthani','Gujarati','Maharashtrian','Bengali','Kerala','Telugu','Karnataka']
const fmt = (c:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100)

export default function MenuOrderClient({ dishes }:{ dishes: any[] }) {
  const [region, setRegion] = useState('All')
  const [cat, setCat] = useState('All')
  const [tray, setTray] = useState<'half'|'medium'|'full'>('medium')
  const [cart, setCart] = useState<CartItem[]>([])
  useEffect(() => setCart(getCart()), [])

  const filtered = dishes.filter(d => (region==='All'||d.cuisine_region===region) && (cat==='All'||d.category===cat))
  const totals = getCartTotals(cart)
  const getQty = (id:string) => cart.find(i=>i.id===`${id}-${tray}`)?.quantity||0

  return (
    <div className="max-w-[1300px] mx-auto px-[4%] py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div>
          {/* Tray selector */}
          <div className="mb-8">
            <span className="section-label">Select Tray Size</span>
            <div className="grid grid-cols-3 border border-gold/20">
              {(Object.entries(TRAYS) as any[]).map(([s,i]) => (
                <button key={s} onClick={()=>setTray(s)} className={`py-4 px-3 text-center border-r border-gold/20 last:border-r-0 transition-all ${tray===s?'bg-gold text-ink':'bg-royal-mid hover:bg-gold/10'}`}>
                  <span className={`font-cinzel text-[8.5px] tracking-[0.2em] uppercase block mb-1 ${tray===s?'text-ink/70':'text-gold'}`}>{i.label}</span>
                  <span className={`font-italiana text-2xl block ${tray===s?'text-ink':'text-cream'}`}>{i.serves}</span>
                  <span className={`text-[11px] ${tray===s?'text-ink/50':'text-cream/30'}`}>{i.oz}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Region filters */}
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <Filter size={13} className="text-gold mr-1"/>
            {REGIONS.map(r=>(
              <button key={r} onClick={()=>setRegion(r)} className={`font-cinzel text-[8px] tracking-[0.18em] uppercase px-3 py-2 border transition-all ${region===r?'bg-gold text-ink border-gold':'border-gold/20 text-gold hover:border-gold/50'}`}>{r}</button>
            ))}
          </div>
          {/* Category filters */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {['All','appetizer','veg_curry','nonveg_curry','rice','bread','dessert','chaat'].map(c=>(
              <button key={c} onClick={()=>setCat(c)} className={`font-cinzel text-[7.5px] tracking-[0.18em] uppercase px-3 py-2 border transition-all ${cat===c?'bg-gold/20 text-gold border-gold/60':'border-gold/10 text-cream/40 hover:border-gold/30'}`}>{CAT[c]||c}</button>
            ))}
          </div>
          {/* Dish grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.map(dish=>{
              const qty=getQty(dish.id); const price=dish.prices[`${tray}_cents`]
              return (
                <div key={dish.id} className="card-royal p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${dish.is_veg?'border-green-500 bg-green-500/20':'border-red-400 bg-red-400/20'}`}/>
                      <span className="font-cormorant italic text-[18px] text-cream leading-tight">{dish.name}</span>
                    </div>
                    <p className="text-[10px] text-cream/40 tracking-[0.1em] uppercase mb-1">{dish.cuisine_region} · {CAT[dish.category]}</p>
                    {dish.description && <p className="text-[12px] text-cream/50 mb-2 leading-snug">{dish.description}</p>}
                    <p className="font-italiana text-xl text-gold">{fmt(price)}</p>
                    <p className="text-[10px] text-cream/30">per {TRAYS[tray].label}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    {qty>0&&<><button onClick={()=>{const u=updateQty(`${dish.id}-${tray}`,qty-1);setCart([...u])}} className="w-8 h-8 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10"><Minus size={12}/></button><span className="font-italiana text-xl text-cream w-5 text-center">{qty}</span></>}
                    <button onClick={()=>{const u=addToCart(dish,tray);setCart([...u])}} className="w-8 h-8 bg-gold text-ink flex items-center justify-center hover:bg-gold-hi transition-colors"><Plus size={14}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Cart */}
        <div className="lg:sticky lg:top-[100px] h-fit">
          <div className="border border-gold/20 bg-royal-mid">
            <div className="p-5 border-b border-gold/20 flex items-center gap-3">
              <ShoppingBag size={18} className="text-gold"/>
              <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-gold">Your Order ({totals.count})</span>
            </div>
            {cart.length===0?(
              <div className="p-8 text-center"><ShoppingBag size={32} className="text-gold/20 mx-auto mb-3"/><p className="text-cream/30 text-[13px]">Your cart is empty.</p></div>
            ):(
              <div className="p-4">
                <div className="flex flex-col gap-3 mb-5 max-h-[320px] overflow-y-auto">
                  {cart.map(item=>(
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0"><p className="text-cream text-[13px] leading-tight">{item.dishName}</p><p className="text-cream/40 text-[10px] mt-0.5">{TRAYS[item.traySize]?.label} × {item.quantity}</p></div>
                      <span className="text-gold-hi text-[13px] flex-shrink-0">{fmt(item.totalPriceCents)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gold/20 pt-4 flex flex-col gap-2">
                  <div className="flex justify-between text-[12px] text-cream/60"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                  <div className="flex justify-between text-[12px] text-cream/60"><span>MA Tax (6.25%)</span><span>{fmt(totals.tax)}</span></div>
                  <div className="flex justify-between font-italiana text-xl text-cream border-t border-gold/20 pt-2 mt-1"><span>Total</span><span className="text-gold">{fmt(totals.total)}</span></div>
                </div>
                <Link href="/order/checkout" className="btn-royal w-full text-center mt-5 block">Proceed to Checkout</Link>
                <p className="text-center text-[10px] text-cream/30 mt-3">Pickup · 33 Tuttle St, Wakefield · 24–48 hr notice</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
