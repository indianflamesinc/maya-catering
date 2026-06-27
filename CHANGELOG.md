# MAYA Platform CHANGELOG

---

## FIX-100 — Dark page background still showing around Quote/Reply/Enquiry pages
**Session:** Jun 22, 2026
**ZIP:** MAYA-FIX-100-Jun22-v1.zip
**Fixes:** Dark navy margin still visible around the white card content on
Quote Builder, Reply Builder, and Enquiry Detail pages.

### Symptom
After FIX-099, the actual content cards (dish rows, condiment rows, summary
panel) were correctly white/readable, but the outer page background —
visible as a dark strip on the left/right edges and below the content —
was still dark navy.

### Root cause
The outer wrapper on each of these pages used `<div className="min-h-screen
bg-ink">`. `ink` was deliberately kept dark in FIX-096 because it's also
used for `text-ink` (dark text on gold buttons, 28 instances project-wide) —
but that same token was ALSO being used here as a page background, which
needed to go white. This is the exact `ink` dual-purpose conflict flagged in
FIX-096's original CHANGELOG entry, just not yet fully tracked down to every
page that has it.

### Fix
`bg-ink` → `bg-paper` (the dedicated white-background token introduced in
FIX-096) on all page-level wrapper divs in the 3 affected files. The one
exception: `reply/page.tsx`'s modal backdrop (`bg-ink/80`, a semi-transparent
dark overlay behind the "Pick from Menu" popup) was deliberately LEFT
UNCHANGED — a dark backdrop behind a modal is correct UX regardless of
light/dark theme, and is not a "page background" in the sense this bug
applies to.

### Also fixed in this pass
While in `enquiry/[id]/page.tsx` (which sits in the navigation path to/from
Quote Builder and Reply Builder, and was about to be visited during testing),
found and fixed the same `-400` weight Tailwind color contrast issue from
FIX-099 — 8 instances: Approve/Decline buttons, pipeline stage badges,
Live/Passing dish tags, and the "This week!" urgency warning.

### Files changed
| File | Change |
|------|--------|
| `src/app/admin/enquiries/[id]/quote/page.tsx` | `bg-ink` → `bg-paper` (2 instances: loading state, main wrapper) |
| `src/app/admin/enquiries/[id]/reply/page.tsx` | `bg-ink` → `bg-paper` (4 instances: 3 loading/error states, main wrapper). Modal backdrop `bg-ink/80` left unchanged. |
| `src/app/admin/enquiries/[id]/page.tsx` | `bg-ink` → `bg-paper` (3 instances). Plus 8 `-400`-weight color fixes (same pattern as FIX-099): buttons, stage badges, Live/Passing tags, urgency text — all switched to `-600`/`-700` weights for proper contrast. |

### Confirmed UNAFFECTED — no fix needed
`src/app/review/[token]/page.tsx` (the customer-facing review/quote link)
was checked and already uses `background: '#fff'` / `'#fafaf8'` via inline
styles — it was never on the dark theme at all, in either the original
design or after tonight's changes. The customer-facing email and review URL
should already display correctly with no further action needed.

### RULE for all future Claude sessions
When auditing a page for the `bg-ink` → `bg-paper` fix, distinguish between:
- **Page-level background** (`min-h-screen bg-ink`, loading/error state
  wrappers) → always change to `bg-paper`
- **Modal/overlay backdrops** (`bg-ink/NN` with a fractional opacity, used
  with `fixed inset-0` + `backdrop-blur`) → leave as `bg-ink`, these are
  intentionally dark scrims behind a popup regardless of theme

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-100-Jun22-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-100-Jun22-v1/quote-page.tsx          "src/app/admin/enquiries/[id]/quote/page.tsx"
cp ~/Downloads/MAYA-FIX-100-Jun22-v1/reply-page.tsx          "src/app/admin/enquiries/[id]/reply/page.tsx"
cp ~/Downloads/MAYA-FIX-100-Jun22-v1/enquiry-detail-page.tsx "src/app/admin/enquiries/[id]/page.tsx"
cp ~/Downloads/MAYA-FIX-100-Jun22-v1/CHANGELOG.md            CHANGELOG.md

git add .
git commit -m "FIX-100: remove leftover dark page background on Quote/Reply/Enquiry pages"
git push
```

### Test after deploy
1. Open Kannan Kesavalu's quote again — confirm the dark margins around the
   white card are now gone, page background is fully white/cream edge-to-edge
2. Open the Reply Builder for the same enquiry — same check
3. Open the Enquiry Detail page (the page you land on before clicking into
   Quote Builder) — confirm no dark background, and check the
   Approve/Decline buttons + pipeline stage badges are readable
4. **Then proceed with your planned test:** Save the quote, click "Send to
   Customer," and check both the resulting EMAIL and the customer-facing
   REVIEW URL to confirm condiments display correctly (showing only the
   ones marked "On Quote", hidden ones marked "Kitchen Only" never appear
   to the customer)

---

## Previous: FIX-099 — Condiment rows and status text unreadable (Jun 20 2026)
## Previous: FIX-098 — Invisible hardcoded hex colors (Jun 20 2026)
