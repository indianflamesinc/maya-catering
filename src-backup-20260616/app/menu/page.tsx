import Nav from '@/components/layout/Nav'; import Footer from '@/components/layout/Footer'; import Link from 'next/link'
export const metadata = { title: 'Menu' }
export default function MenuPage() {
  return (<><Nav/><main className="pt-[88px] min-h-screen bg-ink"><div className="max-w-3xl mx-auto px-[7%] py-20 text-center"><span className="section-label">500+ Dishes</span><h1 className="display-h">Our <em className="font-cormorant italic text-gold-pale">Full Menu</em></h1><p className="text-cream/60 text-[15px] mb-8 leading-loose">Browse our complete regional Indian menu or go straight to ordering trays for your next gathering.</p><div className="flex gap-4 justify-center flex-wrap"><Link href="/order" className="btn-royal">Order Online Now</Link><a href="https://irp.cdn-website.com/b66b964d/files/uploaded/Maya_North_Indian_Catering_Menu.pdf" target="_blank" className="btn-ghost">Download North Indian PDF</a></div></div></main><Footer/></>)
}
