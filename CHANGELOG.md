# MAYA Platform — CHANGELOG (FIX-005 batch)

## FIX-024 | Jun 15 2026 | INCLUDED ✅
**Symptom:** New enquiry form defaulted to Wedding — most enquiries are home parties
**Fix:** Changed default event_type from 'wedding' to 'home_party'
**Files:** src/app/admin/enquiries/new/page.tsx
**Lines:** EMPTY constant — event_type: 'home_party'

## FIX-025 | Jun 15 2026 | INCLUDED ✅
**Symptom:** Quote Builder auto-switched to per_person pricing for wedding/engagement events
**Fix:** Removed auto-switch — always defaults to tray, admin switches manually if needed
**Files:** src/app/admin/enquiries/[id]/quote/page.tsx
**Lines:** Removed: if (['wedding',...].includes(d.event_type)) setCateringType('per_person')

## FIX-026 | Jun 15 2026 | INCLUDED ✅
**Symptom:** Admin dish notes (chutney, dispenser, prawn type etc) were never shown to customer
**Fix:** Renamed 'Comments' column to 'Notes to Customer' — now included in ALL quote emails (Round 1+)
**Files:** src/components/crm/TrayItemsSection.tsx, src/app/api/quotes/send-review/route.ts, src/app/api/quotes/route.ts, src/app/admin/enquiries/[id]/quote/page.tsx
**SQL Required:** ALTER TABLE quote_tray_items ADD COLUMN IF NOT EXISTS notes_to_customer TEXT;
**Notes:** Falls back to customer_comments for old quotes

## FIX-027 | Jun 15 2026 | INCLUDED ✅
**Symptom:** Admin could click "Send Round 2" without editing quote first — sending unchanged quote
**Fix:** Added confirmation dialog: "Make sure you've updated the quote first. Click OK to send."
**Files:** src/components/crm/ReviewRoundsPanel.tsx
**Lines:** handleSendRound2() — window.confirm() before sending

## FIX-028 | Jun 15 2026 | INCLUDED ✅
**Symptom:** WhatsApp message was generated but required manual copy-paste
**Fix:** Added 📱 WhatsApp button per round — opens wa.me with pre-filled message in one click
**Files:** src/components/crm/ReviewRoundsPanel.tsx
**Notes:** Uses wa.me/1{phone} (US numbers). Pass customerPhone prop from enquiry detail page.

## SQL TO RUN (Supabase SQL Editor)
ALTER TABLE quote_tray_items ADD COLUMN IF NOT EXISTS notes_to_customer TEXT;
