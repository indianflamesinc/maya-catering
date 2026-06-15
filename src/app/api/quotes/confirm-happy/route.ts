// src/app/api/quotes/confirm-happy/route.ts
// FIX-013 (Jun 15 2026): called when customer clicks "Everything looks great"
// Marks token as accepted, notifies admin, does NOT send deposit email yet
// (customer goes to /review/[token]/deposit next)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

    // Load token row
    const { data: tokenRow, error } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenRow) return NextResponse.json({ error: 'Token not found' }, { status: 404 })

    // Mark as accepted
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'accepted', submitted_at: new Date().toISOString() })
      .eq('token', token)

    // Update enquiry status → approved (waiting for deposit)
    await supabase
      .from('enquiries')
      .update({ review_status: 'review_accepted', status: 'approved' })
      .eq('id', tokenRow.enquiry_id)

    // Load enquiry for notification
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, guest_count')
      .eq('id', tokenRow.enquiry_id)
      .single()

    const snapshot = tokenRow.sent_snapshot
    const depositAmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format((snapshot?.deposit_cents || 0) / 100)
    const totalAmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format((snapshot?.total_cents || 0) / 100)

    // Notify admin
    const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
    })

    const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/enquiries/${tokenRow.enquiry_id}`
    const eventType = (enquiry?.event_type || '').split('_').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const eventDate = enquiry?.event_date
      ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : ''

    await mailer.sendMail({
      from: `"Maya Platform" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER!,
      subject: `✅ ${enquiry?.customer_name} confirmed quote — arranging deposit ${depositAmt}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
          <div style="background:#05091A;padding:20px 28px">
            <div style="color:#C9A84C;font-size:18px;font-weight:bold">✅ Quote Confirmed — No Changes</div>
            <div style="color:#F6EDD8;font-size:12px;margin-top:4px">Maya Indian Catering · Admin Notification</div>
          </div>
          <div style="padding:24px 28px">
            <div style="background:#f6edd8;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
              <p style="margin:3px 0"><strong>Customer:</strong> ${enquiry?.customer_name} (${enquiry?.customer_email})</p>
              <p style="margin:3px 0"><strong>Event:</strong> ${eventType} · ${eventDate}</p>
              <p style="margin:3px 0"><strong>Total:</strong> ${totalAmt} · <strong>Deposit:</strong> ${depositAmt}</p>
            </div>
            <p style="font-size:14px;color:#333;margin-bottom:20px">
              ${enquiry?.customer_name} has confirmed the quote with <strong>no changes</strong> and is now choosing their deposit payment method (Stripe / Zelle / Check).
            </p>
            <div style="text-align:center">
              <a href="${adminUrl}" style="background:#C9A84C;color:#05091A;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">Open in Admin CRM →</a>
            </div>
          </div>
        </div>`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('confirm-happy error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
