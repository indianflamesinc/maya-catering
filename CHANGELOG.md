# MAYA Platform CHANGELOG

---

## FIX-096 — White theme: TEST DEPLOY on /admin/menu only
**Session:** Jun 19, 2026
**ZIP:** MAYA-FIX-096-097-Jun19-v2-TEST.zip
**Scope:** Preview only — 3 files. NOT yet rolled out to the other 21 pages/components.

### What this is
A test of switching from the dark navy/gold theme to a white/cream-based theme,
keeping the same gold accent and Cinzel/Italiana typography. Applied to ONLY
`/admin/menu` so you can review the actual look before a full rollout.

### The real complexity (why this wasn't a 5-minute color swap)
Initial plan was "just change 4-5 hex values in tailwind.config.ts." Two
problems surfaced during contrast-checking (WCAG ratios calculated, not
guessed) that made this more involved:

**1. Low-opacity utility classes go invisible on white.**
`text-cream/30`, `/25`, `/20` etc. were tuned to read as soft muted gray
against dark navy. Mathematically, diluting a near-black color toward WHITE
at 20-30% opacity lands around #BABABA–#D1D1D1 — contrast ratios of 1.2–1.9:1,
far below the 3:1 WCAG minimum even for large text. These were invisible-ish,
not just "more subtle." Fixed by bumping the affected instances (11 in this
file) up to /40–/60, which are 2.5:1–4.5:1 and stay legible. Decorative
hairline borders (`border-gold/10-20`) were left as-is since faintness is the
correct intent there — only TEXT opacity was at risk.

**2. The `ink` token is used for two incompatible purposes.**
`bg-ink` (28 instances project-wide) = page/section background → needed to
become white. `text-ink` (28 instances project-wide) = dark text ON gold/amber
BUTTON backgrounds (e.g. `btn-royal`, `bg-gold text-ink`) → needed to STAY
dark, or `text-ink` on gold would have dropped to 2.91:1 contrast, failing
even large-text AA. Resolution: `ink` stays dark (`#1A1A1A`), and a NEW
token `paper` (`#FFFFFF`) was introduced for what `bg-ink` used to mean.
`bg-ink` → `bg-paper` was mechanically find-and-replaced in this file (1
instance) — verified via `grep -c` before/after (1 → 0 remaining `bg-ink`,
1 → 1 `bg-paper`).

### Color mapping
| Token | Old (dark) | New (white) | Used for |
|-------|-----------|-------------|----------|
| `ink` | `#05091A` | `#1A1A1A` (**unchanged direction** — stays dark) | text-on-gold-button |
| `paper` (**new**) | n/a | `#FFFFFF` | page background (replaces old bg-ink usage) |
| `royal` | `#0A1530` | `#FAF7EF` | card backgrounds |
| `royal-mid` | `#0F1E40` | `#F3ECDA` | header/section backgrounds |
| `gold` | `#C9A84C` | `#B8923A` | accent (darkened — old value was only 2.9:1 on white, same as new; this is a label/accent color, not body text, so left close to original hue) |
| `gold-hi` | `#E2C87A` | `#9C7A2E` | hover states (darkened more — 4.0:1 on white, needs to stay visibly distinct from base gold) |
| `cream` | `#F6EDD8` | `#1A1A1A` | primary text (was light, now near-black) |

### Verified contrast ratios (WCAG AA: 4.5:1 text, 3:1 large text/UI)
- Primary text (`cream`) on page bg (`paper`): **17.4:1** ✅
- Primary text on card bg (`royal-mid`): **14.8:1** ✅
- `btn-royal` text (`ink`, dark) on gold bg: **5.98:1** ✅ (was 2.91:1 before the ink/paper split fix — would have failed)
- Gold accent text on white: **2.91:1** — borderline, acceptable for small uppercase
  tracked labels/eyebrows (decorative, not body copy), but flag for visual review
- Gold-hi (hover) on white: **4.01:1** — close to AA, fine for hover states

### Files changed (TEST SCOPE ONLY)
| File | Change |
|------|--------|
| `tailwind.config.ts` | New color values; `ink` kept dark, `paper` added |
| `src/app/globals.css` | Root CSS vars updated; `.bg-ink` utility renamed to `.bg-paper`; box-shadow glow toned down for white bg; date/time picker color-scheme switched to light |
| `src/app/admin/menu/page.tsx` | `bg-ink` → `bg-paper` (1 instance); `text-cream/20`, `/25`, `/30` bumped to `/50`–`/60` (11 instances) for readability |

### NOT done yet (pending your sign-off on the look)
- The other 21 files still reference `bg-ink` for their page background, which
  will now resolve to dark `#1A1A1A` (since `ink` stayed dark) — **if you
  deploy this test as-is, every OTHER page will look broken/wrong** (dark bg
  again) until the same `bg-ink` → `bg-paper` replacement is applied there too.
  This is intentional for an isolated test — only `/admin/menu` reflects the
  new theme.
- Low-opacity text bumps were only audited for `/admin/menu`'s specific
  classes — the other 21 files likely have their own `/15`–`/30` instances
  needing the same review.
- `gold` and `gold-hi` contrast is acceptable but not ideal (2.9–4.0:1) —
  worth a visual check on actual rendered labels before committing project-wide.

---

## FIX-097 — Darker gold for real text contrast + semantic token layer added
**Session:** Jun 19, 2026
**ZIP:** MAYA-FIX-096-097-Jun19-v2-TEST.zip (same zip, updated)

### Problem reported (with screenshot)
Category filter pill labels ("CHAAT & LIVE STATIONS", "SOUTH INDIAN" etc.)
were too low-contrast / hard to read against white. Root cause: `gold`
(`#B8923A`) was tuned for "acceptable on small uppercase labels" (2.91:1) in
FIX-096, but it's actually used as the PRIMARY text color for unselected
category pills, section headings, and field labels throughout the app — not
just decorative accents. 2.91:1 is genuinely too low for that much reading.

### Fix — darker gold
| Token | FIX-096 value | FIX-097 value | Contrast on white |
|-------|---------------|----------------|---------------------|
| `gold` | `#B8923A` (2.91:1) | `#8A6A1F` | **5.05:1** (pass) |
| `gold-hi` | `#9C7A2E` (4.01:1) | `#6B4F0E` | **7.64:1** (pass) |
| `gold-pale` | `#D9BC74` | `#C9A050` | (decorative accent, not text-critical) |

Note: `btn-royal`'s dark text on gold background dropped from 5.98:1 to
3.45:1 with the darker gold — still passes AA for bold/large UI text (3:1
threshold, and button labels are bold+tracked+uppercase) but is worth
revisiting if it looks borderline in person. Did not change `text-ink` to
white-on-gold instead, since that token is shared across 28 call sites in
10 files and swapping it deserves its own deliberate pass, not a same-night
add-on to an already multi-layered fix.

### Semantic token layer (requested) — added, not yet applied to markup
Per request: rather than re-tuning raw colors at 600+ scattered call sites
every time contrast needs adjusting, a semantic layer was added to
`tailwind.config.ts`:
```
text-title, text-label, text-body, text-muted, text-hint,
surface-page, surface-card, surface-panel, accent, accent-hover
```
These are NEW aliases pointing at the same hex values as the existing raw
tokens (e.g. `text-label` = `gold` = `#8A6A1F`). Nothing was renamed or
removed — every existing `bg-royal`, `text-gold`, `text-cream/40` etc.
class still works exactly as before. The new names exist so that future
adjustments can target one role ("make all labels darker") via one config
line, instead of grep-and-replace across 22 files.

Not yet wired into any markup. Rolling these into actual className
strings is a separate, deliberate next step — doing it section-by-section
with visual review, not a blanket find-replace, since (as this exact bug
demonstrated) automated swaps without checking actual rendered contrast
is exactly what causes these issues in the first place.

### Files changed
| File | Change |
|------|--------|
| `tailwind.config.ts` | Gold family darkened; semantic token layer added (additive only) |
| `src/app/globals.css` | Hardcoded gold hex values in @layer utilities and ::selection/glow updated to match |

---

## INSTALL (TEST ONLY — confirm the look before going further)

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-096-097-Jun19-v2-TEST.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-096-097-Jun19-v2-TEST/tailwind.config.ts  tailwind.config.ts
cp ~/Downloads/MAYA-FIX-096-097-Jun19-v2-TEST/globals.css         src/app/globals.css
cp ~/Downloads/MAYA-FIX-096-097-Jun19-v2-TEST/page.tsx            src/app/admin/menu/page.tsx
cp ~/Downloads/MAYA-FIX-096-097-Jun19-v2-TEST/CHANGELOG.md        CHANGELOG.md

git add .
git commit -m "FIX-096 TEST: white theme preview on /admin/menu only"
git push
```

**Expect:** `/admin/menu` looks white/cream with gold accents. Every OTHER
page (`/admin`, `/admin/enquiries`, customer-facing pages, etc.) will be
affected by the `globals.css`/`tailwind.config.ts` changes too, BUT since
they still say `bg-ink` (now dark `#1A1A1A`) instead of `bg-paper`, their
page backgrounds will still render dark — just using the new dark value
instead of the old one. Visually they should look almost identical to
before on those other pages. Only `/admin/menu`'s structural page bg
switches to white in this test.

### After you review the screenshot/live page
Tell me:
1. Does the white/cream look feel right, or too stark / too beige / wrong gold shade?
2. Should I roll the same `bg-ink` → `bg-paper` swap + opacity audit out to
   all 21 remaining files?

---

## Previous: FIX-095 — Condiment parent-id matching fix (Jun 19 2026)
