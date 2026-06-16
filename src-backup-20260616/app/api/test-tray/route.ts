import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('quote_tray_items')
    .select('id, dish_name, tray_quantity')
    .limit(3)
  
  return NextResponse.json({ data, error, url: process.env.NEXT_PUBLIC_SUPABASE_URL })
}
