// src/app/api/review/[token]/submit/route.ts
// FIX-033 (Jun 15 2026): redesigned admin notification email — comments only table
// FIX-030: since qty is now read-only, diff only tracks comments per dish
// Status updated to 'pending_maya' (was 'submitted')

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const { changes, overall_comments } = await req.json()

    const { data: tokenRow, error } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenRow) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (tokenRow.status === 'pending_maya' || tokenRow.status === 'submitted') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
    }

    // FIX-030: only track comments — qty is read-only now
    const dishComments = (changes || [])
      .filter((c: any) => c.customer_comments?.trim())
      .map((c: any) => ({
        dish_name: c.dish_name,
        customer_comments: c.customer_comments,
        // preserve original qty from snapshot (not changed by customer)
        tray_quantity: c.tray_quantity,
        unit_price_cents: c.unit_price_cents,
        id: c.id,
      }))

    // FIX-033: status → pending_maya
    await supabase
      .from('quote_review_tokens')
      .update({
        status: 'pending_maya',
        customer_changes: dishComments,
        customer_comments: overall_comments || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('token', token)

    await supabase
      .from('enquiries')
      .update({ review_status: 'customer_responded', status: 'negotiating' })
      .eq('id', tokenRow.enquiry_id)

    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date, customer_phone')
      .eq('id', tokenRow.enquiry_id)
      .single()

    await notifyAdmin({
      enquiryId: tokenRow.enquiry_id,
      roundNumber: tokenRow.round_number,
      customerName: enquiry?.customer_name || 'Customer',
      customerEmail: enquiry?.customer_email || '',
      customerPhone: enquiry?.customer_phone || '',
      eventType: enquiry?.event_type || '',
      eventDate: enquiry?.event_date || '',
      dishComments,
      overallComments: overall_comments || '',
      snapshot: tokenRow.sent_snapshot,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('review submit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function notifyAdmin({
  enquiryId, roundNumber, customerName, customerEmail, customerPhone,
  eventType, eventDate, dishComments, overallComments, snapshot,
}: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/enquiries/${enquiryId}`
  const replyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/enquiries/${enquiryId}/reply`

  const fmt = (c: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)

  const eventDateFmt = new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  const eventTypeFmt = (eventType || '').split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  // FIX-033: comments-only table — no Field/Original/Updated columns
  const commentRows = dishComments.length > 0
    ? dishComments.map((d: any) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:600;color:#1a1a1a;width:35%">${d.dish_name}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#444;font-style:italic">"${d.customer_comments}"</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:12px;color:#888;font-style:italic;text-align:center">No dish-specific comments — see overall message below.</td></tr>`

  const totalStr = snapshot?.total_cents ? fmt(snapshot.total_cents) : ''

  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#05091A;padding:20px 28px">
    <div style="color:#C9A84C;font-size:18px;font-weight:bold">⚡ Customer Feedback — Round ${roundNumber}</div>
    <div style="color:#F6EDD8;font-size:12px;margin-top:4px">Maya Indian Catering · Action Required</div>
  </div>
  <div style="padding:24px 28px">
    <div style="background:#f6edd8;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
      <p style="margin:3px 0"><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
      ${customerPhone ? `<p style="margin:3px 0"><strong>Phone:</strong> ${customerPhone}</p>` : ''}
      <p style="margin:3px 0"><strong>Event:</strong> ${eventTypeFmt} · ${eventDateFmt}</p>
      <p style="margin:3px 0"><strong>Quote Total:</strong> ${totalStr} · <strong>Round:</strong> ${roundNumber}</p>
    </div>

    ${dishComments.length > 0 ? `
    <div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#888;text-transform:uppercase;margin-bottom:8px">
      Dish Comments (${dishComments.length})
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;border:1px solid #eee">
      <thead>
        <tr style="background:#0A1530">
          <th style="padding:10px 14px;text-align:left;color:#C9A84C;font-size:11px">DISH</th>
          <th style="padding:10px 14px;text-align:left;color:#C9A84C;font-size:11px">CUSTOMER'S COMMENT</th>
        </tr>
      </thead>
      <tbody>${commentRows}</tbody>
    </table>` : ''}

    ${overallComments ? `
    <div style="background:#fffbea;border:1px solid #f0d060;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
      <div style="font-weight:bold;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Overall Message from Customer:</div>
      <p style="margin:0;color:#444;font-style:italic">"${overallComments}"</p>
    </div>` : ''}

    <div style="background:#e8f5e9;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#2e7d32">
      <strong>Next step:</strong> Open Reply Builder to respond to each comment, update prices/quantities if needed, and send Round ${roundNumber + 1}.
    </div>

    <div style="display:flex;gap:12px;text-align:center">
      <a href="${replyUrl}" style="flex:1;background:#C9A84C;color:#05091A;padding:14px 20px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
        ✏️ Open Reply Builder →
      </a>
      <a href="${adminUrl}" style="flex:1;background:#05091A;color:#C9A84C;padding:14px 20px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;border:1px solid #C9A84C">
        View Enquiry →
      </a>
    </div>
  </div>
</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Platform" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER!,
    subject: `⚡ Round ${roundNumber} Feedback — ${customerName} · ${eventTypeFmt} · ${dishComments.length} comment${dishComments.length !== 1 ? 's' : ''}`,
    html,
  })
}
