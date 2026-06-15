# MAYA Platform — CHANGELOG

Format: FIX-### | Date | Symptom | Root Cause | Fix | Files | SQL Needed | Tested

---

## FIX-001 | Jun 15 2026 | DEPLOYED ✅ (commit 30a5b05)
**Symptom:** Review page showing qty=1 for all per_piece/per_person items; tray size label showed "medium" not "Per Piece"
**Root Cause:** Review page was always displaying tray_quantity=1 regardless of pricing type
**Fix:** Read correct qty field per pricing_type (guest_count for per_person, piece_count for per_piece)
**Files:** src/app/review/[token]/page.tsx

---

## FIX-002 | Jun 15 2026 | DEPLOYED ✅
**Symptom:** Delivery/setup/service fees and discount missing from customer email and review page pricing summary
**Root Cause:** fee columns (delivery_fee_cents, setup_fee_cents, service_fee_cents, discount_cents) did not exist in quotes table
**Fix:** Added fee rows to email HTML and review page; added snapshot fields
**SQL Required:** ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER DEFAULT 0, setup_fee_cents INTEGER DEFAULT 0, service_fee_cents INTEGER DEFAULT 0, discount_cents INTEGER DEFAULT 0, discount_type TEXT DEFAULT 'none', discount_value NUMERIC(10,2) DEFAULT 0;
**Files:** src/app/api/quotes/send-review/route.ts, src/app/review/[token]/page.tsx

---

## FIX-003 | Jun 15 2026 | READY TO INSTALL
**Symptom:** ReviewRoundsPanel WAS column showing "†" (dash) for all items — original quantities not shown
**Root Cause:** computeDiff() in submit/route.ts compared tray_quantity for all types; per_person uses guest_count, per_piece uses piece_count. Also piece_count was not being saved to DB in quotes/route.ts
**Fix:** Added getDisplayQty() helper that reads correct field per pricing_type. Also fixed piece_count save in quotes/route.ts
**Files:** src/app/api/review/[token]/submit/route.ts, src/app/api/quotes/route.ts
**Lines changed:**
  - submit/route.ts: added getDisplayQty() function (lines ~65-77); updated computeDiff() to use it (lines ~83-85)
  - quotes/route.ts: piece_count now always saved in tray_items insert (was missing)

---

## FIX-004 | Jun 15 2026 | DEFERRED
**Symptom:** Date input on new enquiry form — real users typing date may hit "please fill in event date" validation error
**Root Cause:** HTML date input type="date" requires YYYY-MM-DD format; users typing naturally fail validation
**Fix:** Add JS date parsing workaround or switch to text input with format hint
**Files:** src/app/admin/enquiries/new/page.tsx
**Note:** Deferred — admin-only form, lower priority

---

## FIX-005 | Jun 15 2026 | READY TO INSTALL
**Symptom:** Setup fee and service fee reset to $0 when loading existing quote in Quote Builder; only delivery fee persisted
**Root Cause:** delivery_fee_cents, setup_fee_cents, service_fee_cents were not being saved to quotes table (columns didn't exist until SQL ALTER TABLE in FIX-002). The POST handler in quotes/route.ts was not including these fields in the INSERT.
**Fix:** Added delivery_fee_cents, setup_fee_cents, service_fee_cents, discount_cents to INSERT in quotes/route.ts
**Files:** src/app/api/quotes/route.ts
**SQL Required:** Same as FIX-002 (already run)
**Lines changed:** quotes/route.ts INSERT block — added 4 fee fields

---

## FIX-006 | Jun 15 2026 | READY TO INSTALL
**Symptom:** Aloo Gobi (Multiple/custom tray size) showing "Custom" instead of "Tray" on customer review page
**Root Cause:** getSizeOrType() in send-review/route.ts mapped tray_size 'custom' to label "Multiple" but review page used different mapping showing "Custom"
**Fix:** Review page tray size display: for tray_size='custom' show "Multiple ({qty}×)" not "Custom"
**Files:** src/app/review/[token]/page.tsx
**Note:** Also affects the label row in review page dish table

---

## FIX-007 | Jun 15 2026 | READY TO INSTALL
**Symptom:** Labour showing $0.00 in enquiry detail quote summary even when labour is zero (visual clutter)
**Root Cause:** Labour stat card always rendered regardless of value
**Fix:** Hide Labour stat card when labour_cents is 0 or null
**Files:** src/app/admin/enquiries/[id]/page.tsx
**Lines changed:** Quote summary grid — conditional render on Labour card

---

## FIX-008 | Jun 15 2026 | READY TO INSTALL
**Symptom:** When editing quote after customer review, admin cannot see customer comments per dish — must cross-reference ReviewRoundsPanel separately
**Root Cause:** TrayItemsSection had no mechanism to display customer feedback
**Fix:** Added customer_feedback?: string field to TrayLineItem interface. When quote builder loads after a review round, it can populate customer_feedback per item. Displayed as amber banner below each dish row.
**Files:** src/components/crm/TrayItemsSection.tsx
**Note:** Quote builder page (quote/page.tsx) needs to load customer_changes from latest review round and map comments to tray items — that file not uploaded yet, needs separate fix.

---

## FIX-009 | Jun 15 2026 | READY TO INSTALL
**Symptom:** New enquiry form had "Save + Schedule Tasting" as secondary CTA; most enquiries come with a menu list so customer wants to go straight to quote
**Root Cause:** UX decision — tasting was made primary but quote is more common next step
**Fix:** Replaced "Save + Schedule Tasting" with "Save + Quote" as secondary button. Tasting button kept as tertiary option. handleSave() now accepts 'quote' | 'tasting' | undefined.
**Files:** src/app/admin/enquiries/new/page.tsx
**Lines changed:**
  - handleSave signature: andNext?: 'quote' | 'tasting'
  - Header: "Save + Schedule Tasting" → "Save + Quote"
  - Bottom buttons: Save+Quote (primary ghost), Save+Tasting (dimmed tertiary), Save Enquiry (main CTA unchanged)

---

## KNOWN ISSUES (not yet fixed)

FIX-010 | Quote Builder: "UNDEFINED× FULL TRAY" label for Multiple tray items | Medium
  - Symptom: line description below Aloo Gobi shows "undefined× full tray × $130.00"
  - Root Cause: tray_quantity not initialized when tray_size changes to 'custom'
  - Fix needed in: src/app/admin/enquiries/[id]/quote/page.tsx — initialize tray_quantity to 1 when size=custom

FIX-011 | Quote Builder: customer_feedback not yet loaded from review rounds into TrayItemsSection
  - quote/page.tsx needs to: fetch latest review round → map customer_changes comments → pass as customer_feedback on each tray item
  - Waiting for quote/page.tsx upload

FIX-012 | Quote Builder: fees not restored when loading V1 quote (for quotes saved before FIX-005)
  - Old quotes in DB have delivery_fee_cents=0 / setup_fee_cents=0 / service_fee_cents=0
  - Only new quotes saved after FIX-005 deploy will restore fees correctly
  - No fix needed — old quotes are historical; new quotes will work correctly
