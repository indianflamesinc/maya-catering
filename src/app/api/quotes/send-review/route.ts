// src/app/api/quotes/send-review/route.ts
// POST /api/quotes/send-review
// Generates secure token, sends branded email + WhatsApp text

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

export async function POST(req: NextRequest) {
  try {
    const { enquiry_id } = await req.json()
    if (!enquiry_id) {
      return NextResponse.json({ error: 'enquiry_id required' }, { status: 400 })
    }

    // 1. Load enquiry
    const { data: enquiry, error: eErr } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', enquiry_id)
      .single()
    if (eErr || !enquiry) throw new Error('Enquiry not found')

    // 2. Load LATEST quote for this enquiry (always use most recent)
    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .select('*')
      .eq('enquiry_id', enquiry_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    if (qErr || !quote) throw new Error('Quote not found')
    const quote_id = quote.id

    // 3. Load tray items
    const { data: trayItems } = await supabase
      .from('quote_tray_items')
      .select('*')
      .eq('quote_id', quote_id)

    // 4. Load per-person sessions
    const { data: sessions } = await supabase
      .from('quote_sessions')
      .select(`*, quote_session_categories(*, quote_session_dishes(*))`)
      .eq('quote_id', quote_id)

    // 5. Determine round number
    const { count } = await supabase
      .from('quote_review_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('enquiry_id', enquiry_id)
    const roundNumber = (count ?? 0) + 1

    // 6. Expire any previous pending tokens
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'expired' })
      .eq('enquiry_id', enquiry_id)
      .eq('status', 'pending')

    // 7. Build snapshot
    const snapshot = {
      catering_type: quote.catering_type,
      tray_items: (trayItems ?? []).map(item => ({
        id: item.id,
        dish_name: item.dish_name || 'Item',
        category: item.cuisine_region || '',
        tray_size: item.tray_size || 'Full',
        tray_quantity: item.tray_quantity || 1,
        pricing_type: item.pricing_type || 'Per Tray',
        unit_price_cents: item.unit_price_cents || 0,
        total_price_cents: item.total_price_cents || 0,
        customer_comments: '',
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
            id: d.id,
            dish_name: d.dish_name,
          })),
        })),
      })),
      subtotal_cents: quote.subtotal_cents || 0,
      discount_cents: quote.discount_cents || 0,
      tax_cents: quote.tax_cents || 0,
      total_cents: quote.total_cents || 0,
      deposit_cents: Math.round((quote.total_cents || 0) * 0.2),
      balance_cents: Math.round((quote.total_cents || 0) * 0.8),
    }

    // 8. Create token in DB
    const { data: tokenRow, error: tErr } = await supabase
      .from('quote_review_tokens')
      .insert({
        enquiry_id,
        quote_id,
        round_number: roundNumber,
        status: 'pending',
        sent_snapshot: snapshot,
        customer_email: enquiry.customer_email,
        customer_name: enquiry.customer_name,
      })
      .select()
      .single()
    if (tErr) throw new Error('Failed to create review token: ' + tErr.message)

    // 9. Update enquiry
    await supabase
      .from('enquiries')
      .update({ review_status: 'sent_for_review', latest_review_token_id: tokenRow.id })
      .eq('id', enquiry_id)

    // 10. Build review URL
    const reviewUrl = `${BASE_URL}/review/${tokenRow.token}`

    // 11. Build event date string
    const eventDate = new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    // 12. Send email
    await sendReviewEmail({
      to: enquiry.customer_email,
      customerName: enquiry.customer_name,
      eventType: (enquiry.event_type || '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      eventDate,
      venue: enquiry.venue_name || enquiry.venue_address || 'TBD',
      guestCount: enquiry.guest_count,
      reviewUrl,
      roundNumber,
      snapshot,
    })

    // 13. Build WhatsApp / iMessage short text (returned to admin to copy-paste)
    const shortMessage = buildShortMessage({
      customerName: enquiry.customer_name,
      eventDate,
      total: fmt(snapshot.total_cents),
      reviewUrl,
      roundNumber,
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

// ── Email ──────────────────────────────────────────────────

async function sendReviewEmail({
  to, customerName, eventType, eventDate, venue, guestCount,
  reviewUrl, roundNumber, snapshot,
}: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const fmt2 = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  // Build dish rows for email body
  let dishRowsHtml = ''
  if (snapshot.catering_type === 'tray' || snapshot.catering_type === 'hybrid') {
    dishRowsHtml += `
      <tr style="background:#C9A84C">
        <th style="padding:10px;text-align:left;color:#05091A;font-size:11px">DISH</th>
        <th style="padding:10px;text-align:left;color:#05091A;font-size:11px">CATEGORY</th>
        <th style="padding:10px;text-align:center;color:#05091A;font-size:11px">TRAY SIZE</th>
        <th style="padding:10px;text-align:center;color:#05091A;font-size:11px">QTY</th>
        <th style="padding:10px;text-align:right;color:#05091A;font-size:11px">UNIT PRICE</th>
        <th style="padding:10px;text-align:right;color:#05091A;font-size:11px">TOTAL</th>
      </tr>`
    snapshot.tray_items.forEach((item: any, i: number) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f9f6f0'
      dishRowsHtml += `
        <tr style="background:${bg}">
          <td style="padding:9px 10px;font-size:13px;color:#1a1a1a;font-weight:600">${item.dish_name}</td>
          <td style="padding:9px 10px;font-size:12px;color:#666">${item.category}</td>
          <td style="padding:9px 10px;font-size:12px;color:#444;text-align:center">${item.tray_size}</td>
          <td style="padding:9px 10px;font-size:12px;color:#444;text-align:center">${item.tray_quantity}</td>
          <td style="padding:9px 10px;font-size:12px;color:#444;text-align:right">${fmt2(item.unit_price_cents)}</td>
          <td style="padding:9px 10px;font-size:13px;color:#C9A84C;font-weight:bold;text-align:right">${fmt2(item.total_price_cents)}</td>
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
            <td style="padding:9px 10px;font-size:12px;color:#666">${cat.category_name}</td>
            <td style="padding:9px 10px;font-size:12px;text-align:center">${sess.guest_count}</td>
            <td style="padding:9px 10px;font-size:12px;text-align:right">${fmt2(cat.price_per_person)}/pp</td>
            <td style="padding:9px 10px;font-size:13px;color:#C9A84C;font-weight:bold;text-align:right">
              ${fmt2(cat.price_per_person * sess.guest_count)}
            </td>
          </tr>`
      })
    })
  }

  const subject = roundNumber === 1
    ? `Your Maya Catering Quote — ${eventType} on ${eventDate}`
    : `Updated Quote for Review (Round ${roundNumber}) — ${eventType} | Maya Catering`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif">
<div style="max-width:640px;margin:0 auto;background:#fff">

  <!-- Header -->
  <div style="background:#05091A;padding:32px 40px;text-align:center">
    <div style="color:#C9A84C;font-size:22px;font-weight:bold;letter-spacing:3px">MAYA INDIAN CATERING</div>
    <div style="color:#F6EDD8;font-size:11px;margin-top:6px;letter-spacing:1px">33 Tuttle St, Wakefield MA · mayacater.com</div>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px">
    <h2 style="color:#05091A;font-size:20px;margin:0 0 8px">Dear ${customerName},</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 24px">
      ${roundNumber === 1
        ? 'Thank you for choosing Maya Indian Catering! Please find your catering quote below. Review all details and click the button to confirm or request changes.'
        : `We have updated your quote based on your feedback (Round ${roundNumber}). Please review the changes below.`}
    </p>

    <!-- Event details -->
    <div style="background:#f6edd8;border-left:4px solid #C9A84C;padding:16px 20px;margin-bottom:24px;border-radius:0 6px 6px 0">
      <table style="width:100%;font-size:13px">
        <tr><td style="color:#888;padding:3px 0;width:100px">Event</td><td style="color:#1a1a1a;font-weight:bold">${eventType}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Date</td><td style="color:#1a1a1a;font-weight:bold">${eventDate}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Venue</td><td style="color:#1a1a1a">${venue}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Guests</td><td style="color:#1a1a1a">${guestCount}</td></tr>
      </table>
    </div>

    <!-- Dish table -->
    <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#888;margin-bottom:8px;text-transform:uppercase">Your Menu & Pricing</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${dishRowsHtml}
    </table>

    <!-- Totals -->
    <table style="width:100%;font-size:13px;margin-bottom:28px">
      <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="text-align:right;color:#333">${fmt2(snapshot.subtotal_cents)}</td></tr>
      ${snapshot.discount_cents > 0 ? `<tr><td style="padding:6px 0;color:#666">Discount</td><td style="text-align:right;color:#e55">-${fmt2(snapshot.discount_cents)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666">Tax (7% MA)</td><td style="text-align:right;color:#333">${fmt2(snapshot.tax_cents)}</td></tr>
      <tr style="border-top:2px solid #C9A84C">
        <td style="padding:10px 0;font-size:16px;font-weight:bold;color:#05091A">Grand Total</td>
        <td style="text-align:right;font-size:18px;font-weight:bold;color:#C9A84C">${fmt2(snapshot.total_cents)}</td>
      </tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">20% Deposit Due Now</td><td style="text-align:right;color:#444;font-size:12px">${fmt2(snapshot.deposit_cents)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">Balance (3 days before event)</td><td style="text-align:right;color:#444;font-size:12px">${fmt2(snapshot.balance_cents)}</td></tr>
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0">
      <a href="${reviewUrl}" style="background:#C9A84C;color:#05091A;padding:16px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:4px;display:inline-block;letter-spacing:1px">
        ✅ Review & Confirm Your Quote
      </a>
      <p style="color:#888;font-size:11px;margin-top:12px">Or copy this link: ${reviewUrl}</p>
    </div>

    <p style="font-size:13px;color:#444;line-height:1.7">
      On the review page you can adjust quantities, add comments, or request changes. 
      We'll get back to you within 24 hours. This can go back and forth as many times as needed until everything is perfect!
    </p>

    <p style="margin-top:28px;font-size:13px;color:#444">
      Warm regards,<br>
      <strong>Ashokraja & the Maya Team</strong><br>
      <span style="color:#888">📞 Call/WhatsApp · 📧 catering@mayacater.com</span>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#05091A;padding:20px 40px;text-align:center">
    <div style="color:#888;font-size:11px">Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880</div>
    <div style="color:#888;font-size:11px;margin-top:4px">Zelle: indianflamesinc@gmail.com · Balance due 3 days before event</div>
  </div>

</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Indian Catering" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

// ── Short WhatsApp / iMessage text ─────────────────────────

function buildShortMessage({ customerName, eventDate, total, reviewUrl, roundNumber }: any) {
  const firstName = customerName.split(' ')[0]
  return roundNumber === 1
    ? `Hi ${firstName}! 🙏 Your Maya Catering quote is ready!\n\nEvent: ${eventDate}\nTotal: ${total}\n\nReview & confirm here:\n${reviewUrl}\n\nYou can adjust quantities or leave comments on that page. Let us know if you have any questions! — Maya Catering 🍛`
    : `Hi ${firstName}! We've updated your catering quote (Round ${roundNumber}).\n\nTotal: ${total}\n\nReview the changes here:\n${reviewUrl}\n\n— Maya Catering 🍛`
}
