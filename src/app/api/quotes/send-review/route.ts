// src/app/api/quotes/send-review/route.ts
// FIX-048 (Jun 16 2026): Email sign-off updated
//   BEFORE: 'Warm regards, Ashokraja & the Maya Team · 📞 Call/WhatsApp · 📧 email'
//   AFTER:  'Warm regards, Maya Team · 📞 617-987-5222 · 📧 email · 🌐 www.mayacater.com'
// FIX-049 (Jun 16 2026): Email instruction text updated — qty is read-only now
//   BEFORE: 'On the review page you can adjust quantities, add comments...'
//   AFTER:  'On the review page you can add comments about any items — to update, add, remove...'
// FIX-006 (Jun 15 2026): custom tray shows multiplier not 'Multiple' in getSizeOrType()
//   BEFORE: getSizeOrType mapped tray_size=custom to 'Multiple'
//   AFTER:  shows '2×' etc using tray_quantity
// FIX-026 (Jun 15 2026): notes_to_customer included in snapshot and shown in email
//   BEFORE: customer_comments field was saved but never shown to customer
//   AFTER:  notes_to_customer saved in snapshot and rendered in email dish table NOTES column

// src/app/api/quotes/send-review/route.ts
// FIX-048 (Jun 16 2026): Email sign-off updated
//   BEFORE: 'Warm regards, Ashokraja & the Maya Team · 📞 Call/WhatsApp · 📧 email'
//   AFTER:  'Warm regards, Maya Team · 📞 617-987-5222 · 📧 email · 🌐 www.mayacater.com'
// FIX-049 (Jun 16 2026): Email instruction text updated — qty is read-only now
//   BEFORE: 'On the review page you can adjust quantities, add comments...'
//   AFTER:  'On the review page you can add comments about any items — to update, add, remove...'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function getPricingLabel(pricingType: string): string {
  const labels: Record<string, string> = {
    tray: 'Per Tray', per_person: 'Per Person',
    per_piece: 'Per Piece', per_gallon: 'Per Gallon', per_portion: 'Per Portion'
  }
  return labels[pricingType] || pricingType
}

function getSizeOrType(item: any): string {
  if (item.pricing_type === 'tray') {
    const sizes: Record<string, string> = {
      half: 'Small', medium: 'Medium', full: 'Full Tray',
      // FIX-006: show multiplier not "Multiple" for custom
      custom: `${item.tray_quantity || 1}×`
    }
    return sizes[item.tray_size] || item.tray_size || 'Tray'
  }
  return getPricingLabel(item.pricing_type)
}

function getQty(item: any): string {
  if (item.pricing_type === 'per_person') return `${item.guest_count || item.tray_quantity || 1} ppl`
  if (item.pricing_type === 'per_piece')  return `${item.piece_count || item.tray_quantity || 1} pcs`
  if (item.pricing_type === 'per_gallon') return `${item.piece_count || item.tray_quantity || 1} gal`
  if (item.pricing_type === 'per_portion') return `${item.piece_count || item.tray_quantity || 1} portions`
  if (item.tray_size === 'custom') return `${item.tray_quantity || 1}×`
  return '1'
}

export async function POST(req: NextRequest) {
  try {
    const { enquiry_id } = await req.json()
    if (!enquiry_id) return NextResponse.json({ error: 'enquiry_id required' }, { status: 400 })

    const { data: enquiry, error: eErr } = await supabase
      .from('enquiries').select('*').eq('id', enquiry_id).single()
    if (eErr || !enquiry) throw new Error('Enquiry not found')

    const { data: quote, error: qErr } = await supabase
      .from('quotes').select('*').eq('enquiry_id', enquiry_id)
      .order('version', { ascending: false }).limit(1).single()
    if (qErr || !quote) throw new Error('Quote not found')
    const quote_id = quote.id

    const { data: trayItems } = await supabase
      .from('quote_tray_items').select('*').eq('quote_id', quote_id)

    const { data: sessions } = await supabase
      .from('quote_sessions')
      .select(`*, quote_session_categories(*, quote_session_dishes(*))`)
      .eq('quote_id', quote_id)

    const { count } = await supabase
      .from('quote_review_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('enquiry_id', enquiry_id)
    const roundNumber = (count ?? 0) + 1

    await supabase
      .from('quote_review_tokens')
      .update({ status: 'expired' })
      .eq('enquiry_id', enquiry_id)
      .eq('status', 'pending')

    const snapshot = {
      catering_type: quote.catering_type,
      tray_items: (trayItems ?? []).map(item => ({
        id: item.id,
        dish_name: item.dish_name || 'Item',
        category: item.cuisine_region || '',
        pricing_type: item.pricing_type || 'tray',
        tray_size: item.tray_size || null,
        tray_quantity: item.tray_quantity || 1,
        guest_count: item.guest_count || null,
        piece_count: item.piece_count || null,
        unit_price_cents: item.unit_price_cents || 0,
        total_price_cents: item.total_price_cents || 0,
        // FIX-026: save notes_to_customer in snapshot (falls back to customer_comments for old quotes)
        notes_to_customer: item.notes_to_customer || item.customer_comments || '',
        customer_comments: '',
        // FIX-093 (Jun 18 2026): carry condiment fields into the snapshot.
        // BEFORE: condiment rows existed in quote_tray_items but were dropped here —
        //         the Round 1 email and review page never saw them at all.
        // AFTER:  is_condiment/parent_item_id/show_on_quote/condiment_qty/condiment_unit
        //         all flow into the snapshot. Email/review rendering filters by
        //         show_on_quote so kitchen-only condiments stay invisible to the customer.
        is_condiment: item.is_condiment || false,
        parent_item_id: item.parent_item_id || null,
        show_on_quote: item.show_on_quote !== false,
        condiment_qty: item.condiment_qty || null,
        condiment_unit: item.condiment_unit || null,
      })),
      sessions: (sessions ?? []).map(sess => ({
        id: sess.id,
        session_name: sess.session_name,
        guest_count: sess.guest_count,
        categories: (sess.quote_session_categories ?? []).map((cat: any) => ({
          id: cat.id,
          category_name: cat.category_name,
          price_per_person: cat.price_per_person,
          dishes: (cat.quote_session_dishes ?? []).map((d: any) => ({
            id: d.id, dish_name: d.dish_name,
          })),
        })),
      })),
      subtotal_cents: quote.subtotal_cents || 0,
      delivery_fee_cents: quote.delivery_fee_cents || 0,
      setup_fee_cents: quote.setup_fee_cents || 0,
      service_fee_cents: quote.service_fee_cents || 0,
      discount_cents: quote.discount_cents || 0,
      tax_cents: quote.tax_cents || 0,
      total_cents: quote.total_cents || 0,
      deposit_cents: Math.round((quote.total_cents || 0) * 0.2),
      balance_cents: Math.round((quote.total_cents || 0) * 0.8),
    }

    const { data: tokenRow, error: tErr } = await supabase
      .from('quote_review_tokens')
      .insert({
        enquiry_id, quote_id,
        round_number: roundNumber,
        status: 'pending',
        sent_snapshot: snapshot,
        customer_email: enquiry.customer_email,
        customer_name: enquiry.customer_name,
      })
      .select().single()
    if (tErr) throw new Error('Failed to create review token: ' + tErr.message)

    await supabase
      .from('enquiries')
      .update({ review_status: 'sent_for_review', latest_review_token_id: tokenRow.id })
      .eq('id', enquiry_id)

    const reviewUrl = `${BASE_URL}/review/${tokenRow.token}`
    const eventDate = new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const eventType = (enquiry.event_type || '').split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    await sendReviewEmail({
      to: enquiry.customer_email,
      customerName: enquiry.customer_name,
      eventType, eventDate,
      venue: enquiry.venue_name || enquiry.venue_address || 'TBD',
      guestCount: enquiry.guest_count,
      reviewUrl, roundNumber, snapshot,
    })

    const shortMessage = buildShortMessage({
      customerName: enquiry.customer_name,
      eventDate,
      total: fmt(snapshot.total_cents),
      reviewUrl, roundNumber,
    })

    return NextResponse.json({
      success: true,
      token: tokenRow.token,
      review_url: reviewUrl,
      round_number: roundNumber,
      whatsapp_message: shortMessage,
    })

  } catch (err: any) {
    console.error('send-review error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}

async function sendReviewEmail({
  to, customerName, eventType, eventDate, venue, guestCount,
  reviewUrl, roundNumber, snapshot,
}: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const fmt2 = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  let dishRowsHtml = ''

  if (snapshot.catering_type === 'tray' || snapshot.catering_type === 'hybrid') {
    dishRowsHtml += `
      <tr style="background:#C9A84C">
        <th style="padding:10px;text-align:left;color:#05091A;font-size:11px">DISH</th>
        <th style="padding:10px;text-align:left;color:#05091A;font-size:11px">TYPE / SIZE</th>
        <th style="padding:10px;text-align:center;color:#05091A;font-size:11px">QTY</th>
        <th style="padding:10px;text-align:right;color:#05091A;font-size:11px">UNIT PRICE</th>
        <th style="padding:10px;text-align:right;color:#05091A;font-size:11px">TOTAL</th>
        <th style="padding:10px;text-align:left;color:#05091A;font-size:11px">NOTES</th>
      </tr>`

    snapshot.tray_items.forEach((item: any, i: number) => {
      // FIX-093 (Jun 18 2026): kitchen-only condiments (show_on_quote=false) never
      // appear in the customer email at all — they're an internal kitchen instruction.
      if (item.is_condiment && !item.show_on_quote) return

      const bg = i % 2 === 0 ? '#ffffff' : '#f9f6f0'

      if (item.is_condiment) {
        // FIX-093: condiment row — indented, no separate price (included in parent dish)
        const qtyUnit = [item.condiment_qty, item.condiment_unit].filter(Boolean).join(' ') || ''
        dishRowsHtml += `
          <tr style="background:${bg}">
            <td style="padding:7px 10px 7px 26px;font-size:12px;color:#888;font-style:italic">↳ ${item.dish_name}</td>
            <td style="padding:7px 10px;font-size:11px;color:#aaa"></td>
            <td style="padding:7px 10px;font-size:11px;color:#aaa;text-align:center">${qtyUnit}</td>
            <td style="padding:7px 10px;font-size:11px;color:#aaa;text-align:right"></td>
            <td style="padding:7px 10px;font-size:11px;color:#aaa;text-align:right;font-style:italic">Included</td>
            <td style="padding:7px 10px;font-size:11px;color:#aaa"></td>
          </tr>`
        return
      }

      // FIX-026: notes_to_customer shown in email table
      const notes = item.notes_to_customer || ''
      dishRowsHtml += `
        <tr style="background:${bg}">
          <td style="padding:9px 10px;font-size:13px;color:#1a1a1a;font-weight:600">${item.dish_name}</td>
          <td style="padding:9px 10px;font-size:12px;color:#666">${getSizeOrType(item)}</td>
          <td style="padding:9px 10px;font-size:12px;color:#444;text-align:center">${getQty(item)}</td>
          <td style="padding:9px 10px;font-size:12px;color:#444;text-align:right">${fmt2(item.unit_price_cents)}</td>
          <td style="padding:9px 10px;font-size:13px;color:#C9A84C;font-weight:bold;text-align:right">${fmt2(item.total_price_cents)}</td>
          <td style="padding:9px 10px;font-size:11px;color:#888;font-style:italic">${notes}</td>
        </tr>`
    })
  }

  if (snapshot.catering_type === 'per_person' || snapshot.catering_type === 'hybrid') {
    snapshot.sessions.forEach((sess: any) => {
      dishRowsHtml += `
        <tr style="background:#0A1530">
          <td colspan="6" style="padding:10px;color:#C9A84C;font-size:12px;font-weight:bold">
            ${sess.session_name} — ${sess.guest_count} guests
          </td>
        </tr>`
      sess.categories.forEach((cat: any, i: number) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f9f6f0'
        dishRowsHtml += `
          <tr style="background:${bg}">
            <td style="padding:9px 10px;font-size:13px;color:#1a1a1a" colspan="2">
              ${cat.dishes.map((d: any) => d.dish_name).join(', ')}
            </td>
            <td style="padding:9px 10px;font-size:12px;color:#666;text-align:center">${cat.category_name}</td>
            <td style="padding:9px 10px;font-size:12px;text-align:right">${fmt2(cat.price_per_person)}/pp</td>
            <td style="padding:9px 10px;font-size:13px;color:#C9A84C;font-weight:bold;text-align:right">
              ${fmt2(cat.price_per_person * sess.guest_count)}
            </td>
            <td></td>
          </tr>`
      })
    })
  }

  const subject = roundNumber === 1
    ? `Your Maya Catering Quote — ${eventType} on ${eventDate}`
    : `Updated Quote for Review (Round ${roundNumber}) — ${eventType} | Maya Catering`

  const feeRowsHtml = [
    snapshot.delivery_fee_cents > 0 ? `<tr><td style="padding:6px 0;color:#666">Delivery Fee</td><td style="text-align:right;color:#333">${fmt2(snapshot.delivery_fee_cents)}</td></tr>` : '',
    snapshot.setup_fee_cents > 0    ? `<tr><td style="padding:6px 0;color:#666">Setup Fee</td><td style="text-align:right;color:#333">${fmt2(snapshot.setup_fee_cents)}</td></tr>` : '',
    snapshot.service_fee_cents > 0  ? `<tr><td style="padding:6px 0;color:#666">Service Fee</td><td style="text-align:right;color:#333">${fmt2(snapshot.service_fee_cents)}</td></tr>` : '',
  ].join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif">
<div style="max-width:660px;margin:0 auto;background:#fff">
  <div style="background:#05091A;padding:32px 40px;text-align:center">
    <div style="color:#C9A84C;font-size:22px;font-weight:bold;letter-spacing:3px">MAYA INDIAN CATERING</div>
    <div style="color:#F6EDD8;font-size:11px;margin-top:6px;letter-spacing:1px">33 Tuttle St, Wakefield MA · mayacater.com</div>
  </div>
  <div style="padding:36px 40px">
    <h2 style="color:#05091A;font-size:20px;margin:0 0 8px">Dear ${customerName},</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 24px">
      ${roundNumber === 1
        ? 'Thank you for choosing Maya Indian Catering! Please find your catering quote below. Review all details and click the button to confirm or request changes.'
        : `We have updated your quote based on your feedback (Round ${roundNumber}). Please review the changes below.`}
    </p>
    <div style="background:#f6edd8;border-left:4px solid #C9A84C;padding:16px 20px;margin-bottom:24px;border-radius:0 6px 6px 0">
      <table style="width:100%;font-size:13px">
        <tr><td style="color:#888;padding:3px 0;width:100px">Event</td><td style="color:#1a1a1a;font-weight:bold">${eventType}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Date</td><td style="color:#1a1a1a;font-weight:bold">${eventDate}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Venue</td><td style="color:#1a1a1a">${venue}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Guests</td><td style="color:#1a1a1a">${guestCount}</td></tr>
      </table>
    </div>
    <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#888;margin-bottom:8px;text-transform:uppercase">Your Menu & Pricing</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${dishRowsHtml}
    </table>
    <table style="width:100%;font-size:13px;margin-bottom:28px">
      <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="text-align:right;color:#333">${fmt2(snapshot.subtotal_cents)}</td></tr>
      ${feeRowsHtml}
      ${snapshot.discount_cents > 0 ? `<tr><td style="padding:6px 0;color:#666">Discount</td><td style="text-align:right;color:#e55">-${fmt2(snapshot.discount_cents)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666">Tax (7% MA)</td><td style="text-align:right;color:#333">${fmt2(snapshot.tax_cents)}</td></tr>
      <tr style="border-top:2px solid #C9A84C">
        <td style="padding:10px 0;font-size:16px;font-weight:bold;color:#05091A">Grand Total</td>
        <td style="text-align:right;font-size:18px;font-weight:bold;color:#C9A84C">${fmt2(snapshot.total_cents)}</td>
      </tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">20% Deposit Due Now</td><td style="text-align:right;color:#444;font-size:12px">${fmt2(snapshot.deposit_cents)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">Balance (3 days before event)</td><td style="text-align:right;color:#444;font-size:12px">${fmt2(snapshot.balance_cents)}</td></tr>
    </table>
    <div style="text-align:center;margin:32px 0">
      <a href="${reviewUrl}" style="background:#C9A84C;color:#05091A;padding:16px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:4px;display:inline-block;letter-spacing:1px">
        ✅ Review & Confirm Your Quote
      </a>
      <p style="color:#888;font-size:11px;margin-top:12px">Or copy this link: ${reviewUrl}</p>
    </div>
    <p style="font-size:13px;color:#444;line-height:1.7">
      On the review page you can add comments about any items — to update, add, remove or ask any questions. We'll get back to you within 24 hours!
    </p>
    <p style="margin-top:28px;font-size:13px;color:#444">
      Warm regards,<br>
      <strong>Maya Team</strong><br>
      <span style="color:#888">📞 617-987-5222 &nbsp;·&nbsp; 📧 indianflamesinc@gmail.com &nbsp;·&nbsp; 🌐 www.mayacater.com</span>
    </p>
  </div>
  <div style="background:#05091A;padding:20px 40px;text-align:center">
    <div style="color:#888;font-size:11px">Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880</div>
    <div style="color:#888;font-size:11px;margin-top:4px">Zelle: indianflamesinc@gmail.com · Balance due 3 days before event</div>
  </div>
</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Indian Catering" <${process.env.GMAIL_USER}>`,
    to, subject, html,
  })
}

function buildShortMessage({ customerName, eventDate, total, reviewUrl, roundNumber }: any) {
  const firstName = customerName.split(' ')[0]
  return roundNumber === 1
    ? `Hi ${firstName}! 🙏 Your Maya Catering quote is ready!\n\nEvent: ${eventDate}\nTotal: ${total}\n\nReview & confirm here:\n${reviewUrl}\n\nAdd your comments or questions on any dish. We'll get back to you within 24 hours! — Maya Catering 🍛`
    : `Hi ${firstName}! We've updated your catering quote (Round ${roundNumber}).\n\nTotal: ${total}\n\nReview the changes here:\n${reviewUrl}\n\n— Maya Catering 🍛`
}
