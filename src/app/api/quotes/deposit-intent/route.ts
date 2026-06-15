// src/app/api/quotes/deposit-intent/route.ts
// FIX-014 (Jun 15 2026): handles deposit method selection (stripe/zelle/check)
// Stripe → creates Stripe checkout session and returns URL
// Zelle/Check → notifies admin, updates enquiry status

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const { token, method } = await req.json()
    if (!token || !method) return NextResponse.json({ error: 'token and method required' }, { status: 400 })

    // Load token
    const { data: tokenRow, error } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenRow) return NextResponse.json({ error: 'Token not found' }, { status: 404 })

    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', tokenRow.enquiry_id)
      .single()

    const snapshot = tokenRow.sent_snapshot
    const depositCents = snapshot?.deposit_cents || 0
    const totalCents = snapshot?.total_cents || 0
    const balanceCents = snapshot?.balance_cents || 0
    const customerName = enquiry?.customer_name || 'Customer'
    const firstName = customerName.split(' ')[0]
    const eventDate = enquiry?.event_date
      ? new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : ''

    const fmt = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)

    if (method === 'stripe') {
      // Stripe checkout
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Maya Indian Catering — 20% Deposit`,
              description: `${enquiry?.event_type?.replace(/_/g, ' ')} on ${eventDate} · ${enquiry?.guest_count} guests`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${BASE_URL}/review/${token}/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/review/${token}/deposit`,
        customer_email: enquiry?.customer_email,
        metadata: {
          token,
          enquiry_id: tokenRow.enquiry_id,
          quote_id: tokenRow.quote_id,
          type: 'catering_deposit',
        },
      })

      return NextResponse.json({ checkout_url: session.url })
    }

    // Zelle or Check — notify admin
    const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
    })

    const methodLabel = method === 'zelle' ? 'Zelle' : 'Check'
    const adminUrl = `${BASE_URL}/admin/enquiries/${tokenRow.enquiry_id}`
    const zelleRef = `${firstName} ${eventDate}`
    const eventType = (enquiry?.event_type || '').split('_').map((w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    const instructionsHtml = method === 'zelle'
      ? `<p style="margin:4px 0"><strong>Zelle to:</strong> indianflamesinc@gmail.com</p>
         <p style="margin:4px 0"><strong>Amount:</strong> ${fmt(depositCents)}</p>
         <p style="margin:4px 0"><strong>Reference:</strong> ${zelleRef}</p>`
      : `<p style="margin:4px 0"><strong>Check payable to:</strong> Indian Flames Inc</p>
         <p style="margin:4px 0"><strong>Amount:</strong> ${fmt(depositCents)}</p>
         <p style="margin:4px 0"><strong>Mail to:</strong> 33 Tuttle St, Wakefield MA 01880</p>
         <p style="margin:4px 0"><strong>Memo:</strong> ${zelleRef}</p>`

    await mailer.sendMail({
      from: `"Maya Platform" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER!,
      subject: `💰 ${customerName} will pay deposit via ${methodLabel} — ${fmt(depositCents)}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
          <div style="background:#05091A;padding:20px 28px">
            <div style="color:#C9A84C;font-size:18px;font-weight:bold">💰 Deposit via ${methodLabel}</div>
            <div style="color:#F6EDD8;font-size:12px;margin-top:4px">Maya Indian Catering · Admin Notification</div>
          </div>
          <div style="padding:24px 28px">
            <div style="background:#f6edd8;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
              <p style="margin:3px 0"><strong>Customer:</strong> ${customerName} (${enquiry?.customer_email})</p>
              <p style="margin:3px 0"><strong>Event:</strong> ${eventType} · ${eventDate}</p>
              <p style="margin:3px 0"><strong>Total:</strong> ${fmt(totalCents)} · <strong>Deposit:</strong> ${fmt(depositCents)} · <strong>Balance:</strong> ${fmt(balanceCents)}</p>
            </div>
            <div style="background:#fffbea;border:1px solid #f0d060;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
              <p style="margin:0 0 8px;font-weight:bold;color:#333">Expected ${methodLabel} Payment:</p>
              ${instructionsHtml}
            </div>
            <p style="font-size:13px;color:#555;margin-bottom:20px">
              Once you receive the payment, click <strong>"Mark Deposit Received"</strong> in Admin CRM to advance to Deposit Paid.
            </p>
            <div style="text-align:center">
              <a href="${adminUrl}" style="background:#C9A84C;color:#05091A;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">Open in Admin CRM →</a>
            </div>
          </div>
        </div>`,
    })

    // Update enquiry deposit_method for tracking
    await supabase
      .from('enquiries')
      .update({ internal_notes: `Deposit method: ${methodLabel}. Awaiting ${fmt(depositCents)} payment.` })
      .eq('id', tokenRow.enquiry_id)

    return NextResponse.json({ success: true, method })
  } catch (err: any) {
    console.error('deposit-intent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
