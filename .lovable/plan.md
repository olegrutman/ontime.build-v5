

# Daily Log — Best-in-Class Design Suggestions

## Design Philosophy: Zero-Typing, Tap-First

The daily log should take **under 90 seconds** to complete, primarily through taps, toggles, and sliders — matching your existing chip/badge-based UI patterns (like `NotesStep` quick-add chips and the T&M period cards).

---

## Suggested Sections (all tap-based)

### 1. Weather Strip (auto-fetched + override)
- Auto-fetch weather from device location or project address on log creation
- Show icon chips: ☀️ Sunny | 🌧️ Rain | ❄️ Snow | 💨 Wind | 🌡️ Hot | 🥶 Cold
- Tap to override if auto-fetch is wrong
- Auto-fill temp range from API

### 2. Manpower Count (stepper, not typing)
- Per-trade stepper: `[-] 4 [+]` for each trade/crew on the project
- Pre-populated from project participants (TC/FC orgs)
- Total auto-calculated at top

### 3. Work Performed (linked to schedule)
- Pull today's active schedule tasks automatically
- Each task shows a **progress slider** (0–100%) — drag to update
- Tap a chip to tag status: `On Track` | `Delayed` | `Blocked` | `Complete`
- This updates the schedule item's progress directly (bidirectional)

### 4. Safety & Incidents (toggle + chips)
- Toggle: "Any safety incidents today?" → No (default) / Yes
- If Yes: tap chips for type: `Near Miss` | `First Aid` | `Recordable` | `Property Damage`
- Optional: attach photo from camera

### 5. Deliveries (auto-populated)
- Auto-pull from POs with today's expected delivery date
- Tap to confirm: ✅ Received | ❌ Not Received | ⚠️ Partial
- Tap to add photo of delivery ticket

### 6. Delays & Issues (chip selector)
- Tap cause chips: `Weather` | `Material` | `Labor` | `Equipment` | `Inspection` | `RFI` | `Other`
- Stepper for hours lost: `[-] 2 [+]`
- Optional voice note (reuse existing speech recognition from NotesStep)

### 7. Photos (camera-first)
- Big camera button → snap photo → auto-tagged with date/location
- Swipe through thumbnail strip
- Tap to tag: `Progress` | `Issue` | `Delivery` | `Safety`

### 8. Quick Notes (voice + chips, same as PO wizard pattern)
- Reuse the existing `NotesStep` pattern: quick-add chips + voice input + optional typing
- Pre-built chips: `Inspection passed` | `Concrete pour` | `Rough-in complete` | `Punch list items` | `Change order needed`

---

## Data Model

New tables needed:
- **`daily_logs`** — one per project per date (project_id, log_date, weather_data jsonb, manpower_total, delay_hours, notes, created_by, status: DRAFT/SUBMITTED)
- **`daily_log_manpower`** — per-trade headcount (log_id, org_id, trade, headcount)
- **`daily_log_delays`** — cause chips + hours (log_id, cause, hours_lost)
- **`daily_log_photos`** — storage refs + tags (log_id, storage_path, tag, caption)
- **`daily_log_deliveries`** — PO delivery confirmations (log_id, po_id, status)

Safety incidents and work performed don't need separate tables — incidents go in a jsonb column on daily_logs, and work performed updates `project_schedule_items.progress` directly.

---

## UX Flow

1. User opens Daily Log tab → today's log auto-created as DRAFT
2. Swipeable card sections (weather → manpower → work → safety → deliveries → delays → photos → notes)
3. Each card is independently saveable (auto-save on change)
4. "Submit" button at bottom locks the log

---

## Integration Points

| Feature | Links To |
|---------|----------|
| Work Performed | `project_schedule_items` (progress sync) |
| Deliveries | `material_orders` / POs with delivery dates |
| Manpower | Project participants (TC/FC orgs) |
| Photos | Lovable Cloud file storage |
| Delay hours | Could feed into T&M period entries |

---

## Files to Create/Modify

| Action | Path |
|--------|------|
| New | `src/types/dailyLog.ts` |
| New | `src/hooks/useDailyLog.ts` |
| New | `src/components/daily-log/DailyLogPanel.tsx` (main container) |
| New | `src/components/daily-log/WeatherCard.tsx` |
| New | `src/components/daily-log/ManpowerCard.tsx` |
| New | `src/components/daily-log/WorkPerformedCard.tsx` |
| New | `src/components/daily-log/SafetyCard.tsx` |
| New | `src/components/daily-log/DeliveriesCard.tsx` |
| New | `src/components/daily-log/DelaysCard.tsx` |
| New | `src/components/daily-log/PhotosCard.tsx` |
| New | `src/components/daily-log/QuickNotesCard.tsx` |
| DB Migration | Create `daily_logs`, `daily_log_manpower`, `daily_log_delays`, `daily_log_photos`, `daily_log_deliveries` tables |
| Modify | Project page to add Daily Log tab |

