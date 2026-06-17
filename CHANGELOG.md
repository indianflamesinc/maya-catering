# MAYA Platform CHANGELOG

---

## FIX-089 — Build Fix: TypeScript type error on Supabase join result
**Session:** Jun 17, 2026
**ZIP:** MAYA-CONDIMENTS-Jun17-v4.zip
**Fixes build error from:** MAYA-CONDIMENTS-Jun17-v3.zip

### Error
```
Type error: Conversion of type '{ condiments: { id: any; name: any; }[]; }[]'
to type 'CondimentMap[]' may be a mistake because neither type sufficiently overlaps.
```

### Root cause
Supabase `.select('..., condiments(id, name)')` returns the joined relation as an
**array** `{ id, name }[]` — even for a many-to-one join. Our `CondimentMap`
interface declared `condiments` as a single object `{ id: string; name: string }`,
which TypeScript correctly rejected.

### RULE for all future Claude sessions
When using Supabase nested select joins, the joined field is always typed as
an array by the Supabase client, even for foreign key (many-to-one) joins:
```ts
// ❌ Wrong — TypeScript will reject this
condiments: { id: string; name: string }

// ✅ Correct — allow both shapes, normalize at point of use
condiments: { id: string; name: string } | { id: string; name: string }[]
```
And at the point of use, normalize:
```ts
const name = Array.isArray(m.condiments) ? m.condiments[0]?.name : m.condiments?.name
```
And when casting query results, always go through `unknown` first:
```ts
setMappings((data as unknown as CondimentMap[]) || [])
```

### Files changed
`src/app/admin/menu/page.tsx`:
- `CondimentMap.condiments` type widened to accept array or object
- `setMappings` cast changed to `as unknown as CondimentMap[]`
- Insert result cast changed to `as unknown as CondimentMap`
- `condiments?.name` accessor normalized via `Array.isArray()` check

---

## FIX-088 — Build Fix: Supabase import path correction
**Session:** Jun 17, 2026
**ZIP:** MAYA-CONDIMENTS-Jun17-v3.zip
**Fixes build error from:** MAYA-CONDIMENTS-Jun17-v2.zip

### Problem
Vercel build failed with:
```
Module not found: Can't resolve '@/lib/supabase/client'
```

### Root cause
Generated code used `@/lib/supabase/client` and `@/lib/supabase/server` —
standard Supabase SSR helper paths that do NOT exist in this project.

### How this project actually works
`src/lib/supabase.ts` exports TWO named instances:
- `supabase` — anon key client, use in client components ('use client')
- `supabaseAdmin` — service role client, use in API routes (server-side)

**RULE for all future Claude sessions — NEVER write:**
```ts
import { createClient } from '@/lib/supabase/client'   // ❌ does not exist
import { createClient } from '@/lib/supabase/server'   // ❌ does not exist
```

**ALWAYS write:**
```ts
// In 'use client' components:
import { supabase } from '@/lib/supabase'              // ✅

// In API routes (src/app/api/...):
import { supabaseAdmin } from '@/lib/supabase'         // ✅
```

### Files fixed
| File | Change |
|------|--------|
| `src/app/admin/menu/page.tsx` | `import { supabase } from '@/lib/supabase'` |
| `src/app/api/condiments/route.ts` | `import { supabaseAdmin as supabase } from '@/lib/supabase'` |
| `src/app/api/menu-condiment-map/route.ts` | `import { supabaseAdmin as supabase } from '@/lib/supabase'` |
| `src/lib/condiment-resolver.ts` | Removed incorrect import — supabase passed in as param |

---

## FIX-083 to FIX-087 — Condiment Architecture (Menu Master → Quote → Kitchen)
**Session:** Jun 17, 2026
**ZIP:** MAYA-CONDIMENTS-Jun17-v3.zip (previously v1, v2 — use v3 only)

### Why this was built
Previously condiment logic was hardcoded in the Kitchen Prep List page —
10 name-matching rules like "if dish contains 'samosa' → add mint chutney".
This was fragile: any new dish required a code change, spelling had to match
exactly, and the quote had zero condiment awareness.

### Architecture after this change
Condiments defined ONCE in menu master → flow through quote → read by kitchen prep.
No logic duplication anywhere downstream.

```
master_menu
  ↓ menu_condiment_map
    (which condiments, default qty, default unit, show_on_quote, is_mandatory)
quote_tray_items
  (condiment rows auto-inserted when dish added — is_condiment=true)
  ↓
kitchen_prep_items
  (reads condiment rows from quote — zero logic in prep page)
```

### FIX-083 | Supabase tables
**File:** `supabase/migrations/20260617_condiments_v2.sql`

- `condiments` table: id, name, is_active, sort_order. Simple master list.
  - 17 condiments seeded (Mint Chutney, Tamarind Chutney, Coconut Chutney,
    Sambar, Raita, Manchurian Sauce, Schezwan Sauce, Ketchup,
    Lemon & Sliced Onion, Mint Pani, Mango Pani, Potato & Channa Filling,
    Cilantro & Cut Onion, Ghee, Pickle, Salan, Mirchi Ka Salan)
- `menu_condiment_map` table: links dishes to condiments with:
  - `default_qty NUMERIC` — suggested quantity (admin overrides per event)
  - `default_unit TEXT` — free text: "32 Oz", "Half Tray", "1 Gallon" etc.
  - `show_on_quote BOOLEAN` — Option C: TRUE=customer sees it, FALSE=kitchen only
  - `is_mandatory BOOLEAN` — Must/Optional badge
  - `sort_order INTEGER` — display order under dish
  - UNIQUE(menu_item_id, condiment_id) — no duplicate condiments per dish
- `quote_tray_items` new columns (IF NOT EXISTS — safe to re-run):
  - `is_condiment BOOLEAN` — marks row as condiment child
  - `parent_item_id UUID` — soft ref to parent dish row
  - `condiment_map_id UUID` — traceability back to menu_condiment_map
  - `show_on_quote BOOLEAN` — copied from map, overridable per quote
  - `condiment_qty TEXT` — actual qty (may differ from default)
  - `condiment_unit TEXT` — actual unit (may differ from default)
- RLS disabled on both new tables (consistent with all MAYA Platform tables)

### FIX-084 | Condiments CRUD API
**File:** `src/app/api/condiments/route.ts`
- GET — list all active condiments
- POST — add new condiment
- PATCH — rename/update
- DELETE — soft delete (is_active=false), preserves existing links

### FIX-085 | Menu Condiment Map API
**File:** `src/app/api/menu-condiment-map/route.ts`
- GET ?menu_item_id=xxx — all condiments for a dish (with name joined)
- POST — link condiment to dish with default qty/unit/settings
- PATCH — update any field on a link row
- DELETE ?id=xxx — unlink condiment from dish

### FIX-086 | Menu Admin page — condiment panel
**File:** `src/app/admin/menu/page.tsx`
- Each dish row has ▸ expand toggle → opens condiment panel inline
- Condiment panel table: Name | Default Qty | Unit | Show on Quote | Required | Remove
- Unit field: standard dropdown (Oz / Gallon / Tray / Piece) + "Custom…"
  reveals free-text input for any value (32 Oz, 2 Gallon, Half Tray, etc.)
- Show on Quote: green toggle = customer sees it / grey = kitchen-only
- Required badge: Must (red) = cannot remove from quote / Opt (grey) = optional
- All saves instant on field change — no separate Save button
- "🥣 Manage Condiments List" opens master modal — add/remove from global pool

### FIX-087 | Condiment resolver utility
**File:** `src/lib/condiment-resolver.ts`
- Reads default_qty + default_unit directly from menu_condiment_map
- No calculation logic — values come straight from DB as set in menu master
- Used by quote builder when a dish is added to pre-fill condiment rows
- Accepts supabase client as parameter (works client-side and server-side)

---

## Previous: FIX-077 to FIX-082 — Kitchen Prep List initial build (Jun 17 2026)
## Previous: FIX-069 to FIX-076 — WhatsApp, TrayQtyInput, badge fixes (Jun 17 2026)
