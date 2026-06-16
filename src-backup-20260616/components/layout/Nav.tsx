'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { getCart, getCartTotals } from '@/lib/store'

const links = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/order', label: 'Order Online' },
  { href: '/events', label: 'Events' },
  { href: '/contact', label: 'Contact' },
]

export default function Nav() {
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const path = usePathname()

  useEffect(() => {
    const tick = () => setCount(getCartTotals(getCart()).count)
    tick()
    const id = setInterval(tick, 600)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fn = () => setStuck(window.scrollY > 44)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[88px] flex items-center justify-between px-[5%] transition-all duration-500 ${stuck ? 'bg-[#05091Afb] border-b border-[rgba(201,168,76,0.2)] backdrop-blur-xl' : ''}`}>
        <Link href="/" className="flex flex-col gap-1">
          <span className="font-cinzel-dec text-[19px] tracking-[0.25em] text-gold-hi leading-none" style={{fontFamily:'Cinzel Decorative,serif'}}>MAYA</span>
          <span className="text-[7px] tracking-[0.45em] text-cream/30 uppercase font-jost">Indian Catering · Boston</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`font-cinzel text-[8.5px] tracking-[0.22em] uppercase transition-colors ${path === l.href ? 'text-gold-hi' : 'text-cream/60 hover:text-gold-hi'}`}>{l.label}</Link>
          ))}
          <Link href="/order/checkout" className="relative">
            <ShoppingBag size={18} className="text-gold-hi/70 hover:text-gold-hi transition-colors" />
            {count > 0 && <span className="absolute -top-2 -right-2 bg-gold text-ink text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{count}</span>}
          </Link>
          <Link href="/contact" className="font-cinzel text-[8.5px] tracking-[0.22em] uppercase text-gold border border-gold/30 px-6 py-3 hover:bg-gold hover:text-ink transition-all">Reserve</Link>
        </div>
        <button className="md:hidden text-gold-hi" onClick={() => setOpen(true)}><Menu size={24} /></button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[490] bg-ink flex flex-col items-center justify-center gap-8">
          <button className="absolute top-7 right-[5%] text-cream/30" onClick={() => setOpen(false)}><X size={22} /></button>
          {links.map(l => (
            <Link key={l.href} href={l.href} className="font-italiana text-[34px] text-cream hover:text-gold-hi transition-colors" onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link href="/contact" className="btn-royal mt-4" onClick={() => setOpen(false)}>Reserve Your Date</Link>
        </div>
      )}
    </>
  )
}
