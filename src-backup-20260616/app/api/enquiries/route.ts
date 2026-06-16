import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - list all enquiries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assigned = searchParams.get('assigned_to')

  let query = supabaseAdmin
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') query = query.eq('status', status)
  if (assigned) query = query.eq('assigned_to', assigned)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ enquiries: data })
}

// POST - create new enquiry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_name, customer_phone, customer_email,
      event_type, event_date, event_time,
      venue_name, venue_address, guest_count,
      delivery_type, catering_type,
      cuisine_preferences, budget_min, budget_max,
      special_requirements, dietary_restrictions,
      heard_about, referred_by,
      assigned_to, internal_notes, follow_up_date,
    } = body

    if (!customer_name || !customer_phone || !event_date) {
      return NextResponse.json({ error: 'customer_name, customer_phone and event_date are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('enquiries')
      .insert({
        customer_name, customer_phone,
        customer_email: customer_email || null,
        event_type, event_date,
        event_time: event_time || null,
        venue_name: venue_name || null,
        venue_address: venue_address || null,
        guest_count: parseInt(guest_count) || 50,
        delivery_type: delivery_type || 'venue',
        catering_type: catering_type || null,
        cuisine_preferences: cuisine_preferences || [],
        budget_min: budget_min ? parseInt(budget_min) : null,
        budget_max: budget_max ? parseInt(budget_max) : null,
        special_requirements: special_requirements || null,
        dietary_restrictions: dietary_restrictions || null,
        heard_about: heard_about || null,
        referred_by: referred_by || null,
        assigned_to: assigned_to || 'Ashok',
        internal_notes: internal_notes || null,
        follow_up_date: follow_up_date || null,
        status: 'new',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Enquiry save error:', err)
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 })
  }
}
