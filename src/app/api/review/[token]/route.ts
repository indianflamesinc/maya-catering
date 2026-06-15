import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

// FIX-012 (Jun 15 2026): correct qty per pricing_type
// BEFORE: per_gallon and per_portion not handled → fell to tray_quantity=1
// AFTER:  all types read piece_count (with tray_quantity as fallback for old quotes)
function getCorrectQty(item: any): number {
  if (item.pricing_type === 'per_person') {
    return item.guest_count || item.tray_quantity || 1
  }
  if (
    item.pricing_type === 'per_piece' ||
    item.pricing_type === 'per_gallon' ||
    item.pricing_type === 'per_portion'
  ) {
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

  if (data.status === 'submitted' || data.status === 'expired') {
    return NextResponse.json({
      error: 'This review link has already been used or expired.',
      status: data.status
    }, { status: 410 })
  }

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

  const snapshot = {
    ...data.sent_snapshot,
    tray_items: (trayItems ?? []).map((item: any) => ({
      id: item.id,
      dish_name: item.dish_name || 'Item',
      category: item.cuisine_region || '',
      pricing_type: item.pricing_type || 'tray',
      tray_size: item.tray_size || null,
      // FIX-012: tray_quantity now always holds correct display qty for ALL pricing types
      tray_quantity: getCorrectQty(item),
      guest_count: item.guest_count || null,
      piece_count: item.piece_count || null,
      unit_price_cents: item.unit_price_cents || 0,
      total_price_cents: item.total_price_cents || 0,
      customer_comments: '',
    })),
  }

  return NextResponse.json({
    token,
    round_number: data.round_number,
    enquiry,
    snapshot,
    customer_changes: data.customer_changes,
  })
}
