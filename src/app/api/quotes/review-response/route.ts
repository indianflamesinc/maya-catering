// ============================================================
// src/app/api/quotes/review-response/route.ts
// POST /api/quotes/review-response
// Called by Google Apps Script when customer clicks "Notify Maya"
// Updates round status, computes diff, emails Ashok
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enquiry_id, sheet_id, changes, submitted_at } = body;

    if (!enquiry_id) {
      return NextResponse.json({ error: 'enquiry_id required' }, { status: 400 });
    }

    // 1. Find the open review round for this enquiry
    const { data: round, error: rErr } = await supabase
      .from('quote_review_rounds')
      .select('*')
      .eq('enquiry_id', enquiry_id)
      .eq('sheet_id', sheet_id)
      .eq('status', 'sent_for_review')
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (rErr || !round) {
      return NextResponse.json({ error: 'Review round not found' }, { status: 404 });
    }

    // 2. Compute diff vs original snapshot
    const diff = computeDiff(round.sent_snapshot?.tray_items ?? [], changes ?? []);

    // 3. Update round: customer_responded
    await supabase
      .from('quote_review_rounds')
      .update({
        status: 'customer_responded',
        customer_changes: changes,
        responded_at: submitted_at || new Date().toISOString(),
      })
      .eq('id', round.id);

    // 4. Update enquiry review_status
    await supabase
      .from('enquiries')
      .update({ review_status: 'customer_responded' })
      .eq('id', enquiry_id);

    // 5. Load enquiry for email
    const { data: enquiry } = await supabase
      .from('enquiries')
      .select('customer_name, customer_email, event_type, event_date')
      .eq('id', enquiry_id)
      .single();

    // 6. Email Ashok
    await notifyAdmin({
      enquiryId: enquiry_id,
      roundNumber: round.round_number,
      customerName: enquiry?.customer_name || 'Customer',
      customerEmail: enquiry?.customer_email || '',
      eventType: enquiry?.event_type || '',
      eventDate: enquiry?.event_date || '',
      sheetUrl: round.sheet_url,
      diff,
      changesCount: diff.length,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('review-response error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Diff computation ───────────────────────────────────────

interface DiffItem {
  dish: string;
  field: string;
  original: any;
  updated: any;
}

function computeDiff(originalItems: any[], customerChanges: any[]): DiffItem[] {
  const diffs: DiffItem[] = [];

  for (const change of customerChanges) {
    const original = originalItems.find(
      (o: any) => o.dish_name?.toLowerCase() === change.dish?.toLowerCase()
    );

    if (!original) continue;

    // Check quantity change
    if (String(original.tray_quantity) !== String(change.quantity)) {
      diffs.push({
        dish: change.dish,
        field: 'Quantity',
        original: original.tray_quantity,
        updated: change.quantity,
      });
    }

    // Check tray size change
    if (original.tray_size && change.tray_size &&
        original.tray_size !== change.tray_size) {
      diffs.push({
        dish: change.dish,
        field: 'Tray Size',
        original: original.tray_size,
        updated: change.tray_size,
      });
    }

    // Check comments added
    if (change.comments && change.comments !== original.customer_comments) {
      diffs.push({
        dish: change.dish,
        field: 'Comments',
        original: original.customer_comments || '(none)',
        updated: change.comments,
      });
    }
  }

  return diffs;
}

// ── Admin notification email ───────────────────────────────

async function notifyAdmin({
  enquiryId, roundNumber, customerName, customerEmail,
  eventType, eventDate, sheetUrl, diff, changesCount,
}: {
  enquiryId: string; roundNumber: number; customerName: string;
  customerEmail: string; eventType: string; eventDate: string;
  sheetUrl: string; diff: DiffItem[]; changesCount: number;
}) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/enquiries/${enquiryId}`;
  const eventDateFmt = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  const diffRows = diff.length > 0
    ? diff.map(d =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">${d.dish}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.field}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888">${d.original}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#1a7a2e;font-weight:bold">→ ${d.updated}</td>
        </tr>`
      ).join('')
    : `<tr><td colspan="4" style="padding:12px;color:#888;font-style:italic">No specific item changes detected — check sheet for comments.</td></tr>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; }
  .card { max-width: 620px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .hdr { background: #05091A; color: #C9A84C; padding: 20px 28px; }
  .hdr h2 { margin: 0; font-size: 18px; }
  .hdr p  { margin: 4px 0 0; color: #F6EDD8; font-size: 12px; }
  .body { padding: 24px 28px; }
  .meta { background: #f6edd8; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; }
  .meta p { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #0A1530; color: #C9A84C; padding: 10px 12px; text-align: left; }
  .cta { text-align:center; margin: 24px 0; }
  .cta a { background:#C9A84C; color:#05091A; padding:14px 28px; border-radius:4px; text-decoration:none; font-weight:bold; display:inline-block; margin: 6px; font-size:13px; }
  .cta a.secondary { background:#0A1530; color:#C9A84C; }
</style></head>
<body>
<div class="card">
  <div class="hdr">
    <h2>🔔 Customer Review Response — Round ${roundNumber}</h2>
    <p>Maya Indian Catering · Admin Notification</p>
  </div>
  <div class="body">
    <div class="meta">
      <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
      <p><strong>Event:</strong> ${eventType} · ${eventDateFmt}</p>
      <p><strong>Round:</strong> ${roundNumber} · <strong>Changes detected:</strong> ${changesCount}</p>
    </div>

    <p style="font-size:14px">
      ${customerName} has reviewed the quote and clicked <strong>Notify Maya</strong>.
      ${changesCount > 0 ? `Here are the <strong>${changesCount} change(s)</strong> they made:` : 'No item changes detected — they may have left comments in the sheet.'}
    </p>

    <table>
      <thead>
        <tr>
          <th>Dish</th><th>Field</th><th>Original</th><th>Updated</th>
        </tr>
      </thead>
      <tbody>${diffRows}</tbody>
    </table>

    <div class="cta">
      <a href="${adminUrl}">Open in Admin CRM</a>
      <a href="${sheetUrl}" class="secondary">View Google Sheet</a>
    </div>

    <p style="font-size:12px;color:#888">
      Actions available in admin: Accept Changes · Send Revised Quote · Add Notes · Confirm &amp; Lock
    </p>
  </div>
</div>
</body>
</html>
`;

  await mailer.sendMail({
    from: `"Maya Platform" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER!, // Ashok's own inbox
    subject: `⚡ Quote Review Response — ${customerName} (Round ${roundNumber}) · ${eventType}`,
    html,
  });
}
