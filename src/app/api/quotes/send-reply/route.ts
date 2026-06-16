// src/app/api/quotes/send-reply/route.ts
// FIX-036 (Jun 16 2026): Thread history built before expiring old round
// FIX-037 (Jun 16 2026): Current round admin_replies included in thread snapshot
// FIX-038 (Jun 16 2026): Correct enquiry_id used for redirect
// FIX-048 (Jun 16 2026): Email sign-off updated — Maya Team, phone, website
// FIX-055 (Jun 16 2026): Notes column added to Round 2+ email dish table
//   BEFORE: DISH|TYPE|QTY|UNIT PRICE|TOTAL — no Notes column
//   AFTER:  DISH|TYPE|QTY|UNIT PRICE|TOTAL|NOTES — matches Round 1 email format
// FIX-054 (Jun 16 2026): thread[] includes ALL rounds — removed slice(0,-1) that wiped history
//   BEFORE: thread.slice(0,-1) removed last entry → Round 2 showed empty thread []
//   AFTER:  thread = complete history; admin_reply handles current round separately
// FIX-058 (Jun 16 2026): Expire ALL pending tokens when new round created
//   BEFORE: only expired current round_id → Round 2 stayed 'pending_customer' after Round 3 sent
//   AFTER:  expire all pending/viewed/pending_customer tokens for enquiry
// 
// Bug summary fixed:
// - Thread was empty [] because admin_replies saved AFTER snapshot built
// - Thread duplication because current round reply appeared in both thread[] and admin_reply field
// - Wrong enquiry redirect after send

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://maya-catering.vercel.app'

const fmt = (c: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)

function getSizeOrType(item: any): string {
  if (item.pricing_type !== 'tray') {
    const map: Record<string, string> = {
      per_person: 'Per Person', per_piece: 'Per Piece',
      per_gallon: 'Per Gallon', per_portion: 'Per Portion',
    }
    return map[item.pricing_type] || item.pricing_type
  }
  const map: Record<string, string> = {
    half: 'Small', medium: 'Medium', full: 'Full Tray',
    custom: `${item.tray_quantity || 1}×`,
  }
  return map[item.tray_size] || 'Tray'
}

function getQty(item: any): string {
  if (item.pricing_type === 'per_person') return `${item.guest_count || 1} ppl`
  if (item.pricing_type === 'per_piece')  return `${item.piece_count || 1} pcs`
  if (item.pricing_type === 'per_gallon') return `${item.piece_count || 1} gal`
  if (item.pricing_type === 'per_portion') return `${item.piece_count || 1} portions`
  if (item.tray_size === 'custom') return `${item.tray_quantity || 1}×`
  return '1'
}

function calcItemTotal(item: any): number {
  if (item.pricing_type === 'tray') {
    if (item.tray_size === 'custom') return Math.round((item.tray_quantity || 1) * item.unit_price_cents)
    return item.unit_price_cents
  }
  if (item.pricing_type === 'per_person') return (item.guest_count || 0) * item.unit_price_cents
  return (item.piece_count || 0) * item.unit_price_cents
}

export async function POST(req: NextRequest) {
  try {
    const {
      enquiry_id, round_id,
      admin_replies, admin_overall_reply,
      tray_items,
      delivery_fee_cents, setup_fee_cents, service_fee_cents,
      discount_type, discount_value, discount_cents,
      subtotal_cents, tax_cents, total_cents,
      deposit_cents, balance_cents,
    } = await req.json()

    if (!enquiry_id || !round_id) {
      return NextResponse.json({ error: 'enquiry_id and round_id required' }, { status: 400 })
    }

    // 1. Load the current round FIRST (before any updates)
    const { data: currentRound, error: crErr } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('id', round_id)
      .single()

    if (crErr || !currentRound) throw new Error('Round not found')

    // 2. Load ALL previous rounds (before expiring anything)
    const { data: allRounds } = await supabase
      .from('quote_review_tokens')
      .select('*')
      .eq('enquiry_id', enquiry_id)
      .order('round_number', { ascending: true })

    // 3. FIX-036: Build thread map BEFORE saving/expiring anything
    // Include ALL rounds including current one being replied to
    // admin_replies param = what admin just typed NOW for this round
    const adminRepliesMap: Record<string, string> = {}
    for (const r of (admin_replies || [])) {
      adminRepliesMap[r.dish_name?.toLowerCase()] = r.reply
    }

    // Build thread per dish from all historical rounds + current round being replied to
    const threadMap: Record<string, any[]> = {}

    for (const round of (allRounds || [])) {
      const roundAdminReplies: any[] = round.admin_replies || []

      for (const change of (round.customer_changes || [])) {
        if (!change.customer_comments?.trim()) continue
        const key = change.dish_name?.toLowerCase()
        if (!threadMap[key]) threadMap[key] = []

        // Find admin reply for this dish in this round
        // For the current round being replied to, use the admin_replies from request
        let adminReply = ''
        if (round.id === round_id) {
          // FIX-037: use the replies being sent NOW, not what's in DB (not saved yet)
          adminReply = adminRepliesMap[key] || ''
        } else {
          const savedReply = roundAdminReplies.find((r: any) => r.dish_name?.toLowerCase() === key)
          adminReply = savedReply?.reply || ''
        }

        threadMap[key].push({
          round: round.round_number,
          customer_comment: change.customer_comments,
          admin_reply: adminReply,
        })
      }
    }

    // 4. Save admin_replies to current round and expire it
    await supabase
      .from('quote_review_tokens')
      .update({
        admin_replies: admin_replies || [],
        admin_overall_reply: admin_overall_reply || null,
        status: 'expired',
      })
      .eq('id', round_id)

    // FIX-058 (Jun 16 2026): Expire ALL pending/pending_customer tokens for this enquiry
    // BEFORE: only expired the current round_id token
    //         Previous pending_customer tokens (e.g. Round 2) stayed as 'pending_customer'
    //         ReviewRoundsPanel showed Round 2 as "Sent — Awaiting Customer" even after Round 3 created
    // AFTER:  expire all pending/viewed/pending_customer tokens for this enquiry
    //         Ensures only the NEW token just created is active
    await supabase
      .from('quote_review_tokens')
      .update({ status: 'expired' })
      .eq('enquiry_id', enquiry_id)
      .in('status', ['pending', 'viewed', 'pending_customer'])

    // 5. Load enquiry
    const { data: enquiry, error: eErr } = await supabase
      .from('enquiries').select('*').eq('id', enquiry_id).single()
    if (eErr || !enquiry) throw new Error('Enquiry not found')

    // 6. Load current quote and save updated version
    const { data: currentQuote } = await supabase
      .from('quotes')
      .select('*')
      .eq('enquiry_id', enquiry_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const newVersion = (currentQuote?.version || 1) + 1

    // Mark old quote as not current
    await supabase
      .from('quotes')
      .update({ is_current: false })
      .eq('enquiry_id', enquiry_id)

    // Save new quote version
    const { data: newQuote, error: qErr } = await supabase
      .from('quotes')
      .insert({
        enquiry_id,
        catering_type: currentQuote?.catering_type || 'tray',
        version: newVersion,
        is_current: true,
        status: 'draft',
        subtotal_cents,
        discount_type: discount_type || null,
        discount_value: discount_value || 0,
        discount_cents: discount_cents || 0,
        discount_amount_cents: discount_cents || 0,
        delivery_fee_cents: delivery_fee_cents || 0,
        setup_fee_cents: setup_fee_cents || 0,
        service_fee_cents: service_fee_cents || 0,
        tax_rate: 7,
        tax_cents,
        total_cents,
        change_notes: `Round ${newVersion} — reply to customer feedback`,
      })
      .select()
      .single()

    if (qErr || !newQuote) throw new Error('Failed to save quote: ' + qErr?.message)

    // 7. Save updated tray items
    if (tray_items?.length > 0) {
      const itemsToInsert = tray_items.map((item: any, idx: number) => ({
        quote_id: newQuote.id,
        dish_name: item.dish_name,
        pricing_type: item.pricing_type || 'tray',
        tray_size: item.tray_size || null,
        tray_quantity: item.tray_quantity || 1,
        unit_price_cents: item.unit_price_cents || 0,
        total_price_cents: calcItemTotal(item),
        guest_count: item.guest_count || enquiry.guest_count || 100,
        piece_count: item.piece_count || 1,
        notes_to_customer: item.notes_to_customer || '',
        customer_comments: '',
        sort_order: idx,
      }))
      await supabase.from('quote_tray_items').insert(itemsToInsert)
    }

    // 8. Build new round number
    const newRoundNumber = (allRounds?.length || 0) + 1

    // 9. FIX-036+037: Build snapshot with COMPLETE thread per dish
    // Thread now correctly includes current round's replies (built in step 3)
    const snapshot = {
      catering_type: currentQuote?.catering_type || 'tray',
      tray_items: tray_items.map((item: any) => {
        const key = item.dish_name?.toLowerCase()
        const thread = threadMap[key] || []
        const currentAdminReply = adminRepliesMap[key] || ''

        return {
          id: item.id,
          dish_name: item.dish_name,
          pricing_type: item.pricing_type || 'tray',
          tray_size: item.tray_size || null,
          tray_quantity: item.tray_quantity || 1,
          guest_count: item.guest_count || enquiry.guest_count,
          piece_count: item.piece_count || 1,
          unit_price_cents: item.unit_price_cents || 0,
          total_price_cents: calcItemTotal(item),
          notes_to_customer: item.notes_to_customer || '',
          // FIX-037: admin_reply is the CURRENT round reply shown highlighted
          // Only set if admin replied to THIS item this round
          admin_reply: currentAdminReply,
          // FIX-054 (Jun 16 2026): include ALL rounds in thread[] — do NOT slice
          // BEFORE: thread.slice(0, -1) removed the last entry to prevent duplication
          //         BUT for Round 2 (only 1 round of history), slice removes the ONLY entry → empty []
          //         Customer saw NO conversation history on Round 2+ review page
          // AFTER:  thread[] = complete history including current round
          //         review page renders thread[] for history, admin_reply for highlighted latest reply
          //         No duplication because they're rendered in different UI sections
          thread: thread, // FIX-054: ALL rounds, no slice
          customer_comments: '',
        }
      }),
      subtotal_cents,
      delivery_fee_cents: delivery_fee_cents || 0,
      setup_fee_cents: setup_fee_cents || 0,
      service_fee_cents: service_fee_cents || 0,
      discount_cents: discount_cents || 0,
      tax_cents,
      total_cents,
      deposit_cents,
      balance_cents,
      admin_overall_reply: admin_overall_reply || null,
    }

    // 10. Create new round token with pending_customer status
    const { data: newToken, error: tErr } = await supabase
      .from('quote_review_tokens')
      .insert({
        enquiry_id,
        quote_id: newQuote.id,
        round_number: newRoundNumber,
        status: 'pending_customer',
        sent_snapshot: snapshot,
        customer_email: enquiry.customer_email,
        customer_name: enquiry.customer_name,
      })
      .select()
      .single()

    if (tErr || !newToken) throw new Error('Failed to create token: ' + tErr?.message)

    // 11. Update enquiry
    await supabase
      .from('enquiries')
      .update({
        review_status: 'sent_for_review',
        latest_review_token_id: newToken.id,
        status: 'quoted',
      })
      .eq('id', enquiry_id)

    // 12. Send email to customer
    const reviewUrl = `${BASE_URL}/review/${newToken.token}`
    const eventDate = new Date(enquiry.event_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const eventType = (enquiry.event_type || '')
      .split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    await sendReplyEmail({
      to: enquiry.customer_email,
      customerName: enquiry.customer_name,
      eventType, eventDate,
      venue: enquiry.venue_name || enquiry.venue_address || 'TBD',
      guestCount: enquiry.guest_count,
      reviewUrl,
      roundNumber: newRoundNumber,
      snapshot,
      adminOverallReply: admin_overall_reply || '',
    })

    // 13. WhatsApp message
    const firstName = enquiry.customer_name.split(' ')[0]
    const whatsapp_message = `Hi ${firstName}! 🙏 We've reviewed your feedback and updated your catering quote (Round ${newRoundNumber}).\n\nTotal: ${fmt(total_cents)}\n\nReview our response here:\n${reviewUrl}\n\n— Maya Catering 🍛`

    return NextResponse.json({
      success: true,
      token: newToken.token,
      review_url: reviewUrl,
      round_number: newRoundNumber,
      // FIX-038: return correct enquiry_id so client can redirect properly
      enquiry_id,
      whatsapp_message,
    })

  } catch (err: any) {
    console.error('send-reply error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendReplyEmail({
  to, customerName, eventType, eventDate, venue, guestCount,
  reviewUrl, roundNumber, snapshot, adminOverallReply,
}: any) {
  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
  })

  const firstName = customerName.split(' ')[0]

  let dishRowsHtml = ''
  for (let i = 0; i < (snapshot.tray_items || []).length; i++) {
    const item = snapshot.tray_items[i]
    const bg = i % 2 === 0 ? '#ffffff' : '#f9f6f0'
    const itemTotal = calcItemTotal(item)

    dishRowsHtml += `
      <tr style="background:${bg}">
        <td style="padding:10px 12px;font-size:13px;color:#1a1a1a;font-weight:600;vertical-align:top">${item.dish_name}</td>
        <td style="padding:10px 12px;font-size:12px;color:#666;vertical-align:top">${getSizeOrType(item)}</td>
        <td style="padding:10px 12px;font-size:12px;color:#444;text-align:center;vertical-align:top">${getQty(item)}</td>
        <td style="padding:10px 12px;font-size:12px;color:#444;text-align:right;vertical-align:top">${fmt(item.unit_price_cents)}</td>
        <td style="padding:10px 12px;font-size:13px;color:#C9A84C;font-weight:bold;text-align:right;vertical-align:top">${fmt(itemTotal)}</td>
        <td style="padding:10px 12px;font-size:11px;color:#888;font-style:italic;vertical-align:top">${item.notes_to_customer || ''}</td>
      </tr>`

    // Thread under dish
    const thread: any[] = item.thread || []
    const hasContent = item.notes_to_customer || thread.length > 0 || item.admin_reply

    if (hasContent) {
      let threadHtml = ''

      if (item.notes_to_customer) {
        threadHtml += `<div style="margin-bottom:6px;font-size:11px;color:#888"><span style="color:#C9A84C;font-weight:bold">📝 Maya Note:</span> ${item.notes_to_customer}</div>`
      }

      // Historical thread (all previous rounds)
      for (const t of thread) {
        threadHtml += `<div style="margin-bottom:3px;font-size:11px"><span style="color:#b8860b;font-weight:bold">💬 You (R${t.round}):</span> <span style="color:#666">${t.customer_comment}</span></div>`
        if (t.admin_reply) {
          threadHtml += `<div style="margin-bottom:6px;font-size:11px;padding-left:12px;border-left:2px solid #C9A84C"><span style="color:#2e7d32;font-weight:bold">↳ Maya (R${t.round}):</span> <span style="color:#444">${t.admin_reply}</span></div>`
        }
      }

      // Current round's customer comment + Maya reply
      // Find the customer comment for this item from the current round
      // (it's the last entry in the full thread before we sliced it)
      if (item.admin_reply) {
        threadHtml += `<div style="margin-top:4px;font-size:11px;padding:6px 12px;border-left:2px solid #C9A84C;background:#f0fff0;border-radius:0 4px 4px 0"><span style="color:#2e7d32;font-weight:bold">↳ Maya Reply:</span> <span style="color:#1a5c1a">${item.admin_reply}</span></div>`
      }

      if (threadHtml) {
        dishRowsHtml += `
          <tr style="background:${bg}">
            <td colspan="6" style="padding:4px 12px 10px;border-bottom:1px solid #e8dfc8">${threadHtml}</td>
          </tr>`
      }
    }
  }

  const feeRowsHtml = [
    snapshot.delivery_fee_cents > 0 ? `<tr><td style="padding:5px 0;color:#666">Delivery Fee</td><td style="text-align:right">${fmt(snapshot.delivery_fee_cents)}</td></tr>` : '',
    snapshot.setup_fee_cents > 0    ? `<tr><td style="padding:5px 0;color:#666">Setup Fee</td><td style="text-align:right">${fmt(snapshot.setup_fee_cents)}</td></tr>` : '',
    snapshot.service_fee_cents > 0  ? `<tr><td style="padding:5px 0;color:#666">Service Fee</td><td style="text-align:right">${fmt(snapshot.service_fee_cents)}</td></tr>` : '',
    snapshot.discount_cents > 0     ? `<tr><td style="padding:5px 0;color:#666">Discount</td><td style="text-align:right;color:#c00">-${fmt(snapshot.discount_cents)}</td></tr>` : '',
  ].join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif">
<div style="max-width:680px;margin:0 auto;background:#fff">
  <div style="background:#05091A;padding:32px 40px;text-align:center">
    <div style="color:#C9A84C;font-size:22px;font-weight:bold;letter-spacing:3px">MAYA INDIAN CATERING</div>
    <div style="color:#F6EDD8;font-size:11px;margin-top:6px">33 Tuttle St, Wakefield MA · mayacater.com</div>
  </div>
  <div style="background:#C9A84C;padding:10px 40px;text-align:center">
    <span style="color:#05091A;font-size:12px;font-weight:bold">📋 Updated Quote — Round ${roundNumber}</span>
  </div>
  <div style="padding:36px 40px">
    <h2 style="color:#05091A;font-size:20px;margin:0 0 8px">Dear ${firstName},</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 20px">
      Thank you for your feedback! We've reviewed your comments and updated your quote below.
      Please review Round ${roundNumber} and let us know if everything looks good.
    </p>
    ${adminOverallReply ? `
    <div style="background:#e8f5e9;border-left:4px solid #2e7d32;padding:14px 18px;margin-bottom:24px;border-radius:0 6px 6px 0">
      <div style="font-size:11px;color:#2e7d32;font-weight:bold;margin-bottom:4px">📝 Message from Maya Team:</div>
      <p style="color:#1a5c1a;font-size:13px;margin:0;line-height:1.6">${adminOverallReply}</p>
    </div>` : ''}
    <div style="background:#f6edd8;border-left:4px solid #C9A84C;padding:16px 20px;margin-bottom:24px;border-radius:0 6px 6px 0">
      <table style="width:100%;font-size:13px">
        <tr><td style="color:#888;padding:3px 0;width:100px">Event</td><td style="color:#1a1a1a;font-weight:bold">${eventType}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Date</td><td style="color:#1a1a1a;font-weight:bold">${eventDate}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Venue</td><td style="color:#1a1a1a">${venue}</td></tr>
        <tr><td style="color:#888;padding:3px 0">Guests</td><td style="color:#1a1a1a">${guestCount}</td></tr>
      </table>
    </div>
    <div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#888;margin-bottom:8px;text-transform:uppercase">Your Updated Menu</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e8dfc8">
      <tr style="background:#C9A84C">
        <th style="padding:10px 12px;text-align:left;color:#05091A;font-size:11px">DISH</th>
        <th style="padding:10px 12px;text-align:left;color:#05091A;font-size:11px">TYPE</th>
        <th style="padding:10px 12px;text-align:center;color:#05091A;font-size:11px">QTY</th>
        <th style="padding:10px 12px;text-align:right;color:#05091A;font-size:11px">UNIT PRICE</th>
        <th style="padding:10px 12px;text-align:right;color:#05091A;font-size:11px">TOTAL</th>
        <th style="padding:10px 12px;text-align:left;color:#05091A;font-size:11px">NOTES</th>
      </tr>
      ${dishRowsHtml}
    </table>
    <table style="width:100%;font-size:13px;margin-bottom:28px">
      <tr><td style="padding:5px 0;color:#666">Subtotal</td><td style="text-align:right">${fmt(snapshot.subtotal_cents)}</td></tr>
      ${feeRowsHtml}
      <tr><td style="padding:5px 0;color:#666">Tax (7% MA)</td><td style="text-align:right">${fmt(snapshot.tax_cents)}</td></tr>
      <tr style="border-top:2px solid #C9A84C">
        <td style="padding:10px 0;font-size:16px;font-weight:bold;color:#05091A">Grand Total</td>
        <td style="text-align:right;font-size:18px;font-weight:bold;color:#C9A84C">${fmt(snapshot.total_cents)}</td>
      </tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">20% Deposit</td><td style="text-align:right;color:#444;font-size:12px">${fmt(snapshot.deposit_cents)}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:12px">Balance (3 days before)</td><td style="text-align:right;color:#444;font-size:12px">${fmt(snapshot.balance_cents)}</td></tr>
    </table>
    <div style="text-align:center;margin:32px 0">
      <a href="${reviewUrl}" style="background:#C9A84C;color:#05091A;padding:16px 40px;text-decoration:none;font-weight:bold;font-size:15px;border-radius:4px;display:inline-block;letter-spacing:1px">
        ✅ Review Round ${roundNumber} & Confirm
      </a>
      <p style="color:#888;font-size:11px;margin-top:12px">${reviewUrl}</p>
    </div>
    <p style="margin-top:28px;font-size:13px;color:#444">
      Warm regards,<br>
      <strong>Maya Team</strong><br>
      <span style="color:#888">📞 617-987-5222 &nbsp;·&nbsp; 📧 indianflamesinc@gmail.com &nbsp;·&nbsp; 🌐 www.mayacater.com</span>
    </p>
  </div>
  <div style="background:#05091A;padding:20px 40px;text-align:center">
    <div style="color:#888;font-size:11px">Maya Indian Catering · 33 Tuttle St, Wakefield MA 01880 · mayacater.com</div>
  </div>
</div>
</body></html>`

  await mailer.sendMail({
    from: `"Maya Indian Catering" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Updated Quote Round ${roundNumber} — ${eventType} | Maya Catering`,
    html,
  })
}
