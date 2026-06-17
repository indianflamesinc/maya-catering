# MAYA Platform CHANGELOG

## FIX-083 to FIX-087 — Condiment Architecture v2 (Revised)
**Session:** Jun 17, 2026
**ZIP:** MAYA-CONDIMENTS-Jun17-v2.zip
**Supersedes:** MAYA-CONDIMENTS-Jun17-v1.zip (use this one instead)

---

## Key design decisions in v2

### Unit field — dropdown + free text
Standard options: Oz / Gallon / Tray / Piece
Select "Custom…" to type anything: "32 Oz", "2 Gallon", "Half Tray", "3/4 Tray", "16 Oz", etc.
Stored as a single TEXT column — no validation constraint.

### Qty — default suggestion, always overridable
- `default_qty` in `menu_condiment_map` is a starting suggestion set by admin in menu master
- No auto-calculation from guest count (removed — too rigid)
- Chef/admin adjusts qty per quote or event when building the quote
- Kitchen prep list shows exactly what was entered on the quote — no re-derivation

### Condiments master list
- Simple table: just `name` + `sort_order`
- 17 condiments seeded including Salan and Mirchi Ka Salan
- "Remove" soft-deletes (is_active=false) — preserves existing links
- New condiments added here appear in every dish's dropdown instantly

---

## FIX-083 | Supabase migration (v2)
**File:** `supabase/migrations/20260617_condiments_v2.sql`

- Drops and recreates `condiments` + `menu_condiment_map` (clean v2 schema)
- `condiments`: id, name, is_active, sort_order — no default_unit (unit lives on the map)
- `menu_condiment_map`: menu_item_id, condiment_id, default_qty, default_unit (TEXT, free),
  show_on_quote, is_mandatory, sort_order
- `quote_tray_items` new columns (safe IF NOT EXISTS):
  - `is_condiment BOOLEAN` — marks row as condiment child
  - `parent_item_id UUID` — soft ref to parent dish row
  - `condiment_map_id UUID` — traceability back to menu_condiment_map
  - `show_on_quote BOOLEAN` — copied from map, overridable per quote
  - `condiment_qty TEXT` — actual qty used (admin may differ from default)
  - `condiment_unit TEXT` — actual unit used (admin may differ from default)
- 17 condiments seeded

## FIX-084 | Condiments API
**File:** `src/app/api/condiments/route.ts`
- GET / POST / PATCH / DELETE — standard CRUD

## FIX-085 | Menu Condiment Map API
**File:** `src/app/api/menu-condiment-map/route.ts`
- GET ?menu_item_id=xxx — fetch all condiments for a dish
- POST / PATCH / DELETE — manage links

## FIX-086 | Menu Admin page (updated)
**File:** `src/app/admin/menu/page.tsx`
- Each dish row has ▸ expand button — opens Condiments panel inline
- Condiment panel columns: Condiment name | Default Qty | Unit | Show on Quote | Required | Remove
- Unit field: standard dropdown (Oz / Gallon / Tray / Piece) + "Custom…" reveals free-text input
- Show on Quote: green toggle = customer sees it / grey = kitchen-only
- Required badge: "Must" (red) = cannot remove from quote / "Opt" (grey) = optional
- All saves are instant on change — no separate Save button
- "🥣 Manage Condiments List" button — add/remove from master list

## FIX-087 | Condiment resolver (v2)
**File:** `src/lib/condiment-resolver.ts`
- Reads default_qty + default_unit from menu_condiment_map
- No calculation logic — values come straight from the DB
- Used by quote builder when a dish is added to pre-fill condiment rows
- Admin edits qty/unit on the quote itself

---

## INSTALL

### Step 1 — Run migration
Paste `supabase/migrations/20260617_condiments_v2.sql` in Supabase SQL editor and run.

### Step 2 — Copy files
```
src/app/api/condiments/route.ts
src/app/api/menu-condiment-map/route.ts
src/app/admin/menu/page.tsx
src/lib/condiment-resolver.ts
```

### Step 3 — Set up condiments in /admin/menu
1. Go to /admin/menu → click "🥣 Manage Condiments List" — verify 17 condiments seeded
2. Expand any dish (click ▸) → add its condiments:
   - Samosa: Mint Chutney (2, 32 Oz, Kitchen-only), Tamarind Chutney (2, 32 Oz, Kitchen-only)
   - Biryani: Raita (1, Half Tray, Show on Quote)
   - Idly: Coconut Chutney (1, 32 Oz, Kitchen-only), Sambar (1, Half Tray, Kitchen-only)
   - Pani Puri: Mint Pani (1, 1 Gallon, Kitchen-only), Mango Pani (1, 1 Gallon, Kitchen-only)

### Step 4 — Test in quote builder
Add Samosa to a quote → Mint Chutney + Tamarind Chutney appear as child rows
Toggle Show on Quote on one → verify customer copy shows/hides it

---

## Previous: FIX-077 to FIX-082 (Kitchen Prep List initial build)
