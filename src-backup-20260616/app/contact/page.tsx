import Nav from '@/components/layout/Nav'; import Footer from '@/components/layout/Footer'
export const metadata = { title: 'Contact Us' }
const faqs = [['What is the minimum order for weddings?','For catering packages, minimum 30 guests with 7 days advance notice. Wedding inquiries have no minimum.'],['Do you offer tray ordering for home parties?','Yes! Half trays (5–6 ppl), Medium (10–12), Full (25–30). No minimum order. 24–48 hr notice needed.'],['Which regional cuisines do you specialize in?','Punjabi, Rajasthani, Gujarati, Maharashtrian, Bengali, Kerala, Telugu, Karnataka, Tamil Nadu and more.'],['Do you serve outside Massachusetts?','Yes — MA, NH, RI, CT, ME and VT. Travel fees may apply for events outside Greater Boston.'],['Can you do banana leaf Sadya?','Yes! Full South Indian Sadya on banana leaf is one of our signature offerings for Kerala weddings.'],['Can we schedule a tasting?','Yes — call us at 617-987-5222 to schedule a tasting session before booking your event.']]
export default function ContactPage() {
  return (<><Nav/><main className="pt-[88px] min-h-screen bg-ink">
    <div className="bg-royal-mid border-b border-gold/20 py-16 px-[7%] text-center"><span className="section-label">Let's Begin Planning</span><h1 className="display-h">Get in <em className="font-cormorant italic text-gold-pale">Touch</em></h1></div>
    <div className="max-w-[1100px] mx-auto px-[7%] py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="border border-gold/20 mb-6">
          {[['Call','781-587-2123  |  617-987-5222'],['Email','info@mayaindiangrill.com'],['Web','www.mayacater.com'],['Order','order.mayacater.com'],['Visit','33 Tuttle St, Wakefield, MA 01880']].map(([l,v])=>(
            <div key={l} className="grid grid-cols-[80px_1fr] border-b border-gold/20 last:border-b-0">
              <div className="p-4 bg-gold/5 border-r border-gold/20 flex items-center"><span className="font-cinzel text-[8px] tracking-[0.25em] uppercase text-gold">{l}</span></div>
              <div className="p-4 text-[14px] text-cream/80">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{['MA','NH','RI','CT','ME','VT'].map(s=><span key={s} className="font-cinzel text-[9px] tracking-[0.2em] uppercase text-gold border border-gold/30 px-3 py-2">{s}</span>)}</div>
        <a href="tel:+17815872123" className="btn-royal inline-block">Call 781-587-2123</a>
      </div>
      <div>
        <h3 className="font-italiana text-[28px] text-cream mb-6">Frequently Asked Questions</h3>
        <div className="flex flex-col gap-4">
          {faqs.map(([q,a])=>(<div key={q} className="border border-gold/20 p-5 hover:bg-gold/5 transition-colors"><p className="font-cormorant italic text-[17px] text-cream mb-2">{q}</p><p className="text-[13px] text-cream/60 leading-relaxed">{a}</p></div>))}
        </div>
      </div>
    </div>
  </main><Footer/></>)
}
