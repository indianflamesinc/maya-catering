# MAYA Indian Catering — Platform Fix Log
**Project:** maya-catering (Next.js 14 · Supabase · Vercel)
**Repo:** https://github.com/indianflamesinc/maya-catering
**Live:** https://maya-catering.vercel.app

---

## How to read this log

```
FIX-###  |  Date & Time  |  Short title
─────────────────────────────────────────────────────
SYMPTOM    What the user/admin saw going wrong
ROOT CAUSE Why it was happening (code-level)
FIX        What was changed and exactly how
SCOPE      Files: ADDED / CHANGED / NO CHANGE
INSTALL    Exact copy commands to run locally
TESTED     How it was verified
NOTES      Watch-outs, follow-ups, do-not-touch
```

---

## ══════════════════════════════════════════════
## FIX-001 · Jun 15 2026 · 12:30 AM EST
## Review page qty wrong for per_piece / per_person items
## ══════════════════════════════════════════════

**SYMPTOM**
On the customer-facing review page (`/review/[token]`), all dishes showed
qty = 1 regardless of actual ordered quantity. Examples seen in testing:
- Garlic Naan (per_piece) showed qty 1, tray size "medium", total $4.50
- Vegetable Samosa (per_piece, 50 ordered) showed qty 1, total $2.50
- Naan (per_piece, 50 ordered) showed qty 1, total $4.00
The customer email was 100% correct — only the web review page was wrong.

**ROOT CAUSE**
`src/app/review/[token]/page.tsx` — the item row rendering had two bugs:

Bug A — Wrong qty field:
```tsx
// BEFORE (wrong — always reads tray_quantity which is 1 for per_piece items)
value={item.tray_quantity}
onChange={e => updateChange(item.id, 'tray_quantity', ...)}
{fmt(item.unit_price_cents * item.tray_quantity)}
```
For `per_piece` items the actual count lives in `piece_count`.
For `per_person` items it lives in `guest_count`.
`tray_quantity` is the tray multiplier (1, 1.5, 2x) and defaults to 1.

Bug B — Raw tray_size shown:
```tsx
// BEFORE (wrong — shows raw DB value like "medium", "half", "full")
<div>{item.tray_size}</div>
```
For per_piece items this showed "medium" instead of "Per Piece".

The API route (`/api/review/[token]/route.ts`) was already returning all
correct fields (`pricing_type`, `piece_count`, `guest_count`, `tray_quantity`)
from the live DB query — the API did NOT need changes.

**FIX**
`src/app/review/[token]/page.tsx` — 4 targeted changes only:

1. Added `getDisplayQty(item)` helper (reads correct field per pricing_type):
```tsx
function getDisplayQty(item: any): number {
  if (item.pricing_type === 'per_piece') return item.piece_count ?? 1
  if (item.pricing_type === 'per_person') return item.guest_count ?? 1
  return item.tray_quantity ?? 1
}
```

2. Added `getTrayLabel(item)` helper (human-readable size/pricing label):
```tsx
function getTrayLabel(item: any): string {
  if (item.pricing_type === 'per_piece') return 'Per Piece'
  if (item.pricing_type === 'per_person') return 'Per Person'
  // ... maps half/medium/full/custom to readable strings
}
```

3. In `useEffect`, initialise `displayQty` on each change item:
```tsx
setChanges(snapshot.tray_items.map((item: any) => ({
  ...item,
  displayQty: getDisplayQty(item),  // ← NEW
})))
```

4. In the item row JSX, replaced 3 occurrences:
```tsx
// tray size label
{getTrayLabel(item)}           // was: {item.tray_size}

// qty input value + onChange
value={item.displayQty}        // was: value={item.tray_quantity}
onChange={e => updateChange(item.id, 'displayQty', ...)}

// total calculation
{fmt(item.unit_price_cents * item.displayQty)}  // was: * item.tray_quantity
```

**SCOPE**
```
CHANGED  src/app/review/[token]/page.tsx   ← ONLY THIS FILE
NO CHANGE  src/app/api/review/[token]/route.ts  (API was already correct)
NO CHANGE  src/app/api/review/[token]/submit/route.ts
NO CHANGE  src/app/api/quotes/send-review/route.ts  (email was correct - do not touch)
NO CHANGE  src/components/crm/ReviewRoundsPanel.tsx
NO CHANGE  database schema
```

**INSTALL**
```bash
cp ~/Downloads/maya-fix2/src/app/review/\[token\]/page.tsx \
  /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering/src/app/review/\[token\]/page.tsx

cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
git add src/app/review/\[token\]/page.tsx
git commit -m "FIX-001: correct qty display for per_piece/per_person items on review page"
git push
```

**TESTED**
- Verified on live Vercel: old page showed Samosa qty=1 $2.50, Naan qty=1 $4.00
- Verified GitHub: API route already returning piece_count/guest_count correctly
- Fix is surgical — only page.tsx changed, email routes untouched
- After deploy: Samosa should show qty=50 $125, Naan qty=50 $200

**NOTES**
- This fix uses `displayQty` as a local React state field separate from the
  DB field names. The submit route receives `changes[]` with `displayQty`
  and maps it back to the right DB field server-side.
- The submit route (`submit/route.ts`) currently saves to `tray_quantity`
  for all items — this needs a follow-up fix (FIX-002) to save `displayQty`
  back to the correct field (`piece_count` for per_piece etc.)
- Do NOT modify `send-review/route.ts` — email is working perfectly

---

## ══════════════════════════════════════════════
## [TEMPLATE — copy for next fix]
## ══════════════════════════════════════════════

<!--
## FIX-002 · [Date] · [Short title]
## [One-line description]
## ══════════════════════════════════════════════

**SYMPTOM**
[Exact what was seen. URLs, field names, dollar amounts.]

**ROOT CAUSE**
[File, function, variable, logic path that caused it.]

**FIX**
[Each file changed with before/after code snippets.]

**SCOPE**
\`\`\`
ADDED    path/to/new-file.ts
CHANGED  path/to/changed-file.tsx
NO CHANGE  path/to/important-file.ts  (reason)
\`\`\`

**INSTALL**
\`\`\`bash
cp ~/Downloads/fix-folder/path/to/file.tsx /Users/ashok/PROJECTS/.../same/path.tsx
git add . && git commit -m "FIX-00X: description" && git push
\`\`\`

**TESTED**
[Steps, values used, pass/fail.]

**NOTES**
[Edge cases, follow-ups, what not to touch.]
-->

---

## Known Issues Queue

| # | Found | Description | Priority |
|---|-------|-------------|----------|
| FIX-002 | Jun 15 2026 | submit/route.ts saves displayQty to wrong DB field for per_piece items (should save to piece_count not tray_quantity) | High |
| FIX-003 | Jun 15 2026 | Date input on new enquiry form requires JS workaround — real users may see validation error after typing date | Medium |
| FIX-004 | Jun 15 2026 | Add delivery/setup/service fees to review page pricing summary + submit diff email | High |
| FIX-005 | Jun 15 2026 | ReviewRoundsPanel "Was" column shows "—" (snapshot piece_count/guest_count not saved at send time) | Medium |
| FIX-006 | — | Kitchen Prep List PDF — /admin/enquiries/[id]/kitchen | 🔴 CRITICAL — Jul 15 (240 guests) Jul 18 (440 guests) |
