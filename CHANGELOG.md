# MAYA Indian Catering — Platform Fix Log
**Repo:** https://github.com/indianflamesinc/maya-catering
**Live:** https://maya-catering.vercel.app

---

## FIX-002 · Jun 15 2026 · 1:00 AM EST
## Delivery / setup / service fees missing from email and review page
## ══════════════════════════════════════════════════════════════

**SYMPTOM**
When delivery fee, setup fee, or service fee were added in the quote builder,
they were NOT showing in:
- The customer email (pricing table jumped from Subtotal to Tax)
- The customer review page (same — Subtotal → Tax, fees invisible)
Grand Total was still correct (fees included in total_cents) but the line
items were missing so customers couldn't see the breakdown.

**ROOT CAUSE**
`send-review/route.ts` snapshot object saved subtotal/discount/tax/total
but did NOT save delivery_fee_cents, setup_fee_cents, service_fee_cents
from the quotes table. Without these fields in the snapshot:
- Email HTML had no fee rows to render
- Review page (which reads snapshot for pricing) had no fee data to display

**FIX**
1. `src/app/api/quotes/send-review/route.ts`
   - Added 3 fields to snapshot object:
       delivery_fee_cents: quote.delivery_fee_cents || 0
       setup_fee_cents:    quote.setup_fee_cents    || 0
       service_fee_cents:  quote.service_fee_cents  || 0
   - Added feeRowsHtml variable with 3 conditional <tr> rows
   - Inserted feeRowsHtml into email pricing table between Subtotal and Discount

2. `src/app/review/[token]/page.tsx`
   - Added 3 conditional entries to the pricing summary array:
       snapshot?.delivery_fee_cents > 0 ? { label: 'Delivery Fee', ... } : null
       snapshot?.setup_fee_cents > 0    ? { label: 'Setup Fee', ... }    : null
       snapshot?.service_fee_cents > 0  ? { label: 'Service Fee', ... }  : null

**SCOPE**
```
CHANGED  src/app/api/quotes/send-review/route.ts  (snapshot + email HTML)
CHANGED  src/app/review/[token]/page.tsx           (pricing summary rows)
NO CHANGE  src/app/api/review/[token]/route.ts
NO CHANGE  src/app/api/review/[token]/submit/route.ts
NO CHANGE  src/components/crm/  (any file)
NO CHANGE  database schema
```

**INSTALL**
```bash
unzip ~/Downloads/MAYA-FIX-002.zip -d ~/Downloads/
cp ~/Downloads/FIX-002/src/app/api/quotes/send-review/route.ts \
   /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering/src/app/api/quotes/send-review/route.ts
cp ~/Downloads/FIX-002/src/app/review/\[token\]/page.tsx \
   /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering/src/app/review/\[token\]/page.tsx
cp ~/Downloads/FIX-002/CHANGELOG.md \
   /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering/CHANGELOG.md
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
git add src/app/api/quotes/send-review/route.ts src/app/review/\[token\]/page.tsx CHANGELOG.md
git commit -m "FIX-002: add delivery/setup/service fees to email and review page pricing summary"
git push
```

**TESTED**
- Pending test after deploy — create a quote with delivery/setup/service fees,
  send for review, verify all 3 fee lines appear in email and review page

**NOTES**
- Fees only show if > 0 (conditional) — no empty rows for unused fees
- Grand Total unchanged — fees were always included in total_cents,
  only the line item display was missing
- This fix only affects NEW quotes sent after deploy.
  Old review links already sent will NOT show fees (snapshot already saved without them)

---

## FIX-001 · Jun 15 2026 · 12:30 AM EST
## Review page qty wrong for per_piece / per_person items
## ══════════════════════════════════════════════════════════════

**SYMPTOM**
Customer review page showed qty=1 for all per_piece and per_person items.
Email was correct. Only the web review page was wrong.
Example: Vegetable Samosa (50 pcs) showed qty=1 $2.50 instead of 50 $125.

**ROOT CAUSE**
`page.tsx` always read `tray_quantity` for qty input regardless of pricing_type.
For per_piece items the count is in `piece_count`. For per_person it's in `guest_count`.
`tray_quantity` defaults to 1 (tray multiplier), not piece count.

**FIX**
`src/app/review/[token]/page.tsx` only:
- Added getDisplayQty() helper — reads correct field per pricing_type
- Added getTrayLabel() helper — shows "Per Piece" not raw "medium"
- displayQty field initialised from getDisplayQty() in useEffect
- qty input bound to displayQty, total calc uses displayQty

**SCOPE**
```
CHANGED  src/app/review/[token]/page.tsx
NO CHANGE  src/app/api/review/[token]/route.ts  (was already correct)
NO CHANGE  send-review or any other file
```

---

## Known Issues Queue

| # | Found | Description | Priority |
|---|-------|-------------|----------|
| FIX-003 | Jun 15 2026 | submit/route.ts saves displayQty to wrong DB field for per_piece (should save to piece_count) | High |
| FIX-004 | Jun 15 2026 | Date input on new enquiry form requires workaround — real users may see validation error | Medium |
| FIX-005 | Jun 15 2026 | ReviewRoundsPanel "Was" column shows "—" (snapshot piece_count not saved at send time) | Medium |
| FIX-006 | — | Kitchen Prep List PDF — /admin/enquiries/[id]/kitchen | 🔴 CRITICAL Jul 15 + Jul 18 |
