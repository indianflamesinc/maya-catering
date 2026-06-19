# MAYA Platform CHANGELOG

---

## FIX-092 — Surface API errors instead of failing silently on "Add Condiment"
**Session:** Jun 18, 2026
**ZIP:** MAYA-FIX-092-Jun18-v1.zip
**Fixes:** Clicking "Add" in the Condiments Master List modal (and in the
per-dish Condiment Panel) did nothing — no error, no success, no feedback
at all.

### Symptom
User typed "Tamarind Chutney" in the Condiments Master List modal, clicked
ADD, and nothing happened — button didn't spin, list didn't update, no
error shown anywhere on screen.

### Root cause
Both `add()` in `CondimentsMasterModal` and `addCondiment()` in
`CondimentPanel` called `res.json()` directly on the fetch response with
no error handling:
```ts
const res = await fetch('/api/condiments', { method: 'POST', ... })
const data = await res.json()          // throws if response isn't valid JSON
if (!data.error) { ... }                // never checked res.ok / status code
```
If the API route returned a non-2xx status, a server error page, or any
non-JSON body, `res.json()` would throw inside an unguarded `async`
function. The error vanished into an unhandled promise rejection with no
visible UI feedback — button simply stopped indicating "saving" and
nothing else happened.

NOTE: this session could not yet confirm the exact underlying API error
(whether `/api/condiments` and `/api/menu-condiment-map` route files are
present in the live deployment, a Supabase constraint, or something else)
— that check is still pending. This fix's purpose is to make the *next*
failure (or this same one, retried) immediately visible instead of silent,
so the actual root cause can be diagnosed in one step instead of multiple
back-and-forth DevTools sessions.

### Fix
Both functions now:
1. Wrap the fetch in try/catch
2. Read the response as text first, then attempt `JSON.parse` —
   if parsing fails, show the raw response text + status code
3. Check `res.ok` explicitly, not just `data.error`
4. Display the resulting error message directly in the modal/panel UI
   (red banner), no DevTools required

### Files changed
| File | Change |
|------|--------|
| `src/app/admin/menu/page.tsx` | `CondimentsMasterModal.add()` and `CondimentPanel.addCondiment()` rewritten with full error handling + on-screen error banner (`addError` state) |

### RULE for all future Claude sessions on this project
Every `fetch(...)` call that mutates data (POST/PATCH/DELETE) in this
project's client components must check `res.ok`, must not assume the
body is valid JSON, and must surface failures to the user visibly (state
+ on-screen message) rather than relying on `console.error` or silent
no-ops. This project's debugging loop is slow (deploy → wait → screenshot
→ paste back), so silent failures cost entire sessions instead of one
glance at the screen.

---

## STILL PENDING — verify API route files are deployed
Before this fix can confirm the actual root cause, run this and report
back so we know what error message will actually appear:
```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
ls -la src/app/api/condiments/
ls -la src/app/api/menu-condiment-map/
cat src/app/api/condiments/route.ts | head -5
```
If either folder is missing or empty, that — not a code bug — is the
real root cause, and those route files need to be (re)installed from the
MAYA-CONDIMENTS-Jun17-v4.zip delivered two sessions ago.

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-092-Jun18-v1.zip -d ~/Downloads/
cp ~/Downloads/MAYA-FIX-092-Jun18-v1/page.tsx src/app/admin/menu/page.tsx
cp ~/Downloads/MAYA-FIX-092-Jun18-v1/CHANGELOG.md CHANGELOG.md

git add .
git commit -m "FIX-092: surface API errors on Add Condiment instead of failing silently"
git push
```

### Test after deploy
1. Open `/admin/menu` → "🥣 Condiments List"
2. Type a new condiment name → click ADD
3. If it still fails, a red error banner should now appear inside the
   modal with the actual error message — paste that message back so we
   can fix the real underlying cause

---

## Previous: FIX-091 — Restore original Menu Master + merge condiments (Jun 18 2026)
## Previous: FIX-090 — Lazy Supabase client init (Jun 18 2026)
## Previous: FIX-089 — TypeScript fix, Supabase join returns array (Jun 17 2026)
## Previous: FIX-083 to FIX-088 — Condiment architecture (Jun 17 2026)
