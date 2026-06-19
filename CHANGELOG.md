# MAYA Platform CHANGELOG

---

## FIX-091 — Restore original Menu Master page + merge condiments in (not replace)
**Session:** Jun 18, 2026
**ZIP:** MAYA-FIX-091-Jun18-v1.zip
**Fixes:** Add Item / Edit / Categories / Bulk Edit features that were lost
when the condiment feature (FIX-083) overwrote this file instead of
extending it.

### What went wrong (FIX-083, two sessions ago)
When building the condiment feature, Claude wrote a brand-new
`/admin/menu/page.tsx` from assumptions about what the page should look
like, instead of reading the existing file first. This **completely
replaced** a fully-built page that already had:
- Add New Item form (name, category, cuisine, pricing types, prices)
- Inline Edit / Save / Cancel per dish row
- Category Manager (add/remove categories)
- Bulk Edit Prices (update one price field across an entire category)
- Sort order controls (▲▼ per dish within category)
- The project's actual dark royal/gold visual theme
  (`bg-ink`, `bg-royal`, `text-gold`, `font-cinzel`, `font-italiana`)
- Data fetched via `/api/menu-master` (not direct Supabase calls)

All of that was silently lost. The user caught this only after using the
page and noticing Add/Edit/Category/Price controls were gone.

### Fix
Recovered the original file via `git show 36e8f54:src/app/admin/menu/page.tsx`
(the commit immediately before the first condiment commit). Rebuilt the
page by taking that original file **unchanged** and merging the condiment
panel into it as an additive feature:
- Every original function preserved verbatim: `saveEdit`, `deleteItem`,
  `addItem`, `updateSortOrder`, `bulkUpdatePrice`, `startEdit`, category
  manager, bulk price editor
- Every original UI section preserved: header, bulk edit panel, category
  manager panel, add item form, category filter pills, per-category dish
  tables with inline edit
- Condiments added as a **new expand/collapse chevron** on the left edge
  of each dish row (doesn't disturb the existing grid column layout —
  added as its own narrow column)
- Condiment panel re-styled to match the existing dark royal/gold theme
  instead of the generic light Tailwind classes used in the original
  (wrong) condiment-only page
- Condiment API calls switched from direct Supabase client calls to
  `fetch('/api/menu-condiment-map')` / `fetch('/api/condiments')`,
  matching the original page's pattern of using API routes rather than
  importing `@/lib/supabase` directly into a client component (this is
  also consistent with the FIX-090 lazy-client fix, since API routes use
  `supabaseAdmin` server-side and never hit the client-bundle issue at all)
- "🥣 Condiments List" button added next to existing "💰 Bulk Edit" and
  "🗂️ Categories" buttons in the header, same visual style

### RULE for all future Claude sessions on this project
**Before writing or modifying ANY file in this project, always `view` (or
`git show`) the current/existing version first — even if a feature seems
like it should be straightforward to build standalone.** This project has
substantial existing functionality (custom theme, bulk editors, category
managers) that is not obvious from a database schema or a feature request
alone. Overwriting a file instead of reading-then-extending it has now
caused one full regression (this one) — never repeat this pattern.

### Files changed
| File | Change |
|------|--------|
| `src/app/admin/menu/page.tsx` | Replaced FIX-090's condiment-only version with original file + condiments merged in as an additive panel. All original Add/Edit/Category/Bulk-Price functionality restored. |

### Compatibility notes
- No changes needed to `/api/menu-condiment-map` or `/api/condiments` —
  both already used `supabaseAdmin` server-side, fully compatible
- No changes needed to `/api/menu-master` — untouched, used exactly as
  the original page used it
- Theme colors (`bg-ink`, `bg-royal`, `bg-royal-mid`, `text-gold`,
  `font-cinzel`, `font-italiana`, `text-cream`) assumed to be defined in
  the project's Tailwind config already, since the original file used
  them successfully before our changes

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-091-Jun18-v1.zip -d ~/Downloads/
cp ~/Downloads/MAYA-FIX-091-Jun18-v1/page.tsx src/app/admin/menu/page.tsx
cp ~/Downloads/MAYA-FIX-091-Jun18-v1/CHANGELOG.md CHANGELOG.md

git add .
git commit -m "FIX-091: restore original Menu Master (Add/Edit/Categories/Bulk Price) + merge condiments in"
git push
```

### Test after deploy
1. Open `/admin/menu` — verify "💰 Bulk Edit", "🗂️ Categories", "+ Add Item"
   buttons are all back in the header alongside the new "🥣 Condiments List"
2. Click "+ Add Item" — verify the full add-dish form still works
3. Click the pencil icon on any dish — verify inline edit still works
4. Click the new chevron (▸) on the left of any dish row — verify the
   condiment panel expands below it, matching the dark theme
5. Link a condiment to a dish (e.g. Idly → Coconut Chutney + Sambar) and
   confirm it saves and persists on reload

---

## Previous: FIX-090 — Lazy Supabase client init (fixes blank /admin/menu) (Jun 18 2026)
## Previous: FIX-089 — TypeScript fix, Supabase join returns array (Jun 17 2026)
## Previous: FIX-083 to FIX-088 — Condiment architecture (Jun 17 2026)
