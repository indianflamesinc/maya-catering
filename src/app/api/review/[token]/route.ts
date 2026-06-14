// src/app/api/review/[token]/route.ts
// GET — loads quote snapshot for customer review page

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // Mark as viewed
  if (data.status === 'pending') {
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('token', token)
  }

  // Load enquiry details
  const { data: enquiry } = await supabase
    .from('enquiries')
    .select('customer_name, customer_email, event_type, event_date, guest_count, venue_name')
    .eq('id', data.enquiry_id)
    .single()

  return NextResponse.json({
    token,
    round_number: data.round_number,
    enquiry,
    snapshot: data.sent_snapshot,
    customer_changes: data.customer_changes,
  })
}
