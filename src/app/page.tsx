import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'

const regions = [
  { r:'North India', n:'Punjabi', d:'Butter Chicken · Dal Makhani · Sarson Da Saag · Amritsari Kulcha' },
  { r:'North India', n:'Rajasthani', d:'Dal Baati Churma · Laal Maas · Ker Sangri · Gatte Ki Sabzi' },
  { r:'West India', n:'Gujarati', d:'Dhokla · Undhiyu · Khandvi · Dal Dhokli · Mohanthal' },
  { r:'West India', n:'Maharashtrian', d:'Puran Poli · Misal Pav · Bharli Vangi · Modak' },
  { r:'East India', n:'Bengali', d:'Macher Jhol · Kosha Mangsho · Chingri Malaikari · Mishti Doi' },
  { r:'South India', n:'Telugu', d:'Gongura Mutton · Pesarattu · Pulihora · Hyderabadi Biryani' },
  { r:'South India', n:'Karnataka & Mangalore', d:'Bisi Bele Bath · Neer Dosa · Kori Rotti · Kundapur Chicken' },
  { r:'South India', n:'Kerala Style', d:'Sadya · Karimeen Pollichathu · Appam · Prawn Moilee · Avial' },
]

const testimonials = [
  { q:'"Maya transformed our wedding into a culinary ceremony as beautiful as our vows. Every guest was transported."', n:'Priya & Arjun Mehta', e:'Grand Wedding · Boston, MA' },
  { q:'"The Punjabi feast was beyond anything we imagined. Maya truly understands our culture."', n:'Gurpreet & Simran Dhaliwal', e:'Punjabi Wedding · Cambridge, MA' },
  { q:'"We ordered trays for our Diwali party and the food was restaurant quality. Will never order from anywhere else."', n:'Meera Patel', e:'Home Diwali Party · Wakefield, MA' },
]

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-[7%] pt-[88px] pb-24 relative overflow-hidden" style={{background:'linear-gradient(175deg,#0F1E40 0%,#05091A 65%)'}}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.026]" style={{backgroundImage:'linear-gradient(rgba(201,168,76,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,1) 1px,transparent 1px)',backgroundSize:'72px 72px'}} />
          <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 65% 55% at 50% 45%,rgba(201,168,76,0.08) 0%,transparent 68%)'}} />
          <div className="relative z-10 max-w-[960px]">
            <div className="w-[72px] h-[72px] mx-auto mb-6 opacity-50" style={{animation:'spin 60s linear infinite'}}>
              <svg viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="56" stroke="#C9A84C" strokeWidth=".7"/>
                <circle cx="60" cy="60" r="44" stroke="#C9A84C" strokeWidth=".4"/>
                <circle cx="60" cy="60" r="28" stroke="#C9A84C" strokeWidth=".7"/>
                <polygon points="60,4 116,60 60,116 4,60" stroke="#C9A84C" strokeWidth=".5" fill="none"/>
                <line x1="60" y1="4" x2="60" y2="116" stroke="#C9A84C" strokeWidth=".3" opacity=".5"/>
                <line x1="4" y1="60" x2="116" y2="60" stroke="#C9A84C" strokeWidth=".3" opacity=".5"/>
              </svg>
            </div>
            <span className="block font-cinzel text-[9px] tracking-[0.52em] text-gold uppercase mb-6">Wakefield · Boston · Serving All New England</span>
            <h1 className="font-cinzel text-[clamp(70px,13vw,150px)] text-gold-hi tracking-[0.18em] leading-[0.9] mb-2" style={{textShadow:'0 0 100px rgba(201,168,76,0.2)',fontFamily:'Cinzel Decorative,serif'}}>MAYA</h1>
            <span className="block font-cinzel text-[clamp(8px,1.1vw,11px)] tracking-[0.6em] text-cream/30 uppercase mb-8">Indian Catering Experiences · Est. Boston, Massachusetts</span>
            <p className="font-cormorant italic font-light text-[clamp(22px,3.5vw,44px)] text-gold-pale leading-[1.4] mb-5">"Curated Indian Celebrations — Grand Weddings<br/>to Intimate Home Gatherings"</p>
            <p className="text-[14px] font-light text-cream/60 max-w-[540px] mx-auto mb-12 leading-loose">Authentic regional Indian cuisine for every occasion — from royal wedding feasts to cozy home parties.</p>
            <div className="flex items-center justify-center gap-8 flex-wrap mb-10">
              {['Weddings','Home Parties','Corporate','Small Events'].map(b=>(
                <div key={b} className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border border-gold/30 rotate-45 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gold opacity-80"/></div>
                  <span className="font-cinzel text-[8px] tracking-[0.28em] text-gold uppercase">{b}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/order" className="btn-royal">Order Online Now</Link>
              <Link href="/events" className="btn-ghost">Plan Your Event</Link>
            </div>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </section>

        {/* STATS */}
        <div className="flex border-t border-b border-gold/20" style={{background:'linear-gradient(90deg,#0F1E40,#0A1530,#0F1E40)'}}>
          {[['4,500+','Events Catered'],['500+','Menu Items'],['200+','Corporate Clients'],['10+','Regional Cuisines'],['5 ★','Guest Satisfaction']].map(([n,l])=>(
            <div key={l} className="flex-1 min-w-[120px] py-8 px-4 text-center border-r border-gold/20 last:border-r-0">
              <span className="font-italiana text-[44px] text-gold-hi block leading-none mb-1">{n}</span>
              <span className="text-[8.5px] tracking-[0.22em] uppercase text-cream/30">{l}</span>
            </div>
          ))}
        </div>

        {/* SERVICES */}
        <section className="bg-ink py-20">
          <div className="max-w-[1200px] mx-auto px-[7%] text-center mb-12">
            <span className="section-label">How We Serve You</span>
            <h2 className="display-h">Every Occasion, <em className="font-cormorant italic text-gold-pale">Perfectly Catered</em></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
            {[
              {tag:'Grand Celebrations',title:'Wedding Catering',desc:'Multi-day wedding weekends, mehendi, sangeet, baraat and grand receptions.',img:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80',href:'/events'},
              {tag:'Milestones',title:'Events & Parties',desc:'Birthday celebrations, baby showers, graduation parties and corporate events.',img:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',href:'/events'},
              {tag:'Home & Intimate',title:'Home Party Trays',desc:'Order by the tray for home gatherings of 5 to 30. Ready for pickup.',img:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',href:'/order'},
            ].map(s=>(
              <Link key={s.title} href={s.href} className="relative overflow-hidden group block" style={{aspectRatio:'4/5'}}>
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{backgroundImage:`url('${s.img}')`,filter:'brightness(0.5) sepia(0.15)'}}/>
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-10" style={{background:'linear-gradient(to top,rgba(5,9,26,0.95) 0%,rgba(5,9,26,0.2) 55%,transparent 100%)'}}>
                  <span className="font-cinzel text-[8px] tracking-[0.35em] text-gold uppercase mb-2 block">{s.tag}</span>
                  <h3 className="font-italiana text-[clamp(28px,3vw,40px)] text-cream mb-2 leading-tight">{s.title}</h3>
                  <p className="text-[13px] text-cream/70 leading-relaxed opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* REGIONAL CUISINES */}
        <section className="sec bg-royal">
          <div className="sec-in">
            <div className="text-center mb-14">
              <span className="section-label">Our Regional Expertise</span>
              <h2 className="display-h">Flavours from Every <em className="font-cormorant italic text-gold-pale">Corner of India</em></h2>
              <p className="text-cream/50 text-[15px] max-w-[540px] mx-auto leading-loose">Specialists in authentic regional cuisines — each with its own unique spice palette and cultural heritage.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px border border-gold/20">
              {regions.map(r=>(
                <div key={r.n} className="p-7 bg-royal-mid border-r border-gold/20 last:border-r-0 group hover:bg-gold/5 transition-colors relative">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"/>
                  <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-2">{r.r}</span>
                  <div className="font-italiana text-[26px] text-cream mb-2">{r.n}</div>
                  <div className="text-[12px] text-cream/50 leading-relaxed">{r.d}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/order" className="btn-ghost">Explore Full Menu & Order</Link>
            </div>
          </div>
        </section>

        {/* TRAY CTA */}
        <section className="sec bg-ink">
          <div className="sec-in">
            <div className="text-center mb-14">
              <span className="section-label">For Home Gatherings</span>
              <h2 className="display-h">Order by the Tray — <em className="font-cormorant italic text-gold-pale">No Minimum Order</em></h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 border border-gold/20">
              <div className="p-14 bg-royal-mid">
                <h3 className="font-italiana text-[clamp(28px,4vw,44px)] text-cream mb-4">Feed 5 to 30 Guests<br/>from Your Own Kitchen</h3>
                <p className="text-cream/60 text-[15px] leading-loose mb-8">Pick your favourite dishes — curries, biryanis, breads and desserts — in the tray size that suits your gathering. Ready for pickup at Wakefield, MA.</p>
                <div className="flex gap-0 border border-gold/20 mb-8">
                  {[['Half Tray','5–6','120 oz'],['Medium Tray','10–12','228 oz'],['Full Tray','25–30','346 oz']].map(([n,p,o])=>(
                    <div key={n} className="flex-1 p-5 text-center border-r border-gold/20 last:border-r-0">
                      <span className="font-cinzel text-[8px] tracking-[0.2em] uppercase text-gold block mb-1">{n}</span>
                      <span className="font-italiana text-[28px] text-cream block">{p}</span>
                      <span className="text-[11px] text-cream/30">{o}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 flex-wrap">
                  <Link href="/order" className="btn-royal">View Menu & Order</Link>
                  <Link href="/contact" className="btn-ghost">Call to Order</Link>
                </div>
              </div>
              <div className="relative min-h-[400px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&q=80" alt="Indian food" className="w-full h-full object-cover" style={{filter:'brightness(0.65) sepia(0.1)'}}/>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="sec bg-royal-mid text-center relative overflow-hidden">
          <div className="sec-in relative z-10">
            <span className="section-label">What Our Guests Say</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {testimonials.map((t,i)=>(
                <div key={i} className="border border-gold/20 p-8 bg-royal text-left">
                  <div className="flex gap-1 mb-4">{[...Array(5)].map((_,j)=><span key={j} className="text-gold text-[16px]">★</span>)}</div>
                  <p className="font-cormorant italic text-[18px] text-cream leading-relaxed mb-6">{t.q}</p>
                  <p className="font-cinzel text-[9px] tracking-[0.2em] text-gold uppercase">{t.n}</p>
                  <p className="text-[11px] text-cream/40 mt-1">{t.e}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="py-20 px-[7%] text-center" style={{background:'linear-gradient(135deg,#0F1E40,#05091A)'}}>
          <span className="section-label">Ready to Begin?</span>
          <h2 className="display-h text-[clamp(32px,4vw,56px)]">Let's Plan Your <em className="font-cormorant italic text-gold-pale">Perfect Celebration</em></h2>
          <p className="text-cream/50 text-[15px] max-w-[480px] mx-auto mb-10">Tell us about your occasion and we will craft a bespoke proposal within 24 hours.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/contact" className="btn-royal">Reserve Your Date</Link>
            <Link href="/order" className="btn-ghost">Order Online Now</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
