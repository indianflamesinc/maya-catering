# MAYA Platform — CHANGELOG

Format: FIX-### | Date | Symptom | Root Cause | Files Changed | Lines Changed

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

## FIX-003 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** ReviewRoundsPanel WAS column showing "†" — original qty blank for all items
**Root Cause:** quotes/route.ts was not saving piece_count to DB. computeDiff() used tray_quantity for all types.
**Files:** src/app/api/quotes/route.ts, src/app/api/review/[token]/submit/route.ts
**Lines changed:**
  - quotes/route.ts: added piece_count to tray_items INSERT
  - submit/route.ts: added getDisplayQty() helper; updated computeDiff() to use it

---

## FIX-004 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Date input JS workaround on new enquiry form
**Root Cause:** Deferred — admin-only, low priority
**Status:** Deferred

---

## FIX-005 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Setup and service fees reset to $0 when reloading quote in Quote Builder
**Root Cause:** quotes/route.ts INSERT did not include delivery_fee_cents / setup_fee_cents / service_fee_cents. Quote builder load did not read them back.
**Files:** src/app/api/quotes/route.ts, src/app/admin/enquiries/[id]/quote/page.tsx
**Lines changed:**
  - quotes/route.ts: added 4 fee fields to INSERT
  - quote/page.tsx: loadAll() now reads delivery_fee_cents / setup_fee_cents / service_fee_cents with fallback to old field names

---

## FIX-006 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Aloo Gobi (Multiple tray) showed "Custom" on customer review page
**Root Cause:** getTrayLabel() mapped tray_size='custom' to "Custom"
**Files:** src/app/review/[token]/page.tsx
**Lines changed:** getTrayLabel(): custom → `${tray_quantity}× Tray`

---

## FIX-007 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Labour $0.00 always shown in enquiry detail quote summary card
**Root Cause:** Labour stat card rendered unconditionally
**Files:** src/app/admin/enquiries/[id]/page.tsx
**Lines changed:** Quote summary grid — added conditional: only render Labour when labour_cents > 0

---

## FIX-008 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Admin cannot see customer comments per dish when editing quote after review
**Root Cause:** TrayItemsSection had no customer_feedback display
**Files:** src/components/crm/TrayItemsSection.tsx
**Lines changed:** Added customer_feedback?: string to TrayLineItem interface; added amber banner below each dish row

---

## FIX-009 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** New enquiry form had "Save + Schedule Tasting" — most enquiries should go straight to quote
**Root Cause:** UX — tasting was default secondary CTA
**Files:** src/app/admin/enquiries/new/page.tsx
**Lines changed:** handleSave() accepts 'quote'|'tasting'; "Save + Quote" is now secondary CTA; Tasting kept as tertiary

---

## FIX-010 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Aloo Gobi shows "UNDEFINED× FULL TRAY" label in Quote Builder
**Root Cause:** tray_quantity not read from DB when loading quote; undefined on custom items
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx
**Lines changed:** loadAll(): tray_quantity now explicitly read as `item.tray_quantity || 1`

---

## FIX-011 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** When editing quote after customer review, admin cannot see customer comments per dish
**Root Cause:** Quote builder did not load customer_changes from review rounds
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx
**Lines changed:** loadAll(): fetches /api/quotes/review-rounds, builds customerFeedbackMap, maps to customer_feedback on each tray item

---

## FIX-012 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** Naan qty=1, Masala Tea qty=1, Paav Bhaji qty=1 on customer review page
**Root Cause:** Review GET route (/api/review/[token]/route.ts) always used tray_quantity for qty. per_gallon and per_portion not handled — fell through to tray_quantity=1. piece_count null from DB for old quotes.
**Files:** src/app/api/review/[token]/route.ts
**Lines changed:** Added getCorrectQty() function — reads guest_count for per_person, piece_count (with tray_quantity fallback) for per_piece/per_gallon/per_portion, tray_quantity for tray custom. tray_quantity in snapshot now always holds correct display qty.

---

## FIX-013 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** No way for customer to confirm quote without changes
**Root Cause:** Only "Submit My Review" button existed
**Files:** src/app/review/[token]/page.tsx
**Lines changed:** Added "Confirm & Arrange Deposit" primary button; calls /api/quotes/confirm-happy; redirects to /review/[token]/deposit

---

## FIX-014 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅ (NEW FILE)
**Symptom:** No deposit page
**Root Cause:** Did not exist
**Files:** src/app/review/[token]/deposit/page.tsx (NEW)
**Notes:** Shows Stripe / Zelle / Check options. Zelle: indianflamesinc@gmail.com. Check: Indian Flames Inc, 33 Tuttle St, Wakefield MA.

---

## FIX-015 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅ (NEW FILE)
**Symptom:** No admin notification when customer confirms happy
**Root Cause:** Did not exist
**Files:** src/app/api/quotes/confirm-happy/route.ts (NEW)
**Notes:** Marks token as accepted, sets enquiry status=approved, sends admin email.

---

## FIX-016 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** No "Mark Deposit Received" button in admin when awaiting Zelle/Check
**Root Cause:** Button not present in enquiry detail action bar
**Files:** src/app/admin/enquiries/[id]/page.tsx
**Lines changed:** Added "Mark Deposit Received" button in quick action bar when status=approved

---

## FIX-017 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅ (NEW FILE)
**Symptom:** No deposit method handling (Stripe/Zelle/Check)
**Root Cause:** Did not exist
**Files:** src/app/api/quotes/deposit-intent/route.ts (NEW)
**Notes:** Stripe → creates checkout session. Zelle/Check → admin email with payment instructions + reference code.

---

## FIX-018 | Jun 15 2026 | INCLUDED IN THIS ZIP ✅
**Symptom:** ReviewRoundsPanel WAS column wrong for per_person/per_piece/per_gallon items
**Root Cause:** computeDiff() used orig.tray_quantity for ALL types
**Files:** src/components/crm/ReviewRoundsPanel.tsx
**Lines changed:** Added getDisplayQty() function; computeDiff() now uses it for WAS column

---

## SQL REQUIRED (run once in Supabase SQL Editor)
Already run for FIX-002:
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER DEFAULT 0;
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS setup_fee_cents INTEGER DEFAULT 0;
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS service_fee_cents INTEGER DEFAULT 0;
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_cents INTEGER DEFAULT 0;
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none';
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;
