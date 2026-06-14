import Link from 'next/link'
export default function Footer() {
  return (
    <footer className="bg-ink border-t border-gold/20">
      <div className="max-w-[1200px] mx-auto px-[7%] py-20 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <div className="font-cinzel text-[22px] tracking-[0.22em] text-gold-hi mb-1" style={{fontFamily:'Cinzel Decorative,serif'}}>MAYA</div>
          <span className="block text-[7.5px] tracking-[0.42em] text-cream/30 uppercase mb-4">Indian Catering · Boston</span>
          <p className="font-cormorant italic text-[20px] text-gold opacity-60 mb-3">Elegant gatherings. Beautifully hosted.</p>
          <p className="text-[13px] text-cream/50 leading-loose">Authentic regional Indian cuisine for weddings, home parties & events across New England.</p>
        </div>
        <div>
          <h5 className="font-cinzel text-[8.5px] tracking-[0.3em] uppercase text-gold mb-5">Services</h5>
          <ul className="flex flex-col gap-3">
            {[['Wedding Catering','/events'],['Home Party Trays','/order'],['Corporate Events','/events'],['Order Online','/order']].map(([l,h])=>(
              <li key={l}><Link href={h} className="text-[13px] text-cream/50 hover:text-cream transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="font-cinzel text-[8.5px] tracking-[0.3em] uppercase text-gold mb-5">Cuisines</h5>
          <ul className="flex flex-col gap-3">
            {['North Indian','South Indian','Punjabi Style','Kerala Style','Bengali Style'].map(c=>(
              <li key={c}><Link href="/order" className="text-[13px] text-cream/50 hover:text-cream transition-colors">{c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="font-cinzel text-[8.5px] tracking-[0.3em] uppercase text-gold mb-5">Contact</h5>
          <ul className="flex flex-col gap-3 text-[13px] text-cream/50">
            <li><a href="tel:+17815872123" className="hover:text-cream transition-colors">781-587-2123</a></li>
            <li><a href="tel:+16179875222" className="hover:text-cream transition-colors">617-987-5222</a></li>
            <li><a href="mailto:info@mayaindiangrill.com" className="hover:text-cream transition-colors">info@mayaindiangrill.com</a></li>
            <li>33 Tuttle St, Wakefield, MA 01880</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gold/10 px-[7%] py-5 max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-3 text-[10px] tracking-[0.1em] text-cream/30">
        <span>© 2026 MAYA Indian Catering. All rights reserved.</span>
        <span className="font-cinzel text-[10px] tracking-[0.28em] text-gold">✦ MAYA ✦</span>
        <span>MA · NH · RI · CT · ME · VT</span>
      </div>
    </footer>
  )
}
