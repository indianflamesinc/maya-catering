# MAYA Platform — CHANGELOG

Format: FIX-### | Date | Symptom | Root Cause | Files Changed

---

## FIX-001 | Jun 14 2026 | DEPLOYED ✅ (commit 30a5b05)
**Symptom:** Review page qty=1 for per_piece/per_person items; tray size label wrong
**Root Cause:** Review page always used tray_quantity=1 regardless of pricing type
**Files:** src/app/review/[token]/page.tsx

---

## FIX-002 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Fees and discount missing from customer email and review page
**Root Cause:** delivery_fee_cents / setup_fee_cents / service_fee_cents / discount_cents columns did not exist in quotes table
**SQL Required:** ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER DEFAULT 0, setup_fee_cents INTEGER DEFAULT 0, service_fee_cents INTEGER DEFAULT 0, discount_cents INTEGER DEFAULT 0, discount_type TEXT DEFAULT 'none', discount_value NUMERIC(10,2) DEFAULT 0;
**Files:** src/app/api/quotes/send-review/route.ts, src/app/review/[token]/page.tsx

---

## FIX-003 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** ReviewRoundsPanel WAS column showing "†" — original qty blank for all items
**Root Cause:** quotes/route.ts was not saving piece_count to DB. computeDiff() used tray_quantity for all types.
**Files:** src/app/api/quotes/route.ts, src/app/api/review/[token]/submit/route.ts

---

## FIX-004 | Jun 15 2026 | DEFERRED
**Symptom:** Date input JS workaround on new enquiry form
**Status:** Deferred — admin-only, low priority

---

## FIX-005 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Setup and service fees reset to $0 when reloading quote in Quote Builder
**Root Cause:** quotes/route.ts INSERT did not include delivery_fee_cents / setup_fee_cents / service_fee_cents. Quote builder load did not read them back.
**Files:** src/app/api/quotes/route.ts, src/app/admin/enquiries/[id]/quote/page.tsx

---

## FIX-006 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Aloo Gobi (Multiple tray) showed "Custom" on customer review page
**Root Cause:** getTrayLabel() mapped tray_size='custom' to "Custom"
**Files:** src/app/review/[token]/page.tsx
**Lines changed:** getTrayLabel(): custom → `${tray_quantity}× Tray`

---

## FIX-007 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Labour $0.00 always shown in enquiry detail quote summary card
**Root Cause:** Labour stat card rendered unconditionally
**Files:** src/app/admin/enquiries/[id]/page.tsx

---

## FIX-008 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Admin cannot see customer comments per dish when editing quote after review
**Root Cause:** TrayItemsSection had no customer_feedback display
**Files:** src/components/crm/TrayItemsSection.tsx

---

## FIX-009 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** New enquiry form had "Save + Schedule Tasting" — most enquiries should go straight to quote
**Root Cause:** UX — tasting was default secondary CTA
**Files:** src/app/admin/enquiries/new/page.tsx

---

## FIX-010 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Aloo Gobi shows "UNDEFINED× FULL TRAY" label in Quote Builder
**Root Cause:** tray_quantity not read from DB when loading quote; undefined on custom items
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx

---

## FIX-011 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** When editing quote after customer review, admin cannot see customer comments per dish
**Root Cause:** Quote builder did not load customer_changes from review rounds
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx

---

## FIX-012 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Naan qty=1, Masala Tea qty=1, Paav Bhaji qty=1 on customer review page
**Root Cause:** Review GET route always used tray_quantity for qty. per_gallon and per_portion not handled.
**Files:** src/app/api/review/[token]/route.ts

---

## FIX-013 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** No way for customer to confirm quote without changes
**Root Cause:** Only "Submit My Review" button existed
**Files:** src/app/review/[token]/page.tsx

---

## FIX-014 | Jun 15 2026 | DEPLOYED ✅ (NEW FILE)
**Symptom:** No deposit page
**Files:** src/app/review/[token]/deposit/page.tsx
**Notes:** Stripe / Zelle / Check options. Zelle: indianflamesinc@gmail.com. Check: Indian Flames Inc, 33 Tuttle St, Wakefield MA.

---

## FIX-015 | Jun 15 2026 | DEPLOYED ✅ (NEW FILE)
**Symptom:** No admin notification when customer confirms happy
**Files:** src/app/api/quotes/confirm-happy/route.ts

---

## FIX-016 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** No "Mark Deposit Received" button in admin when awaiting Zelle/Check
**Files:** src/app/admin/enquiries/[id]/page.tsx

---

## FIX-017 | Jun 15 2026 | DEPLOYED ✅ (NEW FILE)
**Symptom:** No deposit method handling (Stripe/Zelle/Check)
**Files:** src/app/api/quotes/deposit-intent/route.ts

---

## FIX-018 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** ReviewRoundsPanel WAS column wrong for per_person/per_piece/per_gallon items
**Files:** src/components/crm/ReviewRoundsPanel.tsx

---

## FIX-024 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** New enquiry form defaulted to Wedding — most enquiries are home parties
**Files:** src/app/admin/enquiries/new/page.tsx

---

## FIX-025 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Quote Builder auto-switched to per_person pricing for wedding/engagement events
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx

---

## FIX-026 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Admin dish notes never shown to customer
**SQL Required:** ALTER TABLE quote_tray_items ADD COLUMN IF NOT EXISTS notes_to_customer TEXT;
**Files:** src/components/crm/TrayItemsSection.tsx, src/app/api/quotes/send-review/route.ts, src/app/api/quotes/route.ts, src/app/admin/enquiries/[id]/quote/page.tsx

---

## FIX-027 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Admin could click "Send Round 2" without editing quote first
**Files:** src/components/crm/ReviewRoundsPanel.tsx

---

## FIX-028 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** WhatsApp message required manual copy-paste
**Files:** src/components/crm/ReviewRoundsPanel.tsx

---

## FIX-029 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** notes_to_customer missing from review page URL (only showed in email)
**Root Cause:** review/[token]/route.ts snapshot map never included notes_to_customer field
**Files:** src/app/api/review/[token]/route.ts

---

## FIX-030 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Customer could edit qty on review page — should be comments only
**Root Cause:** Qty shown as editable input instead of static display
**Files:** src/app/review/[token]/page.tsx

---

## FIX-031 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Review link showed error page after customer submitted ("Link Unavailable")
**Root Cause:** API returned 410 for submitted/accepted status — no graceful state
**Fix:** Return status in response body; review page handles each state gracefully:
  - pending_maya → "Your feedback has been received"
  - accepted → permanent order confirmation (bookmarkable)
  - expired → "A new link has been sent"
**Files:** src/app/api/review/[token]/route.ts, src/app/review/[token]/page.tsx

---

## FIX-032 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** No conversation thread per dish — customer couldn't see Maya's replies
**Root Cause:** No thread data structure existed
**Fix:** Full thread per dish: Maya Note → Customer R1 → Maya R1 → Customer R2 → Maya R2...
**Files:** src/app/review/[token]/page.tsx, src/app/api/quotes/send-reply/route.ts

---

## FIX-033 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Admin diff email showed Field/Original/Updated columns — confusing since qty read-only
**Root Cause:** Old email format assumed qty changes
**Fix:** Redesigned to comments-only table: Dish | Customer's Comment. Added "Open Reply Builder" button.
**Files:** src/app/api/review/[token]/submit/route.ts

---

## FIX-034 | Jun 15 2026 | DEPLOYED ✅ (NEW FILE)
**Symptom:** No dedicated page for admin to review customer feedback and send Round N
**Fix:** New Reply Builder page at /admin/enquiries/[id]/reply
  - Shows full conversation thread per dish
  - Admin types reply per dish in green input
  - Can edit qty/price/tray size per dish
  - Can add/remove dishes
  - Fees & discount preserved from previous quote
  - Overall reply to customer
  - Live total update
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx (NEW)

---

## FIX-035 | Jun 15 2026 | DEPLOYED ✅ (NEW FILE)
**Symptom:** No API to save admin replies and send Round N
**Fix:** New send-reply API:
  1. Saves admin_replies to current round token
  2. Saves updated quote as new version
  3. Creates new round token with pending_customer status
  4. Sends branded email with full thread per dish
  5. Returns WhatsApp message
**Files:** src/app/api/quotes/send-reply/route.ts (NEW)

---

## SQL — quote_review_tokens constraint update | Jun 16 2026 | DONE ✅
**Symptom:** ERROR 23514 — new status values rejected by check constraint
**Fix:** Dropped and recreated constraint with new values:
  pending | viewed | submitted | pending_maya | pending_customer | accepted | expired
**SQL Run:**
  ALTER TABLE quote_review_tokens DROP CONSTRAINT quote_review_tokens_status_check;
  ALTER TABLE quote_review_tokens ADD CONSTRAINT quote_review_tokens_status_check
    CHECK (status = ANY (ARRAY['pending','viewed','submitted','pending_maya','pending_customer','accepted','expired']));

---

## SQL — admin_replies columns | Jun 15 2026 | DONE ✅
**SQL Run:**
  ALTER TABLE quote_review_tokens ADD COLUMN IF NOT EXISTS admin_replies JSONB DEFAULT '[]';
  ALTER TABLE quote_review_tokens ADD COLUMN IF NOT EXISTS admin_overall_reply TEXT;

---

## FIX-036 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Thread history empty [] in all round snapshots — customer couldn't see conversation history on review URL
**Root Cause:** send-reply/route.ts built threadMap AFTER expiring the current round token.
  When allRounds was fetched, the current round's admin_replies hadn't been saved yet (saved in same step).
  So threadMap was built without the current round's replies.
**Fix:** Build threadMap BEFORE saving/expiring anything. For current round, use admin_replies from
  request body (not from DB — not saved yet). Then expire and save.
**Files:** src/app/api/quotes/send-reply/route.ts

---

## FIX-037 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Maya reply showing twice on review page (R1 and R2 showing same reply)
**Root Cause:** Thread snapshot included current round's reply in thread[] AND separately in admin_reply field.
  Review page rendered both, causing duplicate display.
**Fix:** thread[] = all PREVIOUS rounds only (thread.slice(0, -1))
  admin_reply = current round's reply shown separately as highlighted "latest reply"
  Review page renders thread[] for history, admin_reply for current — no overlap.
**Files:** src/app/api/quotes/send-reply/route.ts, src/app/review/[token]/page.tsx

---

## FIX-038 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** After sending Round N from Reply Builder, page redirected to wrong enquiry
**Root Cause:** Reply Builder used URL param [id] for redirect. In some test cases the token's
  enquiry_id differed from the URL param due to manual SQL updates during testing.
**Fix:** send-reply API returns enquiry_id in response. Reply Builder uses data.enquiry_id for
  redirect instead of URL param.
**Files:** src/app/api/quotes/send-reply/route.ts, src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-039 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Changing tray size in Reply Builder (e.g. Avial Medium → Full Tray) didn't update price
**Root Cause:** Reply Builder loads items from snapshot which has no master_id field.
  Quote Builder uses master_id to look up prices from master menu — Reply Builder couldn't do this.
**Fix:** Reply Builder now fetches master menu on load and builds a name→prices map (lowercase match).
  Each DishItem gets master_prices attached if dish name matches master menu.
  When tray_size changes, unit_price_cents auto-updates from master_prices:
    half → half_tray_cents
    medium → medium_tray_cents
    full / custom → full_tray_cents
  Price hints (S/M/F) shown below unit price input for reference.
  Green dot "● prices from menu" indicator when master prices available.
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-040 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** After sending Round 1, no WhatsApp one-click button — admin had to copy-paste message manually
**Root Cause:** SendReviewButton showed copy-paste text only. WhatsApp one-click existed in Reply Builder
  (Round 2+) but not in SendReviewButton (Round 1).
**Fix:** Added "📱 Open WhatsApp" button to SendReviewButton success state.
  Requires customerPhone prop — passed from enquiry.customer_phone in enquiry detail page.
  Opens wa.me/1{phone}?text={message} in new tab — same pattern as Reply Builder.
**Files:** src/components/crm/SendReviewButton.tsx, src/app/admin/enquiries/[id]/page.tsx
**Note:** Round 2+ WhatsApp already worked via Reply Builder (FIX-028/035)

---

## FIX-041 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Setting a dish qty to 0 in Reply Builder still showed original qty on customer review page
  e.g. Pani Puri set to 0 ppl still showed 100 ppl
**Root Cause:** getCorrectQty() in review/[token]/route.ts used || (logical OR):
  return item.guest_count || item.tray_quantity || 1
  In JavaScript, 0 is falsy so 0 || 100 || 1 = 100 — fell through to tray_quantity!
**Fix:** Changed || to ?? (nullish coalescing) throughout getCorrectQty():
  return item.guest_count ?? item.tray_quantity ?? 1
  ?? only falls through on null/undefined, NOT on 0 — preserves zero correctly
**Files:** src/app/api/review/[token]/route.ts
**IMPORTANT:** This affects all per_person, per_piece, per_gallon, per_portion items set to 0

---

## FIX-042 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Clicking "Open Reply Builder" from admin email showed "No customer response found"
**Root Cause:** Two related issues:
  1. Email's Reply Builder URL was /admin/enquiries/{enquiry_id}/reply with no token info
     Reply Builder searched for pending_maya rounds by enquiry_id from URL param
     In edge cases (test data, manual SQL), token's enquiry_id differed from URL param → not found
  2. Reply Builder had no fallback mechanism — single point of failure
**Fix:**
  1. submit/route.ts: Reply Builder URL in admin email now includes ?token={token}
     e.g. /admin/enquiries/{id}/reply?token=abc123
  2. reply/page.tsx: loadAll() now has two-path loading:
     Path A (email): reads ?token= from query string → loads review token directly → finds round
     Path B (CRM button): searches by enquiry_id from URL param (existing behavior)
     Falls through to Path B if Path A finds nothing
  3. Error message improved: "Customer may not have submitted their review yet"
**Files:** src/app/api/review/[token]/submit/route.ts, src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-043 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Customer comment showing twice in Reply Builder (plain text + highlighted yellow box)
**Root Cause:** thread[] array included current round's customer comment AND it was also shown
  separately as a highlighted box — two different render paths showing same data
**Fix:** Added guard: only show highlighted box if comment is NOT already in thread[]
  thread[] = previous rounds history only
  Highlighted box = current round only (no overlap)
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-044 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Cannot enter 1.75 as tray quantity in Reply Builder — jumps from 1.5 to 2.0
**Root Cause:** tray_quantity input step was 0.5 — only allowed multiples of 0.5
**Fix:** Changed step from 0.5 to 0.25 — now allows 1.25, 1.5, 1.75, 2.0 etc.
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-045 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** WhatsApp not opening after sending Round N from Reply Builder
**Root Cause:** window.open() called after async await — browsers block popups from async callbacks
  (security policy: popups must originate from direct user interaction, not async code)
**Fix:** Store WhatsApp URL in state after send completes.
  Show "📱 WhatsApp" button in header that user clicks directly — no popup blocker issue.
  Button appears only after successful send.
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx

---

## FIX-046 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Review page Round 2+ not showing thread history, Maya replies, or updated quantities
  e.g. Avial showed Medium (¾ tray) not Full Tray after admin changed it in Reply Builder
**Root Cause:** review/[token]/route.ts always re-fetched tray_items from quote_tray_items DB table.
  thread[] and admin_reply fields are NOT stored in quote_tray_items — only in sent_snapshot.
  So every time customer opened Round 2+ link, thread/admin_reply was lost (empty [] and '')
**Fix:** Two-path strategy based on round status:
  Round 1 (pending/viewed): re-fetch from DB — gets latest notes_to_customer
  Round 2+ (pending_customer): use sent_snapshot DIRECTLY — has full thread/admin_reply baked in
  send-reply/route.ts carefully builds complete snapshot with thread — now that data is used
**Files:** src/app/api/review/[token]/route.ts
**IMPORTANT:** This is the core fix for thread history visibility on customer review page

---

## FIX-047 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** WhatsApp link not appearing after Round 1 send in SendReviewButton
**Root Cause:** window.open() used inside onClick handler — but result state was checked
  with conditional rendering. Same popup blocker issue as FIX-045.
**Fix:** Replaced window.open() with getWhatsAppUrl() function that returns URL string.
  Rendered as <a href={url} target="_blank"> — browser never blocks direct anchor clicks.
  Link appears in success state after send completes.
**Files:** src/components/crm/SendReviewButton.tsx

---

## FIX-054 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Round 2+ review page showed NO conversation thread — customer couldn't see their
  R1 comments or Maya's replies. Only Maya Notes showed.
**Root Cause:** send-reply/route.ts used thread.slice(0, -1) to prevent duplication.
  For Round 2 (only 1 round of history), slice(0,-1) removed the ONLY thread entry → empty [].
  Review page received empty thread[] so showed nothing.
**Fix:** Removed slice(0,-1) entirely. thread[] now contains ALL rounds.
  No duplication because thread[] (history) and admin_reply (current) render in different UI sections.
**Files:** src/app/api/quotes/send-reply/route.ts
**Impact:** Fixes ISSUE-056 and ISSUE-057 as cascading effects

---

## FIX-058 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Round 2 showed "Sent — Awaiting Customer" status even after Round 3 was created
**Root Cause:** send-reply only expired the current round_id token.
  Previous pending_customer tokens (Round 2) were not expired.
  ReviewRoundsPanel showed Round 2 as still active.
**Fix:** After expiring current round, also expire all pending/viewed/pending_customer
  tokens for the same enquiry_id using .in('status', [...])
**Files:** src/app/api/quotes/send-reply/route.ts

---

## FIX-059 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** Customer could submit feedback multiple times on the same round.
  Each submission created a new round and sent admin a new email.
  Customer received Round 3, 4, 5 emails unexpectedly.
**Root Cause — Two layers:**
  1. After submit, local React 'submitted' state showed confirmation.
     But page refresh reset local state → form showed again → customer resubmitted
  2. Customer couldn't see their R1 feedback was acknowledged (ISSUE-054)
     so thought nothing was saved
**Fix:**
  Layer 1: GET route already returns status:'pending_maya' after submit (FIX-031/046)
           Review page already handles pending_maya → shows permanent "feedback received"
           No code change needed here — just needed FIX-054 to make thread visible
  Layer 2: Submit route already blocks re-submission with 410 status check
  Combined: Once FIX-054 is deployed, customers see their feedback was received
           and have no reason to resubmit
**Files:** No new files — resolved by FIX-054 + existing FIX-031/046
**Note:** The 410 block in submit/route.ts prevents API-level resubmission already

---

## FIX-060 | Jun 16 2026 | DEPLOYED ✅
**Symptom:** After admin sends Round N from Reply Builder, page immediately redirected
  to enquiry. Admin didn't see confirmation so clicked Send again → duplicate rounds sent.
**Root Cause:** router.push() fired immediately after successful send — no visual confirmation.
  Race condition: redirect happened before admin could see the new round was created.
**Fix:** Replaced immediate redirect with success state page showing:
  - "Round N Sent!" confirmation
  - 📱 WhatsApp button to notify customer
  - Preview link for customer's new review URL
  - "← Back to Enquiry" button (admin must click explicitly)
  Admin cannot accidentally send twice — must navigate away intentionally.
**Files:** src/app/admin/enquiries/[id]/reply/page.tsx

---

## KNOWN ISSUES / FUTURE WORK
- FIX-004: Date input on new enquiry form (deferred — admin only)
- Kitchen Prep List PDF (/admin/enquiries/[id]/kitchen) — CRITICAL for Jul 15 & Jul 18 Marriott events
- Fees overhaul: Wire Rack / Stainless Steel / Copper setup types, Labour count×rate, Travel fee
- Stripe deposit success page (/review/[token]/deposit/success)
- Customer Portal (/portal/login, /portal/dashboard)
- Google Calendar sync
- Digital contract generation

## TEST DATA SEED SCRIPT
See: Maya Platform Session Docs in Google Drive
Reset: UPDATE enquiries SET latest_review_token_id = NULL; then DELETE in order:
  quote_review_tokens → quote_tray_items → quote_session_dishes → quote_session_categories
  → quote_sessions → quote_labour → quotes → enquiries
