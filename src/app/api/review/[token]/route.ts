// src/app/api/review/[token]/route.ts
// FIX-012 (Jun 15 2026): getCorrectQty() reads correct field per pricing_type
//   BEFORE: per_gallon/per_portion not handled → fell to tray_quantity=1
//   AFTER:  all pricing types handled; piece_count used for per_piece/per_gallon/per_portion
// FIX-029 (Jun 15 2026): notes_to_customer included in snapshot map
//   BEFORE: field missing from snapshot — notes showed in email but NOT on review page URL
//   AFTER:  notes_to_customer mapped from DB and returned in snapshot
// FIX-031 (Jun 15 2026): graceful status handling replaces 410 errors
//   BEFORE: submitted/expired tokens returned 410 error → customer saw 'Link Unavailable'
//   AFTER:  each status returns descriptive data; review page renders appropriate state:
//           pending_maya → 'feedback received'; accepted → permanent order view; expired → 'new link sent'
// FIX-032 (Jun 15 2026): thread[] and admin_reply loaded from snapshot for Round 2+
//   BEFORE: no thread data in snapshot — conversation history invisible to customer
//   AFTER:  thread[] (history) and admin_reply (latest) read from snapshot/DB and returned
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

  // FIX-046 (Jun 16 2026): Two different snapshot strategies based on round number
  // BEFORE: always re-fetched tray_items from DB — lost thread/admin_reply (not stored in DB)
  // AFTER:
  //   Round 1 (pending/viewed): re-fetch from DB to get latest notes_to_customer
  //   Round 2+ (pending_customer): use sent_snapshot DIRECTLY — has thread/admin_reply baked in
  //   This is the key fix for Issue 4 — thread history now shows correctly on review page

  if (data.status === 'pending_customer') {
    // Round 2+ — use snapshot directly, it has full thread data from send-reply
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, guest_count, venue_name')
      .eq('id', data.enquiry_id)
      .single()

    return NextResponse.json({
      token,
      status: data.status,
      round_number: data.round_number,
      enquiry,
      snapshot: data.sent_snapshot, // FIX-046: use snapshot directly — has thread/admin_reply
      customer_changes: data.customer_changes,
      admin_overall_reply: data.sent_snapshot?.admin_overall_reply || null,
    })
  }

  // Round 1 — pending or viewed → re-fetch from DB for latest notes_to_customer
  if (data.status === 'pending') {
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('token', token)
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
      // FIX-041: ?? not || so qty=0 is preserved
      tray_quantity: getCorrectQty(item),
      guest_count: item.guest_count || null,
      piece_count: item.piece_count || null,
      unit_price_cents: item.unit_price_cents || 0,
      total_price_cents: item.total_price_cents || 0,
      // FIX-029: notes_to_customer from DB (Round 1 only path)
      notes_to_customer: item.notes_to_customer || '',
      customer_comments: '',
      thread: [],       // Round 1 has no thread history
      admin_reply: '',  // Round 1 has no admin reply yet
    })),
  }

  return NextResponse.json({
    token,
    status: data.status,
    round_number: data.round_number,
    enquiry,
    snapshot,
    customer_changes: data.customer_changes,
    admin_overall_reply: null,
  })
}
