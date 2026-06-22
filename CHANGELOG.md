# MAYA Platform CHANGELOG

---

## FIX-099 — Condiment rows and status text still unreadable after FIX-098
**Session:** Jun 20, 2026
**ZIP:** MAYA-FIX-099-Jun20-v1.zip
**Scope:** 3 files — TrayItemsSection.tsx, reply/page.tsx, quote/page.tsx
**Fixes:** Condiment rows (Tamarind Chutney, Mint Chutney, Raita) still showing
washed-out/invisible text after FIX-098; several other status/label colors
(pricing type badges, error/success banners, discount amounts, round-reply
threads) also found broken by the same root cause.

### Why FIX-098 didn't fully fix it
FIX-098 caught and fixed hardcoded literal hex backgrounds (`bg-[#0a1428]`
etc.). It did NOT catch a second, related problem: extensive use of
**Tailwind's built-in color palette at `-300`/`-400` weight** (`text-amber-400`,
`text-green-400`, `text-red-400`, `text-blue-400`, `text-teal-400`,
`text-purple-400`, `text-pink-400`, plus low-opacity variants like
`text-green-300/60`). These weights are designed to read on DARK backgrounds.
On the white theme, every single one of them measured 1.3–2.8:1 contrast —
all fail even the lenient 3:1 floor for large/bold text.

This was checked with the actual WCAG contrast formula, not visually
estimated, for every instance before fixing:

| Pattern found | Contrast on white | Used for |
|---|---|---|
| `text-amber-100/90` | ~1.2:1 | Condiment dish name |
| `bg-amber-500/[0.04]` | n/a (near-invisible tint) | Condiment row background |
| `text-amber-400` (full) | 1.56:1 | "PER PERSON" pricing-type badge |
| `text-amber-300/80` | 1.34:1 | Customer feedback banner |
| `text-amber-400/70` | 1.37–1.44:1 | Per-person/per-piece price hints, round indicator |
| `text-green-400` family | 1.7–2.5:1 | Save success banner, discount amount, "prices from menu" |
| `text-red-400` family | 2.0–2.8:1 | Error banner, delete buttons |
| `text-blue-400` / `teal-400` / `purple-400` / `pink-400` | 1.7–2.5:1 | Other pricing-type badges |

### Fix
Every instance replaced with the corresponding `-700` weight (same hue,
darker), re-verified to land at 3:1+ for UI/label text or 4.5:1+ for body
text. Where opacity modifiers diluted a `-700` color back below 3:1 (e.g.
`/50`, `/60`), the opacity was bumped to `/80`–`/90` to compensate. Condiment
row backgrounds/borders switched from generic `amber-*` Tailwind classes to
the project's own `gold`/`royal-mid`/`cream` theme tokens, so they track
whichever theme is active automatically instead of needing a manual fix
every time the theme changes again.

### Files changed (this fix only — 3 files, by explicit agreement)
| File | Instances fixed |
|------|-----------------|
| `src/components/crm/TrayItemsSection.tsx` | Condiment row (8 colors), 5 pricing-type badge colors, customer feedback banner (3 colors), per-piece price hint |
| `src/app/admin/enquiries/[id]/reply/page.tsx` | Condiment row (same 8 colors), `hasComment` highlight background, round indicator, per-person price hint, error/success banners, discount text, "prices from menu" indicator, round-reply thread labels (10+ instances) |
| `src/app/admin/enquiries/[id]/quote/page.tsx` | Error banner, success banner, delete buttons, discount text (5 instances) |

### Explicitly OUT OF SCOPE for this fix (by agreement)
A project-wide sweep found the same `-300`/`-400` weight pattern in **120
instances across 13 files total** — including `/admin/calendar`,
`/admin/enquiries` (list + detail + new), `/admin/orders`, `/admin` (hub),
`/order/checkout`, `ReviewRoundsPanel.tsx`, `SendReviewButton.tsx`. These are
NOT fixed yet. They were intentionally left for the deliberate full
white-theme rollout (not yet started — only `/admin/menu` has been
converted so far). Fixing all 13 in this same pass was considered and
explicitly declined to keep tonight's change reviewable and scoped to the
actual reported bug.

### RULE for all future Claude sessions
When converting any page from the dark theme to the white theme (or any
future theme change), grep for BOTH of these patterns before considering a
page "done":
1. `bg-\[#` and `text-\[#` — hardcoded literal hex (FIX-098's bug)
2. `text-[a-z]*-(300|400)\b` and `bg-[a-z]*-(300|400)\b` — Tailwind's
   built-in palette at light/dark-mode-tuned weights (FIX-099's bug)
Both categories silently break on a light background even though the code
"compiles fine" — neither is a syntax error, both are pure visual/contrast
bugs that only show up in a real screenshot, not in any automated check.

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-099-Jun20-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-099-Jun20-v1/TrayItemsSection.tsx  src/components/crm/TrayItemsSection.tsx
cp ~/Downloads/MAYA-FIX-099-Jun20-v1/reply-page.tsx        "src/app/admin/enquiries/[id]/reply/page.tsx"
cp ~/Downloads/MAYA-FIX-099-Jun20-v1/quote-page.tsx        "src/app/admin/enquiries/[id]/quote/page.tsx"
cp ~/Downloads/MAYA-FIX-099-Jun20-v1/CHANGELOG.md          CHANGELOG.md

git add .
git commit -m "FIX-099: fix remaining unreadable text in Quote/Reply builders - Tailwind -400 weight colors fail on white theme"
git push
```

### Test after deploy
1. Open Kannan Kesavalu's quote (or any quote with condiments) in the Quote
   Builder. Confirm "Tamarind Chutney", "Mint Chutney", "Raita" are now
   clearly readable with visible qty/unit values and a visible "On Quote"
   toggle.
2. Confirm the small "PER PERSON" / "PER TRAY" pricing-type label under each
   dish name is now clearly readable (was very faint blue/amber before).
3. Save Draft and confirm the green "✅ Quote saved" banner is readable.
4. Trigger a validation/save error (if possible) and confirm the red error
   banner is readable.
5. Open Reply Builder for a quote with a customer comment — confirm the
   highlighted dish row (previously near-black `#1a1200`) now shows a
   visible warm gold tint instead, and the "Maya"/"Your Reply" thread labels
   are readable green.

---

## Previous: FIX-098 — Invisible hardcoded hex colors (Jun 20 2026)
## Previous: FIX-096/097 — White theme test on /admin/menu (Jun 19 2026)
