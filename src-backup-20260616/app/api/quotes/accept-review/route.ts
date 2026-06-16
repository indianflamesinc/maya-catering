// src/app/api/quotes/accept-review/route.ts
// POST — accept a review round, lock the quote

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { round_id, enquiry_id } = await req.json()
    if (!round_id || !enquiry_id) {
      return NextResponse.json({ error: 'round_id and enquiry_id required' }, { status: 400 })
    }

    // 1. Mark token as accepted
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'accepted' })
      .eq('id', round_id)

    // 2. Update enquiry review_status
    await supabase
      .from('enquiries')
      .update({ review_status: 'review_accepted' })
      .eq('id', enquiry_id)

    // 3. Load round + enquiry for confirmation email
    const { data: round } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('id', round_id)
      .single()

    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, guest_count')
      .eq('id', enquiry_id)
      .single()

    // 4. Send confirmation email to customer
    if (enquiry?.customer_email) {
      await sendConfirmationEmail({
        to: enquiry.customer_email,
        customerName: enquiry.customer_name,
        eventType: (enquiry.event_type || '').split('_').map((w: string) =>
          w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        eventDate: new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        guestCount: enquiry.guest_count,
      })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('accept-review error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendConfirmationEmail({
  to, customerName, eventType, eventDate, guestCount,
}: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif">
<div style="max-width:580px;margin:0 auto;background:#fff">

  <div style="background:#05091A;padding:28px 36px;text-align:center">
    <div style="color:#C9A84C;font-size:20px;font-weight:bold;letter-spacing:3px">MAYA INDIAN CATERING</div>
    <div style="color:#F6EDD8;font-size:11px;margin-top:4px">33 Tuttle St, Wakefield MA · mayacater.com</div>
  </div>

  <div style="padding:36px">
    <div style="font-size:48px;text-align:center;margin-bottom:16px">🎉</div>
    <h2 style="color:#05091A;font-size:22px;text-align:center;margin:0 0 8px">Quote Confirmed!</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;text-align:center;margin:0 0 28px">
      Dear ${customerName}, your catering quote has been confirmed by Maya Indian Catering.
    </p>

    <div style="background:#f6edd8;border-left:4px solid #C9A84C;padding:16px 20px;margin-bottom:28px;border-radius:0 6px 6px 0">
      <p style="margin:4px 0;font-size:13px"><strong>Event:</strong> ${eventType}</p>
      <p style="margin:4px 0;font-size:13px"><strong>Date:</strong> ${eventDate}</p>
      <p style="margin:4px 0;font-size:13px"><strong>Guests:</strong> ${guestCount}</p>
    </div>

    <div style="background:#0A1530;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="color:#C9A84C;font-size:13px;font-weight:bold;margin:0 0 8px">Next Steps</p>
      <p style="color:#F6EDD8;font-size:13px;line-height:1.7;margin:0">
        1. We will send you a formal contract to review and sign<br>
        2. A 20% deposit is required to confirm your booking<br>
        3. Final guest count due 7 days before the event<br>
        4. Balance due 3 days before the event (Zelle/check/cash)
      </p>
    </div>

    <p style="font-size:13px;color:#444;line-height:1.7">
      We are thrilled to be part of your special event! If you have any questions,
      please don't hesitate to reach out.
    </p>

    <p style="font-size:13px;color:#444;margin-top:20px">
      With warm regards,<br>
      <strong>Ashokraja & the Maya Team</strong><br>
      <span style="color:#888">📧 indianflamesinc@gmail.com · 🌐 mayacater.com</span>
    </p>
  </div>

  <div style="background:#05091A;padding:16px;text-align:center;color:#666;font-size:11px">
    Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880
  </div>
</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Indian Catering" <${process.env.GMAIL_USER}>`,
    to,
    subject: `✅ Catering Quote Confirmed — ${eventType} on ${eventDate}`,
    html,
  })
}
