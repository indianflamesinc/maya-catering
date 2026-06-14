'use client'
import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { clearCart } from '@/lib/store'
import { useSearchParams } from 'next/navigation'

function Content() {
  const p = useSearchParams()
  const orderId = p.get('order_id')
  useEffect(() => clearCart(), [])
  return (
    <div className="max-w-2xl mx-auto px-[7%] py-20 text-center">
      <div className="w-16 h-16 border border-gold/40 rotate-45 flex items-center justify-center mx-auto mb-8"><span className="text-gold text-2xl -rotate-45">✓</span></div>
      <span className="section-label">Order Confirmed</span>
      <h1 className="display-h text-[clamp(32px,4vw,52px)]">Thank You for <em className="font-cormorant italic text-gold-pale">Your Order!</em></h1>
      <div className="border border-gold/20 bg-royal-mid p-8 mb-8 text-left mt-8">
        <p className="text-cream/70 text-[15px] leading-loose mb-4">Your order is confirmed and payment received. We will prepare your food fresh and have it ready for pickup.</p>
        {orderId&&<p className="font-cinzel text-[9px] tracking-[0.2em] uppercase text-gold">Order ID: {orderId}</p>}
        <div className="mt-6 pt-6 border-t border-gold/20">
          <p className="font-cinzel text-[9px] tracking-[0.25em] uppercase text-gold mb-2">Pickup Location</p>
          <p className="text-cream/70 text-[14px]">33 Tuttle St, Wakefield, MA 01880</p>
          <p className="text-cream/50 text-[13px] mt-1">Questions? Call 781-587-2123 or 617-987-5222</p>
        </div>
      </div>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link href="/order" className="btn-royal">Order Again</Link>
        <Link href="/" className="btn-ghost">Back to Home</Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <>
      <Nav />
      <main className="pt-[88px] min-h-screen bg-ink">
        <Suspense fallback={<div className="text-center pt-20 text-cream/40">Loading...</div>}><Content/></Suspense>
      </main>
      <Footer />
    </>
  )
}
