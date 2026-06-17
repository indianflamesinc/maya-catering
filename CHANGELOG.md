# MAYA Platform — CHANGELOG

## FIX-069 | Jun 16 2026 | WhatsApp anchor link missing after quote send
**Symptom:** After sending Round 1, the "📱 Open WhatsApp" button does not appear — only plain-text message with Copy button.
**Root Cause:** `SendReviewButton` requires `customerPhone` prop to build wa.me URL. Prop was defined in interface but NOT passed at call site in `enquiries/[id]/page.tsx`.
**Fix:** Added `customerPhone={enquiry.customer_phone}` to `<SendReviewButton>` call.
**File:** `src/app/admin/enquiries/[id]/page.tsx`

---

## FIX-070 | Jun 16 2026 | Review page greeting shows first word only
**Symptom:** Customer review page shows "Hello, Test! 👋" instead of "Hello, Test Customer 002! 👋"
**Root Cause:** `customer_name.split(' ')[0]` used in 3 places on review page — only picks first word.
**Fix:** Removed `.split(' ')[0]` — now uses full `customer_name` in greeting, thank-you, and booking confirmed messages.
**File:** `src/app/review/[token]/page.tsx`

---

## FIX-071 | Jun 16 2026 | Item totals show unit price on Round 2+ review page
**Symptom:** Naan shows $4.00 (should be $80.00), Idly $2.00 (should be $160.00) on Round 2+ customer review page.
**Root Cause:** Total calculation `unit_price × (tray_quantity ?? guest_count ?? piece_count ?? 1)` — for Round 2+ snapshots, `tray_quantity=1` (default) takes priority over `piece_count=80` via nullish coalescing, giving wrong result.
**Fix:** Use `total_price_cents` from snapshot when > 0 (calculated correctly by `calcItemTotal()`). Fallback priority fixed to `guest_count ?? piece_count ?? tray_quantity`.
**File:** `src/app/review/[token]/page.tsx` (2 occurrences)

---

## FIX-072 | Jun 16 2026 | Maya Reply shows twice in Round 2+ email
**Symptom:** Round 2 email shows "↳ Maya (R1): changed from 10 to 20" AND "↳ Maya Reply: changed from 10 to 20" for same dish.
**Root Cause:** `thread[]` (FIX-037/054) already contains ALL rounds including current admin_reply as "↳ Maya (RN)". The separate `item.admin_reply` block then renders it again as "↳ Maya Reply".
**Fix:** Removed the separate `item.admin_reply` render block — `thread[]` is the single source of truth.
**File:** `src/app/api/quotes/send-reply/route.ts`

---

## FIX-073 | Jun 16 2026 | Tray multiplier shows 1.25× spinner in Reply Builder
**Symptom:** Custom tray multiplier in Reply Builder shows a number input (allows 1.25, 1.375 etc.) instead of the dropdown (1×, 1.5×, 1.75×, 2×).
**Root Cause:** FIX-052 intended to add dropdown but the `<input type="number" step="0.25">` was never replaced with `<select>`.
**Fix:** Replaced number input with `<select>` containing valid Maya tray multiples: 1×, 1.5×, 1.75×, 2×.
**File:** `src/app/admin/enquiries/[id]/reply/page.tsx`

---

## FIX-074 | Jun 16 2026 | Quote badge shows DRAFT after customer confirms
**Symptom:** After customer confirms and deposit is paid, quote badge still shows "DRAFT" instead of "APPROVED" or "DEPOSIT PAID".
**Root Cause:** Badge read `latestQuote.status` directly. FIX-067 updates quote status via PATCH when advancing — but at APPROVED stage (customer confirm) the quote status wasn't yet updated.
**Fix:** Badge now derives display status from `enquiry.status` when enquiry is at approved/deposit_paid/confirmed/completed stages. Enquiry status always reflects true state.
**File:** `src/app/admin/enquiries/[id]/page.tsx`

---

## FIX-075 | Jun 16 2026 | "Send Quote for Customer Review" button shows at APPROVED/DEPOSIT PAID
**Symptom:** After customer confirms and deposit is paid, the "Send Quote for Customer Review" button is still visible and clickable — could accidentally re-send a quote.
**Root Cause:** Button was shown whenever `enquiry.customer_email` existed, with no stage check.
**Fix:** Added stage guard — button hidden when `enquiry.status` is `approved`, `deposit_paid`, `confirmed`, `completed`, or `cancelled`.
**File:** `src/app/admin/enquiries/[id]/page.tsx`
