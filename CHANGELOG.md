# MAYA Platform CHANGELOG

---

## FIX-093 — Condiments wired end-to-end through Quote Builder, Reply Builder, and customer Review pages
**Session:** Jun 18, 2026
**ZIP:** MAYA-FIX-093-Jun18-v1.zip

### What this completes
Condiments (FIX-083 to FIX-092) were fully built and working in `/admin/menu` —
admins could link condiments to dishes with default qty/unit and a Show on Quote
toggle. But nothing downstream actually USED that data. Picking a dish in the
Quote Builder never inserted its condiments. This FIX closes that gap across
the entire customer-facing journey: Quote Builder → DB save → Round 1 email →
customer review page → Reply Builder (Round 2+) → Round 2+ email → review page
→ permanent order confirmation page.

### Root architecture decision
Condiment rows are stored as regular `quote_tray_items` rows with `is_condiment
= true` and `parent_item_id` pointing at their parent dish's row id. This means
every place in the codebase that already reads `quote_tray_items` automatically
sees condiment rows — they just need to know to render/price them differently.
No new tables, no new API shapes beyond what FIX-083–092 already built.

---

### File 1 — `src/components/crm/TrayItemsSection.tsx`
**Used by:** Quote Builder (`/admin/enquiries/[id]/quote`)

- `TrayLineItem` interface: added `is_condiment`, `parent_item_id`,
  `condiment_map_id`, `condiment_qty`, `condiment_unit`, `show_on_quote`
- `calcLineTotal()`: returns 0 for condiment rows (always included in parent
  dish price, never charged separately)
- `addFromMaster()` is now **async**. After inserting the dish row, it calls
  `GET /api/menu-condiment-map?menu_item_id={id}` and inserts one child row
  per linked condiment, directly below the dish, with `default_qty`/
  `default_unit`/`show_on_quote` copied from the menu master setting
- New `removeItemAndChildren()` — deleting a dish also deletes its condiments
- New `toggleCondimentVisibility()` — per-row Show on Quote / Kitchen Only toggle
- Condiment rows render as a compact indented strip (↳ prefix, amber tint,
  qty/unit text inputs, visibility toggle, "Included" label, delete button)
  instead of going through the full dish grid (tray size / pricing type
  controls don't apply to a condiment)

### File 2 — `src/app/api/quotes/route.ts`
**The quote save endpoint — Round 1 quote creation**

- **Two-pass insert** replaces the old single bulk insert:
  - Pass 1 inserts all non-condiment (parent) rows, capturing their real new
    DB-generated ids
  - Pass 2 inserts condiment rows with `parent_item_id` rewritten to point at
    the actual new parent id (matched by array position, since client-side
    ids are never the same as DB ids)
  - **Why this was necessary:** a single bulk insert with `parent_item_id:
    item.parent_item_id` would have saved client-side uid()s or stale ids
    from a previous save — meaningless foreign keys that don't correspond to
    any real row in the same insert batch
- All 6 condiment columns now written: `is_condiment`, `parent_item_id`,
  `condiment_map_id`, `show_on_quote`, `condiment_qty`, `condiment_unit`
- `total_price_cents` forced to 0 for condiment rows regardless of pricing_type

### File 3 — `src/app/admin/enquiries/[id]/quote/page.tsx`
**Quote Builder page — loading an existing quote back into the editor**

- **Critical fix:** `id: item.id` instead of `id: uid()` when loading
  `quote_tray_items` back into `TrayLineItem[]`. Previously every reload
  generated a fresh random id, which would have broken `parent_item_id`
  matching for any condiment rows the moment the page was reloaded
- Condiment fields (`is_condiment`, `parent_item_id`, `condiment_map_id`,
  `condiment_qty`, `condiment_unit`, `show_on_quote`) now read back from DB

### File 4 — `src/app/api/quotes/send-review/route.ts`
**Builds the Round 1 snapshot + customer email**

- Snapshot's `tray_items` mapping now carries all condiment fields through
- Email dish-table builder: condiment rows render as an indented italic line
  with qty/unit and "Included" instead of a price — but **only if
  `show_on_quote` is true**. Kitchen-only condiments (the common case —
  chutneys, sambar, etc.) never appear in the customer email at all

### File 5 — `src/app/review/[token]/page.tsx`
**Customer-facing review page — TWO separate dish-rendering blocks updated**

- Main review form's dish list: condiment rows render as a compact, indented,
  read-only line (no comment box — there's nothing to comment on for a
  garnish). Filtered out entirely if `show_on_quote` is false
- "Accepted / permanent order confirmation" page state: same filtering and
  compact rendering applied to its separate dish table
- `handleSubmit()` needed no change — condiment rows never get a `comments[id]`
  entry (no input renders for them), so they're naturally excluded from the
  customer-comments payload sent to `/api/review/[token]/submit`

### File 6 — `src/app/admin/enquiries/[id]/reply/page.tsx`
**Reply Builder — admin editing Round 2+ before sending back to customer**

- `DishItem` interface: same 6 condiment fields added as `TrayLineItem`
- Items-loading map (`setItems(trayItems.map(...))`) now preserves condiment
  fields from the snapshot instead of dropping them
- `addFromMaster()` is now async with the same condiment-fetch-and-insert
  pattern as `TrayItemsSection.tsx` — picking a dish in Round 2+ editing also
  auto-adds its condiments
- `removeItem()` now cascades to remove condiment children
- `calcTotal()` returns 0 for condiment rows
- Rendering: condiment rows get the same compact indented strip treatment as
  in `TrayItemsSection.tsx` (qty/unit inputs, visibility toggle, no
  thread/reply box — condiments don't need a customer-comment conversation)
- `handleSend()` payload now includes all condiment fields when posting to
  `send-reply`

### File 7 — `src/app/api/quotes/send-reply/route.ts`
**Saves the Round 2+ quote version + builds the next snapshot/email**

- Step 7 (tray_items save): same two-pass parent/condiment insert pattern as
  File 2 — this endpoint creates an entirely new `quotes` row + new
  `quote_tray_items` rows for every round, so the parent-id-resolution
  problem exists here independently and needed its own fix
- Step 9 (snapshot building): condiment fields carried through
- `sendReplyEmail()`'s dish-row loop: condiment rows skipped entirely if
  `show_on_quote` is false; otherwise rendered as an indented "Included" line,
  matching `send-review/route.ts`'s Round 1 email styling

---

### What was NOT changed (intentionally out of scope)
- `src/app/api/quotes/review-rounds/route.ts` and `ReviewRoundsPanel.tsx` —
  these read `customer_changes`/`admin_replies` keyed by `dish_name`, which
  condiments never populate (no comment box). No condiment-specific change
  needed; verified by inspection that nothing there assumes a 1:1 row count
  with `quote_tray_items`.
- `src/app/api/quotes/accept-review/route.ts`, `confirm-happy/route.ts`,
  `deposit-intent/route.ts` — these don't touch individual dish rows, only
  aggregate totals (`subtotal_cents`, `total_cents` etc.), which already
  exclude condiment contributions since condiments are always priced at $0.

### RULE for all future Claude sessions on this project
**Whenever a feature touches `quote_tray_items`, check ALL SIX places dish
rows flow through, not just the obvious one:**
1. `TrayItemsSection.tsx` (Round 1 dish picker)
2. `/api/quotes/route.ts` (Round 1 save)
3. `/api/quotes/send-review/route.ts` (Round 1 snapshot + email)
4. `/review/[token]/page.tsx` (customer-facing — has TWO separate dish blocks:
   main review form AND the "accepted" confirmation page)
5. `reply/page.tsx` (Round 2+ admin editor)
6. `/api/quotes/send-reply/route.ts` (Round 2+ save + snapshot + email)

A field added to the data model in only 1-2 of these will silently vanish at
whichever step was skipped — exactly what happened here: condiments existed
in the DB schema and the menu admin UI for two full sessions before any of
the above six files were touched.

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-093-Jun18-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-093-Jun18-v1/TrayItemsSection.tsx       src/components/crm/TrayItemsSection.tsx
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/quotes-route.ts            src/app/api/quotes/route.ts
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/quote-page.tsx             "src/app/admin/enquiries/[id]/quote/page.tsx"
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/send-review-route.ts       src/app/api/quotes/send-review/route.ts
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/review-token-page.tsx      "src/app/review/[token]/page.tsx"
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/reply-page.tsx             "src/app/admin/enquiries/[id]/reply/page.tsx"
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/send-reply-route.ts        src/app/api/quotes/send-reply/route.ts
cp ~/Downloads/MAYA-FIX-093-Jun18-v1/CHANGELOG.md               CHANGELOG.md

git add .
git commit -m "FIX-093: wire condiments end-to-end through Quote Builder, Reply Builder, and customer Review flow"
git push
```

### Test plan after deploy
1. **Round 1 — Quote Builder:** Create/open an enquiry → Quote Builder →
   "Pick from Menu" → choose a dish with condiments linked (e.g. Idly).
   Confirm Coconut Chutney + Sambar appear as indented amber rows below it.
2. Toggle "On Quote"/"Kitchen Only" on one condiment row, edit its qty/unit,
   then Save Draft. Reload the page — confirm the condiment row, its qty/unit,
   and its visibility setting all persisted correctly (this tests the
   two-pass parent-id resolution).
3. Click "Send to Customer" → check the Round 1 email: condiments with
   "Kitchen Only" should NOT appear; condiments with "On Quote" should appear
   as an indented "Included" line.
4. Open the customer review link → confirm same visibility rule on the
   review page, and that there's no comment box under condiment rows.
5. Have the (test) customer submit feedback → open Reply Builder → confirm
   the condiment rows are still there with correct qty/unit/visibility.
6. Add another dish with condiments via "Pick from Menu" inside Reply Builder
   → Send Round 2 → repeat the email/review checks for Round 2.

---

## Previous: FIX-092 — Surface API errors on Add Condiment (Jun 18 2026)
## Previous: FIX-091 — Restore original Menu Master + merge condiments (Jun 18 2026)
## Previous: FIX-090 — Lazy Supabase client init (Jun 18 2026)
## Previous: FIX-089 — TypeScript fix, Supabase join returns array (Jun 17 2026)
## Previous: FIX-083 to FIX-088 — Condiment architecture (Jun 17 2026)

---

## FIX-094 — Build fix: function declarations inside if-blocks (strict mode violation)
**Session:** Jun 18, 2026
**ZIP:** MAYA-FIX-094-Jun18-v1.zip
**Fixes build error from:** MAYA-FIX-093-Jun18-v1.zip

### Error
```
Type error: Function declarations are not allowed inside blocks in strict mode
when targeting 'ES5'. Modules are automatically in strict mode.
  127 |       function buildRow(item: any, sortOrder: number): any {
```

### Root cause
FIX-093 introduced a helper function (`buildRow` in `quotes-route.ts`,
`buildItemRow` in `send-reply-route.ts`) declared with the `function` keyword
**directly inside an `if (tray_items?.length > 0) { ... }` block**. ES modules
run in strict mode automatically, and strict mode forbids function
declarations nested inside a block (if/for/while) — only function
*expressions* (assigned to a `const`/`let`) are allowed there.

### Fix
Both functions converted from declarations to arrow function expressions:
```ts
// ❌ Before — illegal inside a block in strict mode
function buildRow(item: any, sortOrder: number): any { ... }

// ✅ After — legal anywhere, including inside blocks
const buildRow = (item: any, sortOrder: number): any => { ... }
```

### RULE for all future Claude sessions
**Never use the `function` keyword to declare a helper function inside an
`if`/`for`/`while`/`try` block.** Always use `const name = (...) => { ... }`
arrow function expressions for any function defined inside a block scope.
Function declarations are only safe at the top level of a module or
directly inside another function's body (not nested inside a conditional).

### Files changed
| File | Change |
|------|--------|
| `src/app/api/quotes/route.ts` | `buildRow` converted to const arrow function |
| `src/app/api/quotes/send-reply/route.ts` | `buildItemRow` converted to const arrow function |

---

## INSTALL (FIX-094 only — re-copy these 2 files over FIX-093's versions)

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-094-Jun18-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-094-Jun18-v1/quotes-route.ts      src/app/api/quotes/route.ts
cp ~/Downloads/MAYA-FIX-094-Jun18-v1/send-reply-route.ts  src/app/api/quotes/send-reply/route.ts
cp ~/Downloads/MAYA-FIX-094-Jun18-v1/CHANGELOG.md         CHANGELOG.md

git add .
git commit -m "FIX-094: function-in-block strict mode build error - convert to arrow functions"
git push
```

This only replaces 2 of the 7 files from FIX-093 — the other 5
(`TrayItemsSection.tsx`, `quote-page.tsx`, `send-review-route.ts`,
`review-token-page.tsx`, `reply-page.tsx`) are unaffected and don't need
to be re-copied if FIX-093 was already partially applied.

---

## FIX-095 — Condiments attaching to wrong dish (unreliable insert-order assumption)
**Session:** Jun 19, 2026
**ZIP:** MAYA-FIX-095-Jun19-v1.zip
**Fixes:** Condiments appearing under the wrong dish in email/review; condiment
rows showing as full-price dish rows with comment boxes on the customer review
page instead of the compact "Included" treatment.

### Symptom (reported with screenshots)
- Round 1 email showed Mint Pani + Pani Poori 2 Oz Cups nested under **Chicken
  Biryani** — but those are Pani Puri's condiments. Raita (Biryani's actual
  condiment) was missing entirely.
- The customer review page rendered EVERY condiment (Tamarind Chutney, Mint
  Chutney, Channa and Boiled Potatoes, Mint Pani, Mango Pani, Chopped Onion,
  Pani Poori, Chopped Tomato) as a full dish row with its own comment box —
  none of the indented/kitchen-only/"Included" treatment from FIX-093 appeared
  at all, even though the build had deployed successfully.

### Root cause
FIX-093's two-pass insert (`quotes-route.ts` and `send-reply-route.ts`) matched
newly-inserted parent dish rows to their original client-side data using
**array index position**:
```ts
const { data: insertedParents } = await supabaseAdmin
  .from('quote_tray_items').insert(parentItems.map(...)).select('id, dish_name')

parentItems.forEach((item, i) => {
  oldIdToNewId[item.id] = insertedParents[i].id   // ❌ assumes order is preserved
})
```
This comment ("insertedParents comes back in the same order as parentItems was
sent") was an **unverified assumption**, not a documented PostgREST/Supabase
guarantee. In production, the bulk insert returned rows in a different order
than they were sent, so `insertedParents[i]` did not correspond to
`parentItems[i]`. Every condiment's `parent_item_id` got rewritten to point at
the wrong dish — explaining exactly what was observed: Pani Puri's condiments
attached to Biryani's row, Biryani's own condiment (Raita) vanished because its
rewritten parent_item_id pointed at some other dish entirely, and depending on
exact misalignment, some condiment rows may have ended up with `is_condiment`
state effectively decoupled from what the review page expected.

### Fix
Match by `sort_order` instead of array position. `sort_order` is a value WE
assign deterministically (`sort_order: i` for each parent item, in the exact
order we're inserting them) and Postgres returns it as real column data on
each row — so looking up `row.sort_order` is reliable regardless of what order
the database hands rows back in:
```ts
const { data: insertedParents } = await supabaseAdmin
  .from('quote_tray_items').insert(...).select('id, dish_name, sort_order')

const sortOrderToNewId: Record<number, string> = {}
for (const row of insertedParents || []) {
  sortOrderToNewId[row.sort_order] = row.id
}
parentItems.forEach((item, i) => {
  if (item.id && sortOrderToNewId[i] !== undefined) {
    oldIdToNewId[item.id] = sortOrderToNewId[i]
  }
})
```

### RULE for all future Claude sessions
**Never assume a Supabase/PostgREST bulk `.insert().select()` returns rows in
the same order they were sent**, even though it often appears to in casual
testing. Always match returned rows back to their source data using an actual
column value you control (like `sort_order`, a unique slug, or similar) —
never by array index/position. This applies to ANY bulk insert where you need
to resolve relationships between rows in the same batch (e.g. parent-child
foreign keys assigned post-insert).

### Files changed
| File | Change |
|------|--------|
| `src/app/api/quotes/route.ts` | Pass 1 insert now selects `sort_order` back; id-map built via `sort_order` lookup, not array index |
| `src/app/api/quotes/send-reply/route.ts` | Same fix applied — identical bug pattern existed here independently |

---

## INSTALL (FIX-095 — replaces 2 files from FIX-093/094)

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-095-Jun19-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-095-Jun19-v1/quotes-route.ts      src/app/api/quotes/route.ts
cp ~/Downloads/MAYA-FIX-095-Jun19-v1/send-reply-route.ts  src/app/api/quotes/send-reply/route.ts
cp ~/Downloads/MAYA-FIX-095-Jun19-v1/CHANGELOG.md         CHANGELOG.md

git add .
git commit -m "FIX-095: fix condiment parent-id matching - was using unreliable insert-order assumption"
git push
```

### Test after deploy — IMPORTANT: existing quotes need re-saving
Any quote saved BEFORE this fix may have condiment rows with wrong
`parent_item_id` values already written to the DB. To get a clean test:
1. Open the affected enquiry's Quote Builder
2. Remove the dishes with condiments and re-add them via "Pick from Menu"
   (this re-triggers the condiment fetch with correct linkage)
3. Save Draft, then re-check: Chicken Biryani should show ↳ Raita; Pani Puri
   should show ↳ Mint Pani + ↳ Pani Poori 2 Oz Cups — each under the CORRECT
   parent dish this time
4. Re-send to customer and verify the email + review page both show correct
   pairing and correct kitchen-only/on-quote filtering
