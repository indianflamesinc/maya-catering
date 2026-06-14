// src/app/api/quotes/review-rounds/route.ts
// GET /api/quotes/review-rounds?enquiry_id=xxx

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const enquiry_id = req.nextUrl.searchParams.get('enquiry_id')
  if (!enquiry_id) return NextResponse.json({ rounds: [] })

  const { data, error } = await supabase
    .from('quote_review_rounds')
    .select('*')
    .eq('enquiry_id', enquiry_id)
    .order('round_number', { ascending: true })

  if (error) return NextResponse.json({ rounds: [] })
  return NextResponse.json({ rounds: data || [] })
}
