import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const SELECT_FIELDS = `
  id, menu_item_id, condiment_id,
  default_qty, default_unit,
  show_on_quote, is_mandatory, sort_order,
  condiments ( id, name )
`

export async function GET(req: NextRequest) {
  
  const menu_item_id = new URL(req.url).searchParams.get('menu_item_id')
  if (!menu_item_id) return NextResponse.json({ error: 'menu_item_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('menu_condiment_map')
    .select(SELECT_FIELDS)
    .eq('menu_item_id', menu_item_id)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  
  const body = await req.json()
  const { data, error } = await supabase
    .from('menu_condiment_map')
    .insert({
      menu_item_id:  body.menu_item_id,
      condiment_id:  body.condiment_id,
      default_qty:   body.default_qty ?? 1,
      default_unit:  body.default_unit || 'Oz',
      show_on_quote: body.show_on_quote ?? false,
      is_mandatory:  body.is_mandatory ?? true,
      sort_order:    body.sort_order ?? 99,
    })
    .select(SELECT_FIELDS)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  
  const { id, ...fields } = await req.json()
  const { data, error } = await supabase
    .from('menu_condiment_map')
    .update(fields)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase
    .from('menu_condiment_map')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
