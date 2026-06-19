// src/app/api/quotes/route.ts
// FIX-003 (Jun 15 2026): piece_count now saved in tray_items INSERT
//   BEFORE: piece_count was missing from INSERT — always NULL in DB
//   AFTER:  piece_count saved correctly; fixes WAS column in ReviewRoundsPanel
// FIX-005 (Jun 15 2026): delivery/setup/service fee fields added to INSERT
//   BEFORE: only subtotal/tax/total saved; fee columns missing causing fees to reset on reload
//   AFTER:  all fee fields saved with both old and new field names for backwards compat
// FIX-093 (Jun 18 2026): condiment columns added to quote_tray_items INSERT
//   BEFORE: is_condiment/parent_item_id/condiment_map_id/show_on_quote/condiment_qty/
//           condiment_unit were never written — condiment rows built in TrayItemsSection
//           were silently dropped the moment the quote was saved, never reaching the DB
//   AFTER:  all 6 condiment fields saved; condiment rows now persist through quote save
//           and flow correctly into send-review snapshot building

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
      // FIX-005 (Jun 15 2026): added fee fields — were not being saved to DB
      // These columns were also missing from the quotes table (added via SQL ALTER TABLE)
      delivery_fee_cents, setup_fee_cents, service_fee_cents,
      // FIX-005: discount_cents is the computed dollar amount saved separately for snapshot use
      discount_cents,
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

    // FIX-005: now saving delivery_fee_cents, setup_fee_cents, service_fee_cents, discount_cents
    // Previously these were missing → fees showed $0 in email even when entered in Quote Builder
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
        // FIX-005: fee columns (require SQL: ALTER TABLE quotes ADD COLUMN IF NOT EXISTS ...)
        delivery_fee_cents: delivery_fee_cents || 0,
        setup_fee_cents: setup_fee_cents || 0,
        service_fee_cents: service_fee_cents || 0,
        discount_cents: discount_cents || 0,
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // Save tray items
    // FIX-093 (Jun 18 2026): two-pass insert for condiment parent linkage.
    // BEFORE: a single bulk insert() meant condiment rows' parent_item_id pointed at
    //         client-side ids (uid() or stale DB ids from a previous version) that
    //         don't exist as real DB rows in THIS insert — the FK relationship was
    //         meaningless/broken the moment a quote was saved more than once.
    // AFTER:  Pass 1 inserts all non-condiment (parent) rows, capturing the real new
    //         DB id for each by matching client-side id → array position.
    //         Pass 2 inserts condiment rows with parent_item_id rewritten to point at
    //         the actual new parent row id from Pass 1.
    if (tray_items?.length > 0) {
      const parentItems = tray_items.filter((item: any) => !item.is_condiment)
      const condimentItems = tray_items.filter((item: any) => item.is_condiment)

      const buildRow = (item: any, sortOrder: number): any => {
        const pricingType = item.pricing_type || 'tray'

        const unitPrice =
          pricingType === 'per_person'  ? (item.per_person_price_cents || item.unit_price_cents || 0) :
          pricingType === 'per_piece'   ? (item.per_piece_price_cents  || item.unit_price_cents || 0) :
          (item.unit_price_cents || 0)

        let totalPrice = 0
        if (item.is_condiment) {
          totalPrice = 0 // condiments are included in parent dish price, never charged separately
        } else if (pricingType === 'per_person') {
          totalPrice = (item.guest_count || 0) * unitPrice
        } else if (pricingType === 'per_piece' || pricingType === 'per_gallon' || pricingType === 'per_portion') {
          totalPrice = (item.piece_count || 0) * unitPrice
        } else if (pricingType === 'tray') {
          if (item.tray_size === 'custom') {
            totalPrice = Math.round((item.tray_quantity || 1) * unitPrice)
          } else {
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
          // FIX-003 (Jun 15 2026): piece_count was not being saved — caused WAS column
          // in ReviewRoundsPanel to show "†" (dash) for per_piece and per_gallon items
          piece_count: item.piece_count || null,
          customer_comments: item.customer_comments || null,
          notes_to_customer: item.notes_to_customer || null,  // FIX-026
          sort_order: sortOrder,
          // FIX-093: condiment fields
          is_condiment: item.is_condiment || false,
          parent_item_id: null, // resolved after Pass 1 for condiment rows
          condiment_map_id: item.condiment_map_id || null,
          show_on_quote: item.is_condiment ? !!item.show_on_quote : true,
          condiment_qty: item.condiment_qty || null,
          condiment_unit: item.condiment_unit || null,
        }
      }

      // Pass 1: insert parent (non-condiment) rows
      // FIX-095 (Jun 19 2026): select sort_order back too — see id-matching fix below
      const { data: insertedParents, error: parentError } = await supabaseAdmin
        .from('quote_tray_items')
        .insert(parentItems.map((item: any, i: number) => buildRow(item, i)))
        .select('id, dish_name, sort_order')

      if (parentError) {
        console.error('Tray items (parent) error:', parentError)
        return NextResponse.json({ error: 'Tray items save failed: ' + parentError.message, parentError }, { status: 500 })
      }

      // FIX-095 (Jun 19 2026): match by sort_order column, NOT array position.
      // BEFORE: assumed insertedParents[i] corresponds to parentItems[i] — this is an
      //         UNVERIFIED assumption about Supabase/PostgREST bulk-insert return order,
      //         which is not guaranteed to match input array order. In production this
      //         caused condiment rows to attach to the WRONG parent dish (e.g. Pani Puri's
      //         Mint Pani/Pani Poori condiments appeared nested under Chicken Biryani).
      // AFTER:  sort_order is a value WE assigned deterministically per parentItems[i]
      //         (sort_order: i). Build the id-map by looking up each returned row's own
      //         sort_order column, which Postgres returns as real data — not by trusting
      //         array position. This is correct regardless of what order rows come back in.
      const sortOrderToNewId: Record<number, string> = {}
      for (const row of insertedParents || []) {
        sortOrderToNewId[row.sort_order] = row.id
      }
      const oldIdToNewId: Record<string, string> = {}
      parentItems.forEach((item: any, i: number) => {
        if (item.id && sortOrderToNewId[i] !== undefined) {
          oldIdToNewId[item.id] = sortOrderToNewId[i]
        }
      })

      // Pass 2: insert condiment rows with corrected parent_item_id
      if (condimentItems.length > 0) {
        const condimentRows = condimentItems.map((item: any, i: number) => {
          const row = buildRow(item, parentItems.length + i)
          row.parent_item_id = item.parent_item_id ? (oldIdToNewId[item.parent_item_id] || null) : null
          return row
        })

        const { error: condError } = await supabaseAdmin
          .from('quote_tray_items')
          .insert(condimentRows)

        if (condError) {
          console.error('Tray items (condiment) error:', condError)
          return NextResponse.json({ error: 'Condiment items save failed: ' + condError.message, condError }, { status: 500 })
        }
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
