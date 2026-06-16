import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

// FIX-012 (Jun 15 2026): correct qty per pricing_type
function getCorrectQty(item: any): number {
  if (item.pricing_type === 'per_person') return item.guest_count || item.tray_quantity || 1
  if (item.pricing_type === 'per_piece' || item.pricing_type === 'per_gallon' || item.pricing_type === 'per_portion') {
    return item.piece_count || item.tray_quantity || 1
  }
  if (item.pricing_type === 'tray') {
    if (item.tray_size === 'custom') return item.tray_quantity || 1
    return 1
  }
  return item.tray_quantity || 1
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  const { data, error } = await supabase
    .from('quote_review_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  // FIX-031 (Jun 15 2026): graceful states instead of 410 error
  // submitted/pending_maya → show "received" page (not error)
  // accepted → show permanent order confirmation
  // expired → show "new link sent" message
  if (data.status === 'pending_maya' || data.status === 'submitted') {
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, guest_count, venue_name')
      .eq('id', data.enquiry_id)
      .single()
    return NextResponse.json({
      token,
      status: 'pending_maya',
      round_number: data.round_number,
      enquiry,
      snapshot: data.sent_snapshot,
    })
  }

  if (data.status === 'accepted') {
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, guest_count, venue_name')
      .eq('id', data.enquiry_id)
      .single()
    return NextResponse.json({
      token,
      status: 'accepted',
      round_number: data.round_number,
      enquiry,
      snapshot: data.sent_snapshot,
    })
  }

  if (data.status === 'expired') {
    return NextResponse.json({
      token,
      status: 'expired',
      round_number: data.round_number,
    })
  }

  // pending or pending_customer or viewed → show review form
  if (data.status === 'pending' || data.status === 'pending_customer') {
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('token', token)
      .eq('status', 'pending') // only update if still pending (not pending_customer)
  }

  const { data: enquiry } = await supabase
    .from('enquiries')
    .select('customer_name, customer_email, event_type, event_date, guest_count, venue_name')
    .eq('id', data.enquiry_id)
    .single()

  const { data: trayItems } = await supabase
    .from('quote_tray_items')
    .select('*')
    .eq('quote_id', data.quote_id)
    .order('sort_order', { ascending: true })

  const snapshot = {
    ...data.sent_snapshot,
    tray_items: (trayItems ?? []).map((item: any) => ({
      id: item.id,
      dish_name: item.dish_name || 'Item',
      category: item.cuisine_region || '',
      pricing_type: item.pricing_type || 'tray',
      tray_size: item.tray_size || null,
      tray_quantity: getCorrectQty(item),
      guest_count: item.guest_count || null,
      piece_count: item.piece_count || null,
      unit_price_cents: item.unit_price_cents || 0,
      total_price_cents: item.total_price_cents || 0,
      // FIX-029 (Jun 15 2026): notes_to_customer now included in review page
      // Previously missing — only showed in email not in the review link
      notes_to_customer: item.notes_to_customer || '',
      customer_comments: '',
      // FIX-032: thread history from snapshot (populated from Round 2 onwards)
      thread: item.thread || data.sent_snapshot?.tray_items?.find((s: any) => s.id === item.id)?.thread || [],
      admin_reply: item.admin_reply || data.sent_snapshot?.tray_items?.find((s: any) => s.id === item.id)?.admin_reply || '',
    })),
  }

  return NextResponse.json({
    token,
    status: data.status,
    round_number: data.round_number,
    enquiry,
    snapshot,
    customer_changes: data.customer_changes,
    admin_overall_reply: data.sent_snapshot?.admin_overall_reply || null,
  })
}
