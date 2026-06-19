# MAYA Platform CHANGELOG

---

## FIX-090 — Lazy Supabase client initialization (fixes blank /admin/menu page)
**Session:** Jun 18, 2026
**ZIP:** MAYA-FIX-090-Jun18-v1.zip
**Fixes:** Blank page + "supabaseKey is required" crash on /admin/menu

### Symptom
`/admin/menu` rendered completely blank (no header, no content, no error UI)
in both regular browsing and a fresh Incognito window with cache-busting
query params. Server logs showed `GET /admin/menu 200` with zero errors —
the page shell loaded fine, but client-side JS crashed immediately on
hydration with:
```
Uncaught Error: supabaseKey is required.
    at new t$ (...)
    at tx (...)
```

### Investigation trail
1. Verified `src/lib/supabase.ts` itself was correct (had the right env var names)
2. Verified `page.tsx` only imported `{ supabase }`, no stray `createClient()` calls
3. Verified Vercel Production domain WAS correctly pointed at the latest
   successful deployment (fce1b54, FIX-089) — ruled out stale deployment
4. Verified browser/CDN caching wasn't the cause — same error in Incognito
   with `?t=12345` cache-buster
5. Verified server-side rendering succeeded (200 OK, 0 server errors) —
   ruled out a server-side data/query problem
6. Compared against `/admin/page.tsx` (which works) — found the key
   difference: `/admin` never imports `@/lib/supabase` directly; it only
   calls `fetch('/api/enquiries')` and lets an API route handle Supabase.
   `/admin/menu` was the **first page in the app to import `@/lib/supabase`
   directly into a `'use client'` component.**

### Root cause
`src/lib/supabase.ts` constructed both Supabase clients as **module-level
constants** at import time:
```ts
export const supabase = createClient(url, anon)          // ❌ runs at module load
export const supabaseAdmin = createClient(url, service)  // ❌ runs at module load
```
This works reliably when the module is only ever imported into **server-side**
code (API routes), where `process.env.*` is always fully available at
execution time. But when imported into a **client component**, the call
runs during webpack's client-bundle module evaluation — and depending on
chunk-splitting, that evaluation can occur before Next.js's
`NEXT_PUBLIC_*` inlining is guaranteed to have applied to that specific
chunk. This produced an `undefined` anon key passed into `createClient()`,
which throws synchronously.

### Fix
Rewrote `src/lib/supabase.ts` to lazily construct each client on first
actual use, behind a `Proxy` so every existing call site (`supabase.from(...)`)
continues to work completely unchanged — **no other file needed editing.**

```ts
let _supabase: SupabaseClient | null = null
function getSupabase() {
  if (!_supabase) _supabase = createClient(url, anon)
  return _supabase
}
export const supabase = new Proxy({}, { get(_, prop) { return getSupabase()[prop] } })
```

### RULE for all future Claude sessions on this project
**Never export a Supabase client as a module-level `const` created by
calling `createClient()` directly at the top of the file.** Always lazily
construct it inside a getter function, exposed via a `Proxy` (or returned
from a function call at each use site). This guarantees env vars are
read at actual call time, not at module-evaluation time, and makes the
client safe to import into both server code AND client components.

### Files changed
| File | Change |
|------|--------|
| `src/lib/supabase.ts` | Rewritten with lazy Proxy-based singletons. Drop-in replacement — `supabase.from(...)` and `supabaseAdmin.from(...)` syntax unchanged everywhere. |

### Verified compatible with existing usage
Confirmed via grep that 13 files currently call `createClient(` directly
in API routes (those are unaffected — they construct their own clients
inline and don't import from `lib/supabase.ts`). Only `lib/supabase.ts`
itself needed to change.

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-090-Jun18-v1.zip -d ~/Downloads/
cp ~/Downloads/MAYA-FIX-090-Jun18-v1/supabase.ts src/lib/supabase.ts
cp ~/Downloads/MAYA-FIX-090-Jun18-v1/CHANGELOG.md CHANGELOG.md

git add .
git commit -m "FIX-090: lazy Supabase client init - fixes blank /admin/menu page"
git push
```

Wait for Vercel to deploy (~1 min), then test:
1. Open `https://maya-catering.vercel.app/admin/menu` in a fresh tab
2. Should now show "Menu Master" header, search box, dish list
3. If dish list is empty — that's expected if `master_menu` table has no rows
   yet (separate from this bug). Next step would be seeding menu items.

---

## Previous: FIX-089 — TypeScript fix, Supabase join returns array (Jun 17 2026)
## Previous: FIX-083 to FIX-088 — Condiment architecture (Jun 17 2026)
## Previous: FIX-077 to FIX-082 — Kitchen Prep List initial build (Jun 17 2026)
