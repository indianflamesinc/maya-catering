# MAYA Platform CHANGELOG

---

## FIX-098 — Invisible text in Quote Builder / Reply Builder after white theme change
**Session:** Jun 19-20, 2026
**ZIP:** MAYA-FIX-098-Jun20-v1.zip
**Fixes:** "Vegetable Samosa", "Tamarind Chutney", "Mint Chutney" and their
input fields rendering invisible (dark text on dark background) in the Quote
Builder's Tray Items section.

### Symptom (reported with screenshots)
After FIX-096/097 (white theme on `/admin/menu`), the Quote Builder page
(`/admin/enquiries/[id]/quote`) showed dish rows and condiment rows as
completely unreadable — text and input values invisible against their own
background.

### Root cause
`tailwind.config.ts` and `globals.css` are GLOBAL files — changing them (as
FIX-096 did) affects every page that uses the theme's named tokens
(`bg-royal`, `text-cream`, `text-gold`, etc.), even pages whose actual markup
was never touched. That part was expected and is fine.

The actual bug: `TrayItemsSection.tsx` and `reply/page.tsx` — both written
during tonight's FIX-093 condiment work — used **hardcoded literal hex
backgrounds** for dish/condiment rows (`bg-[#0a1428]`, `bg-[#071020]`,
`bg-[#090f1e]`) instead of theme tokens. These literals never changed when
the theme flipped to white. But the TEXT inside those rows used `text-cream`
and `text-gold`, which DID change (now near-black/dark-gold, since those
tokens flipped for the white theme). Result: dark text on a literal dark
background that the theme change never touched — invisible.

Two more pre-existing files (`SendReviewButton.tsx`, `ReviewRoundsPanel.tsx`,
predating tonight, not part of FIX-093) had similar hardcoded OLD gold/ink
hex values (`#C9A84C`, `#05091A`) — not literally broken (self-contained
pairing), but now visually mismatched against the rest of the updated theme.

### Files checked but found UNAFFECTED (no fix needed)
- `src/app/review/[token]/page.tsx`, `deposit/page.tsx` — use inline
  `style={{ color: '#...' }}` literals for a self-contained customer email
  page design, never wired to Tailwind theme tokens in the first place
- `src/app/page.tsx` (public homepage), `Nav.tsx` — same pattern, inline
  gradient/stroke colors independent of the theme config
These intentionally keep their original dark-navy/gold brand look regardless
of the admin-side theme, since they're standalone customer-facing pages.

### Fix
| File | Change |
|------|--------|
| `src/components/crm/TrayItemsSection.tsx` | `bg-[#0a1428]` → `bg-royal-mid`, `bg-[#071020]` → `bg-royal`, `bg-[#090f1e]` → `bg-royal-mid` (6 instances) |
| `src/app/admin/enquiries/[id]/reply/page.tsx` | Same 3 hex→token replacements (6 instances). Note: 4 OTHER hardcoded hex instances in this file (`#050d1a`, `#0a1f0a`, `#050d05` — the green "admin reply" boxes) were checked and left as-is; they use Tailwind's built-in `green-100` text color, fully independent of our custom theme tokens, so they're unaffected either way. |
| `src/components/crm/SendReviewButton.tsx` | `text-[#C9A84C]` → `text-gold`, `hover:text-[#E2C87A]` → `hover:text-gold-hi`, `bg-[#C9A84C] text-[#05091A] hover:bg-[#E2C87A]` → `bg-gold text-ink hover:bg-gold-hi` (2 spots) |
| `src/components/crm/ReviewRoundsPanel.tsx` | `bg-[#05091A]` → `bg-royal-mid`, `bg-[#C9A84C] ... text-[#05091A] hover:bg-[#E2C87A]` → `bg-gold ... text-ink hover:bg-gold-hi` |

### RULE for all future Claude sessions
**Never write a literal hardcoded hex color (`bg-[#xxxxxx]`, `text-[#xxxxxx]`)
in this project when an equivalent theme token already exists** (`bg-royal`,
`bg-royal-mid`, `text-gold`, `text-ink`, etc.). Hardcoded hex values silently
desync from the theme the moment the theme changes — exactly what happened
here, introduced by Claude's OWN code earlier in this same session (FIX-093).
Always check `tailwind.config.ts`'s `colors` block first and use the named
token, even if it means a slightly less precise color match — consistency
with the rest of the theme matters more than a perfect one-off shade.

This also applies in reverse: before changing a global theme file, grep the
whole project for `bg-\[#` and `text-\[#` patterns first, to catch any
hardcoded colors that will NOT automatically follow the theme change and may
need a matching manual update.

---

## INSTALL

```bash
cd /Users/ashok/PROJECTS/maya_catering_ent_web/maya-catering
unzip ~/Downloads/MAYA-FIX-098-Jun20-v1.zip -d ~/Downloads/

cp ~/Downloads/MAYA-FIX-098-Jun20-v1/TrayItemsSection.tsx   src/components/crm/TrayItemsSection.tsx
cp ~/Downloads/MAYA-FIX-098-Jun20-v1/reply-page.tsx         "src/app/admin/enquiries/[id]/reply/page.tsx"
cp ~/Downloads/MAYA-FIX-098-Jun20-v1/SendReviewButton.tsx   src/components/crm/SendReviewButton.tsx
cp ~/Downloads/MAYA-FIX-098-Jun20-v1/ReviewRoundsPanel.tsx  src/components/crm/ReviewRoundsPanel.tsx
cp ~/Downloads/MAYA-FIX-098-Jun20-v1/CHANGELOG.md           CHANGELOG.md

git add .
git commit -m "FIX-098: fix invisible text in Quote Builder/Reply Builder - hardcoded hex colors desynced from white theme"
git push
```

### Test after deploy
1. Open the Quote Builder for an enquiry with dishes + condiments
   (e.g. Kannan Kesavalu's quote from the screenshot)
2. Confirm "Vegetable Samosa" and its row are now clearly readable
3. Confirm "Tamarind Chutney" / "Mint Chutney" condiment rows show readable
   text, qty/unit inputs, and the "On Quote" toggle
4. Open the Reply Builder (Round 2+) for any quote and check the same
5. Check the Review Rounds panel (where admin sees customer feedback per
   round) — the "respond" button area should look consistent with the new
   gold, not the old lighter gold

---

## Previous: FIX-096/097 — White theme test on /admin/menu (Jun 19 2026)
## Previous: FIX-095 — Condiment parent-id matching fix (Jun 19 2026)
