import Nav from '@/components/layout/Nav'; import Footer from '@/components/layout/Footer'; import Link from 'next/link'
export const metadata = { title: 'Events & Weddings' }
const types = [['💍','Wedding Catering','Multi-day wedding weekends, mehendi, sangeet, baraat and grand receptions. Bespoke menus from 50 to 500+ guests.'],['🎂','Birthday & Parties','Birthday celebrations, baby showers, graduation parties — beautiful food for every milestone.'],['🏢','Corporate Events','Office lunches, holiday parties, conferences and client dinners. Professional catering across New England.'],['🏠','Home Party Trays','Order by the tray for home gatherings of 5 to 30. No minimum order. Pickup from Wakefield, MA.']]
export default function EventsPage() {
  return (<><Nav/><main className="pt-[88px] min-h-screen bg-ink">
    <div className="bg-royal-mid border-b border-gold/20 py-16 px-[7%] text-center"><span className="section-label">Every Occasion Beautifully Hosted</span><h1 className="display-h">Events & <em className="font-cormorant italic text-gold-pale">Celebrations</em></h1></div>
    <div className="max-w-[1100px] mx-auto px-[7%] py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {types.map(([ico,t,d])=>(<div key={t} className="card-royal p-8"><span className="text-3xl block mb-4">{ico}</span><h3 className="font-italiana text-[28px] text-cream mb-3">{t}</h3><p className="text-cream/60 text-[14px] leading-loose">{d}</p></div>))}
      </div>
      <div className="border border-gold/20 bg-royal-mid p-12 text-center">
        <span className="section-label">Let's Plan Your Celebration</span>
        <h2 className="display-h text-[clamp(28px,4vw,48px)]">Tell Us Your <em className="font-cormorant italic text-gold-pale">Vision</em></h2>
        <p className="text-cream/60 text-[15px] max-w-lg mx-auto mb-8 leading-loose">Contact us and we'll craft a bespoke proposal within 24 hours. Packages from $20/person for 30+ guests.</p>
        <div className="flex gap-4 justify-center flex-wrap"><Link href="/contact" className="btn-royal">Get a Proposal</Link><Link href="/order" className="btn-ghost">Order Trays Instead</Link></div>
      </div>
    </div>
  </main><Footer/></>)
}
