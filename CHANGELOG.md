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
