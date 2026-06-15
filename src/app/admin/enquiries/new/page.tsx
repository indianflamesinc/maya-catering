'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Calendar, Users, MapPin, ChefHat, Save } from 'lucide-react'
import { EventType, DeliveryType, HearAbout, EVENT_TYPE_LABELS, CUISINE_OPTIONS, EnquiryFormData } from '@/types/crm'

const EMPTY: EnquiryFormData = {
  customer_name: '', customer_phone: '', customer_email: '',
  event_type: 'wedding' as EventType, event_date: '', event_time: '',
  venue_name: '', venue_address: '', guest_count: '',
  delivery_type: 'venue' as DeliveryType,
  cuisine_preferences: [], budget_min: '', budget_max: '',
  special_requirements: '', dietary_restrictions: '',
  heard_about: 'referral_friend' as HearAbout, referred_by: '',
  assigned_to: 'Ashok', internal_notes: '', follow_up_date: '',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-cinzel text-[8px] tracking-[0.28em] uppercase text-gold mb-2">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp = "w-full bg-transparent border-b border-gold/20 pb-2.5 text-cream font-jost font-light text-[14px] outline-none placeholder:text-cream/20 focus:border-gold transition-colors"
const sel = "w-full bg-royal-mid border border-gold/20 text-cream font-jost font-light text-[14px] outline-none px-3 py-2.5 focus:border-gold transition-colors"

export default function NewEnquiryPage() {
  const router = useRouter()
  const [form, setForm] = useState<EnquiryFormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof EnquiryFormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  function toggleCuisine(c: string) {
    set('cuisine_preferences',
      form.cuisine_preferences.includes(c)
        ? form.cuisine_preferences.filter((x: string) => x !== c)
        : [...form.cuisine_preferences, c]
    )
  }

  // FIX-009 (Jun 15 2026): changed andNext from 'tasting' to 'quote' | 'tasting'
  // - 'quote'   → save then redirect to /admin/enquiries/[id]/quote
  // - 'tasting' → save then redirect to /admin/enquiries/[id]/tasting (unchanged)
  // - undefined → save then redirect to /admin/enquiries list (unchanged)
  async function handleSave(andNext?: 'quote' | 'tasting') {
    if (!form.customer_name || !form.customer_phone || !form.event_date) {
      setError('Please fill in customer name, phone and event date.')
      return
    }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        guest_count: parseInt(form.guest_count as string) || 50,
        budget_min: form.budget_min ? Math.abs(parseInt(form.budget_min as string)) : null,
        budget_max: form.budget_max ? Math.abs(parseInt(form.budget_max as string)) : null,
      }
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      // FIX-009: route to quote builder instead of tasting
      if (andNext === 'quote')   router.push(`/admin/enquiries/${data.id}/quote`)
      else if (andNext === 'tasting') router.push(`/admin/enquiries/${data.id}/tasting`)
      else router.push('/admin/enquiries')
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const eventDate = form.event_date ? new Date(form.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-ink">
      <div className="bg-royal-mid border-b border-gold/20 px-8 py-5 flex items-center gap-6">
        <Link href="/admin/enquiries" className="text-gold/50 hover:text-gold transition-colors"><ArrowLeft size={20} /></Link>
        <div>
          <span className="font-cinzel text-[8px] tracking-[0.4em] uppercase text-gold block mb-0.5">New Enquiry</span>
          <h1 className="font-italiana text-[32px] text-cream leading-none">Capture Customer Call</h1>
        </div>
        <div className="ml-auto flex gap-3">
          {/* FIX-009: replaced "Save + Schedule Tasting" with "Save + Quote" in header */}
          <button onClick={() => handleSave('quote')} disabled={saving}
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase border border-gold/30 text-gold px-5 py-3 hover:bg-gold/10 transition-colors disabled:opacity-40">
            Save + Quote
          </button>
          <button onClick={() => handleSave()} disabled={saving}
            className="font-cinzel text-[8px] tracking-[0.22em] uppercase bg-gold text-ink px-6 py-3 hover:bg-gold-hi transition-colors disabled:opacity-40 flex items-center gap-2">
            <Save size={14} />{saving ? 'Saving...' : 'Save Enquiry'}
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 py-10">
        {error && <div className="mb-6 border border-red-500/40 bg-red-500/10 px-5 py-3 text-red-400 text-[13px]">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Customer */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-6"><Phone size={16} className="text-gold" /><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Customer Details</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name" required><input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} className={inp} placeholder="Priya Sharma" /></Field>
                <Field label="Phone Number" required><input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} className={inp} placeholder="617-000-0000" type="tel" /></Field>
                <Field label="Email Address"><input value={form.customer_email} onChange={e => set('customer_email', e.target.value)} className={inp} placeholder="priya@email.com" type="email" /></Field>
                <Field label="How did they hear about MAYA?">
                  <select value={form.heard_about} onChange={e => set('heard_about', e.target.value)} className={sel}>
                    <option value="google">Google Search</option>
                    <option value="referral_planner">Wedding Planner Referral</option>
                    <option value="referral_venue">Venue Manager Referral</option>
                    <option value="referral_friend">Friend / Family Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="repeat_customer">Repeat Customer</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                {['referral_planner','referral_venue','referral_friend'].includes(form.heard_about) && (
                  <Field label="Referred by (name)"><input value={form.referred_by} onChange={e => set('referred_by', e.target.value)} className={inp} placeholder="Name of referrer" /></Field>
                )}
              </div>
            </div>

            {/* Event */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-6"><Calendar size={16} className="text-gold" /><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Event Details</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Event Type" required>
                  <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className={sel}>
                    {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Guest Count (approximate)" required><input value={form.guest_count} onChange={e => set('guest_count', e.target.value)} className={inp} placeholder="150" type="number" min="1" /></Field>
                <Field label="Event Date" required><input value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inp} type="date" /></Field>
                <Field label="Event Time"><input value={form.event_time} onChange={e => set('event_time', e.target.value)} className={inp} placeholder="6:00 PM" /></Field>
                <Field label="Catering Type">
                  <select value={form.delivery_type} onChange={e => set('delivery_type', e.target.value)} className={sel}>
                    <option value="venue">Catering at Venue</option>
                    <option value="delivery">Delivery to Address</option>
                    <option value="pickup">Pickup from MAYA Kitchen</option>
                  </select>
                </Field>
                <Field label="Approximate Budget">
                  <div className="flex gap-3 items-center">
                    <input value={form.budget_min} onChange={e => set('budget_min', e.target.value)} className={inp} placeholder="Min $" type="number" min="0" />
                    <span className="text-cream/30 flex-shrink-0">to</span>
                    <input value={form.budget_max} onChange={e => set('budget_max', e.target.value)} className={inp} placeholder="Max $" type="number" min="0" />
                  </div>
                </Field>
              </div>
            </div>

            {/* Venue */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-6"><MapPin size={16} className="text-gold" /><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Venue Details</span></div>
              <div className="grid grid-cols-1 gap-5">
                <Field label="Venue Name"><input value={form.venue_name} onChange={e => set('venue_name', e.target.value)} className={inp} placeholder="Marriott Peabody, Burlington Marriott..." /></Field>
                <Field label="Venue Address"><input value={form.venue_address} onChange={e => set('venue_address', e.target.value)} className={inp} placeholder="Full venue address" /></Field>
              </div>
            </div>

            {/* Menu preferences */}
            <div className="border border-gold/20 bg-royal-mid p-7">
              <div className="flex items-center gap-3 mb-6"><ChefHat size={16} className="text-gold" /><span className="font-cinzel text-[9px] tracking-[0.35em] uppercase text-gold">Menu Preferences</span></div>
              <Field label="Cuisine Preferences (select all that apply)">
                <div className="flex flex-wrap gap-2 mt-3">
                  {CUISINE_OPTIONS.map((c: string) => (
                    <button key={c} type="button" onClick={() => toggleCuisine(c)}
                      className={`font-cinzel text-[7.5px] tracking-[0.18em] uppercase px-3 py-2 border transition-all ${form.cuisine_preferences.includes(c) ? 'bg-gold text-ink border-gold' : 'border-gold/20 text-gold/70 hover:border-gold/50'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-5 mt-5">
                <Field label="Dietary Restrictions"><input value={form.dietary_restrictions} onChange={e => set('dietary_restrictions', e.target.value)} className={inp} placeholder="Vegan, nut allergy, Jain, no onion/garlic..." /></Field>
                <Field label="Special Requirements"><textarea value={form.special_requirements} onChange={e => set('special_requirements', e.target.value)} rows={3} className={inp + ' resize-none'} placeholder="Live stations, specific setup, special dishes, cultural requirements..." /></Field>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <div className="border border-gold/30 bg-gold/5 p-5">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-4">Enquiry Summary</span>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {[['Customer', form.customer_name || '—'], ['Phone', form.customer_phone || '—'], ['Event', EVENT_TYPE_LABELS[form.event_type as EventType]], ['Date', eventDate], ['Guests', form.guest_count ? `${form.guest_count} guests` : '—'], ['Venue', form.venue_name || '—']].map(([l, v]) => (
                  <div key={l} className="flex justify-between"><span className="text-cream/50">{l}</span><span className="text-cream text-right max-w-[180px]">{v}</span></div>
                ))}
                {form.budget_min && <div className="flex justify-between"><span className="text-cream/50">Budget</span><span className="text-cream">${form.budget_min}{form.budget_max ? ` – $${form.budget_max}` : '+'}</span></div>}
              </div>
            </div>

            <div className="border border-gold/20 bg-royal-mid p-5">
              <span className="font-cinzel text-[8px] tracking-[0.3em] uppercase text-gold block mb-5">Internal (not shared with customer)</span>
              <div className="flex flex-col gap-4">
                <Field label="Assigned to">
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className={sel}>
                    <option value="Ashok">Ashok</option>
                    <option value="Kannan">Kannan</option>
                    <option value="Bala">Bala</option>
                  </select>
                </Field>
                <Field label="Follow-up date"><input value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} className={inp} type="date" /></Field>
                <Field label="Internal notes"><textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={4} className={inp + ' resize-none'} placeholder="Notes for internal team only..." /></Field>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => handleSave()} disabled={saving} className="btn-royal w-full text-center flex items-center justify-center gap-2">
                <Save size={14} />{saving ? 'Saving...' : 'Save Enquiry'}
              </button>
              {/* FIX-009: bottom buttons — Save+Quote (primary action) + Save+Tasting (secondary) */}
              <button onClick={() => handleSave('quote')} disabled={saving} className="btn-ghost w-full text-center">Save + Quote</button>
              <button onClick={() => handleSave('tasting')} disabled={saving} className="btn-ghost w-full text-center opacity-50 text-[11px]">Save + Schedule Tasting</button>
              <Link href="/admin/enquiries" className="block text-center font-cinzel text-[8px] tracking-[0.2em] uppercase text-cream/30 hover:text-cream/60 transition-colors mt-1">Cancel</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
