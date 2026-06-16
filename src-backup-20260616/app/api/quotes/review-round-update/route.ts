// ============================================================
// src/app/api/quotes/review-round-update/route.ts
// POST — update a review round (status, notes, etc.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { round_id, updates } = await req.json();
    if (!round_id) return NextResponse.json({ error: 'round_id required' }, { status: 400 });

    const { error } = await supabase
      .from('quote_review_rounds')
      .update(updates)
      .eq('id', round_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
