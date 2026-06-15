import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const enquiry_id = searchParams.get('enquiry_id')

  let query = supabaseAdmin
    .from('quotes')
    .select(`
      *,
      quote_tray_items(*),
      quote_sessions(
        *,
        quote_session_categories(
          *,
          quote_session_dishes(*)
        )
      ),
      quote_labour(*)
    `)
    .order('version', { ascending: false })

  if (enquiry_id) query = query.eq('enquiry_id', enquiry_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quotes: data })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      enquiry_id, catering_type,
      subtotal_cents, labour_cents,
      discount_type, discount_value, discount_amount_cents, discount_note,
      tax_rate, tax_cents,
      delivery_cents, total_cents,
      change_notes, status,
      sessions, tray_items,
    } = body

    // Get current version number for this enquiry
    const { data: existing } = await supabaseAdmin
      .from('quotes')
      .select('version')
      .eq('enquiry_id', enquiry_id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1

    // Mark all previous versions as not current
    await supabaseAdmin
      .from('quotes')
      .update({ is_current: false })
      .eq('enquiry_id', enquiry_id)

    // Create new quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        enquiry_id, catering_type,
        version: nextVersion,
        is_current: true,
        subtotal_cents: subtotal_cents || 0,
        labour_cents: labour_cents || 0,
        discount_type: discount_type || null,
        discount_value: discount_value || 0,
        discount_amount_cents: discount_amount_cents || 0,
        discount_note: discount_note || null,
        tax_rate: tax_rate || 7,
        tax_cents: tax_cents || 0,
        delivery_cents: delivery_cents || 0,
        total_cents: total_cents || 0,
        change_notes: change_notes || null,
        status: status || 'draft',
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // Save tray items
    if (tray_items?.length > 0) {
      const { error: trayError } = await supabaseAdmin
        .from('quote_tray_items')
        .insert(tray_items.map((item: any, i: number) => {
          // Map correct price field based on pricing type
          const pricingType = item.pricing_type || 'tray'

          // Resolve unit price based on pricing type
          const unitPrice =
            pricingType === 'per_person'  ? (item.per_person_price_cents || item.unit_price_cents || 0) :
            pricingType === 'per_piece'   ? (item.per_piece_price_cents  || item.unit_price_cents || 0) :
            (item.unit_price_cents || 0)

          // Calculate total based on pricing type
          let totalPrice = 0
          if (pricingType === 'per_person') {
            totalPrice = (item.guest_count || 0) * unitPrice
          } else if (pricingType === 'per_piece' || pricingType === 'per_gallon' || pricingType === 'per_portion') {
            totalPrice = (item.piece_count || 0) * unitPrice
          } else if (pricingType === 'tray') {
            if (item.tray_size === 'custom') {
              // Multiple trays: tray_quantity × full tray price
              totalPrice = Math.round((item.tray_quantity || 1) * unitPrice)
            } else {
              // Fixed tray size: price is already set for that size
              totalPrice = unitPrice
            }
          }

          return {
            quote_id: quote.id,
            dish_name: item.dish_name,
            pricing_type: pricingType,
            tray_size: item.tray_size || null,
            tray_quantity: item.tray_quantity || null,
            quantity: item.quantity || 1,
            unit_price_cents: unitPrice,
            total_price_cents: totalPrice,
            guest_count: item.guest_count || null,
            piece_count: item.piece_count || null,
            customer_comments: item.customer_comments || null,
            sort_order: i,
          }
        }))
      if (trayError) {
        console.error('Tray items error:', trayError)
        return NextResponse.json({ error: 'Tray items save failed: ' + trayError.message, trayError }, { status: 500 })
      }
    }

    // Save sessions
    if (sessions?.length > 0) {
      for (const sess of sessions) {
        const { data: sessionData, error: sessError } = await supabaseAdmin
          .from('quote_sessions')
          .insert({
            quote_id: quote.id,
            session_name: sess.session_name,
            guest_count: sess.guest_count,
            price_per_person: sess.use_overall_price ? Math.round(sess.price_per_person * 100) : null,
          })
          .select()
          .single()

        if (sessError) { console.error('Session error:', sessError); continue }

        // Save categories
        for (const cat of sess.categories) {
          const { data: catData, error: catError } = await supabaseAdmin
            .from('quote_session_categories')
            .insert({
              session_id: sessionData.id,
              category_name: cat.category_name,
              price_per_person: Math.round(cat.price_per_person * 100),
            })
            .select()
            .single()

          if (catError) { console.error('Cat error:', catError); continue }

          // Save dishes
          if (cat.dishes?.length > 0) {
            await supabaseAdmin
              .from('quote_session_dishes')
              .insert(cat.dishes.map((d: any, i: number) => ({
                session_id: sessionData.id,
                category_id: catData.id,
                dish_name: d.dish_name,
                is_live_station: d.is_live_station || false,
                is_passing: d.is_passing || false,
                notes: d.notes || null,
                sort_order: i,
              })))
          }
        }

        // Save labour
        if (sess.labour_staff > 0) {
          await supabaseAdmin
            .from('quote_labour')
            .insert({
              quote_id: quote.id,
              session_name: sess.session_name,
              num_staff: sess.labour_staff,
              rate_per_person: Math.round(sess.labour_rate * 100),
              total_cents: sess.labour_staff * Math.round(sess.labour_rate * 100),
              note: sess.labour_note || null,
            })
        }
      }
    }

    // Update enquiry status to 'quoted' if sending
    if (status === 'sent') {
      await supabaseAdmin
        .from('enquiries')
        .update({ status: 'quoted' })
        .eq('id', enquiry_id)
    }

    return NextResponse.json({ quote, version: nextVersion })
  } catch (err: any) {
    console.error('Quote save error:', err)
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 })
  }
}
