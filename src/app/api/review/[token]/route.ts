import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    return NextResponse.json({ error: 'This review link has already been used or expired.', status: data.status }, { status: 410 })
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

  const { data: trayItems, error: trayError } = await supabase
    .from('quote_tray_items')
    .select('*')
    .eq('quote_id', data.quote_id)

  const snapshot = {
    ...data.sent_snapshot,
    tray_items: (trayItems ?? []).map((item: any) => ({
      id: item.id,
      dish_name: item.dish_name || 'Item',
      category: item.cuisine_region || '',
      tray_size: item.tray_size || 'Full',
      tray_quantity: item.tray_quantity || 1,
      pricing_type: 'Per Tray',
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
    tray_debug: { count: trayItems?.length ?? 0, error: trayError?.message, quote_id: data.quote_id },
    customer_changes: data.customer_changes,
  })
}
