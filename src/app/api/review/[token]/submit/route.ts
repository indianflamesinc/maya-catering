// src/app/api/review/[token]/submit/route.ts
// POST — customer submits their changes

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

    // Load token
    const { data: tokenRow, error } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenRow) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (tokenRow.status === 'submitted') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
    }

    // Compute diff vs snapshot
    const diff = computeDiff(tokenRow.sent_snapshot, changes)

    // Mark token as submitted (expires on submit)
    await supabase
      .from('quote_review_tokens')
      .update({
        status: 'submitted',
        customer_changes: changes,
        customer_comments: overall_comments,
        submitted_at: new Date().toISOString(),
      })
      .eq('token', token)

    // Update enquiry review status
    await supabase
      .from('enquiries')
      .update({ review_status: 'customer_responded' })
      .eq('id', tokenRow.enquiry_id)

    // Load enquiry for notification
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date')
      .eq('id', tokenRow.enquiry_id)
      .single()

    // Notify Ashok by email
    await notifyAdmin({
      enquiryId: tokenRow.enquiry_id,
      roundNumber: tokenRow.round_number,
      customerName: enquiry?.customer_name || 'Customer',
      customerEmail: enquiry?.customer_email || '',
      eventType: enquiry?.event_type || '',
      eventDate: enquiry?.event_date || '',
      diff,
      overallComments: overall_comments,
      changesCount: diff.length,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('review submit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function computeDiff(snapshot: any, changes: any[]): any[] {
  const diffs: any[] = []
  const originalItems = snapshot?.tray_items ?? []

  for (const change of changes) {
    const original = originalItems.find(
      (o: any) => o.id === change.id || o.dish_name?.toLowerCase() === change.dish_name?.toLowerCase()
    )
    if (!original) continue

    if (String(original.tray_quantity) !== String(change.tray_quantity)) {
      diffs.push({ dish: change.dish_name, field: 'Quantity', original: original.tray_quantity, updated: change.tray_quantity })
    }
    if (change.customer_comments && change.customer_comments !== original.customer_comments) {
      diffs.push({ dish: change.dish_name, field: 'Comments', original: original.customer_comments || '(none)', updated: change.customer_comments })
    }
  }
  return diffs
}

async function notifyAdmin({ enquiryId, roundNumber, customerName, customerEmail, eventType, eventDate, diff, overallComments, changesCount }: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/enquiries/${enquiryId}`
  const eventDateFmt = new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })

  const diffRows = diff.length > 0
    ? diff.map((d: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${d.dish}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.field}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#999">${d.original}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#1a7a2e;font-weight:bold">→ ${d.updated}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding:12px;color:#888;font-style:italic">No quantity changes — check comments below.</td></tr>`

  const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#05091A;padding:20px 28px">
    <div style="color:#C9A84C;font-size:18px;font-weight:bold">🔔 Customer Review Submitted — Round ${roundNumber}</div>
    <div style="color:#F6EDD8;font-size:12px;margin-top:4px">Maya Indian Catering · Admin Notification</div>
  </div>
  <div style="padding:24px 28px">
    <div style="background:#f6edd8;border-radius:6px;padding:14px 18px;margin-bottom:20px;font-size:13px">
      <p style="margin:3px 0"><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
      <p style="margin:3px 0"><strong>Event:</strong> ${eventType} · ${eventDateFmt}</p>
      <p style="margin:3px 0"><strong>Round:</strong> ${roundNumber} · <strong>Changes:</strong> ${changesCount}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead>
        <tr style="background:#0A1530">
          <th style="padding:10px 12px;text-align:left;color:#C9A84C">Dish</th>
          <th style="padding:10px 12px;text-align:left;color:#C9A84C">Field</th>
          <th style="padding:10px 12px;text-align:left;color:#C9A84C">Original</th>
          <th style="padding:10px 12px;text-align:left;color:#C9A84C">Updated</th>
        </tr>
      </thead>
      <tbody>${diffRows}</tbody>
    </table>

    ${overallComments ? `
    <div style="background:#fffbea;border:1px solid #f0d060;border-radius:6px;padding:14px;margin-bottom:20px;font-size:13px">
      <strong>Customer Comments:</strong><br>${overallComments}
    </div>` : ''}

    <div style="text-align:center;margin:24px 0">
      <a href="${adminUrl}" style="background:#C9A84C;color:#05091A;padding:14px 28px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
        Open in Admin CRM →
      </a>
    </div>
  </div>
</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Platform" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER!,
    subject: `⚡ Quote Review Response — ${customerName} (Round ${roundNumber}) · ${eventType}`,
    html,
  })
}
