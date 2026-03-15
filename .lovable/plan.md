

# Field Capture Mode — Implementation Plan

## Overview
A mobile-first feature enabling Field Crew (FC) to instantly capture jobsite issues (photo, voice note, location, category) in under 10 seconds. Captures can later be converted into Work Order tasks.

## Database Changes

### 1. New table: `field_captures`
```sql
CREATE TABLE public.field_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  photo_url TEXT,
  video_url TEXT,
  voice_note_url TEXT,
  description TEXT,
  reason_category TEXT CHECK (reason_category IN ('owner_request','blueprint_change','field_conflict','damage_by_others','scope_gap','safety_issue','other')),
  location JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured','converted','archived')),
  converted_work_order_id UUID REFERENCES public.change_order_projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.field_captures ENABLE ROW LEVEL SECURITY;
```

RLS policies: project participants can SELECT; authenticated users can INSERT (own user_id); creator can UPDATE own rows.

### 2. New storage bucket: `field-captures`
For photos, videos, and voice notes. Public bucket with authenticated upload policy (mirrors `daily-log-photos` pattern).

### 3. Enable realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_captures;
```

## Frontend Components

### New directory: `src/components/field-capture/`

| File | Purpose |
|------|---------|
| `FieldCaptureSheet.tsx` | Full-screen bottom sheet / dialog — the main capture UI |
| `CapturePhotoInput.tsx` | Camera-first photo/video capture with large touch target |
| `CaptureVoiceInput.tsx` | Hold-to-record voice note (MediaRecorder API) |
| `CaptureLocationSelect.tsx` | Project structure dropdown (reuses existing project scope data) |
| `CaptureReasonChips.tsx` | Tap-to-select reason category chips |
| `FieldCaptureList.tsx` | List of captures shown in Daily Log timeline and project overview |
| `FieldCaptureCard.tsx` | Individual capture card with "Convert to Task" button |
| `ConvertToTaskDialog.tsx` | Pre-filled wizard to convert capture → Work Order draft |
| `index.ts` | Barrel exports |

### FieldCaptureSheet (Core Capture Screen)
- Opens as a full-screen sheet on mobile, dialog on desktop
- Layout: Camera button (largest element, top), voice record button, quick text input, location dropdown, reason chips
- All large touch targets (min 56px), glove-friendly
- Auto-captures: timestamp, user_id, project_id, GPS (via `navigator.geolocation`), device info (userAgent)
- Save button at bottom — single tap to submit
- On save: upload media to `field-captures` bucket, insert row, close sheet, show success toast

### Voice Notes
- Uses browser MediaRecorder API to record audio
- Hold-to-record UI with visual feedback (pulsing indicator)
- Uploads as `.webm` to storage bucket
- No transcription needed initially (can add later via Lovable AI)

## Entry Points

### 1. Global FAB (Floating Action Button) — Mobile
Add a `+ Capture` FAB to `BottomNav.tsx` when on a project page. Prominent amber button between nav items.

### 2. Project Overview
Add a "Capture Issue" button in the overview tab's urgent tasks area or as a standalone action card.

### 3. Daily Log Tab
Add a "Field Captures" section in `DailyLogPanel.tsx` showing captures for the active date, with a "+ Capture" button.

## Hook: `useFieldCaptures(projectId, date?)`
- Fetches captures filtered by project and optionally by date
- Uses react-query with realtime subscription for live updates
- Provides `createCapture` mutation

## Convert to Task Flow
When user taps "Convert to Task" on a capture card:
1. Open `ConvertToTaskDialog` pre-filled with capture data (description, location, reason, photo)
2. User completes: work type, labor method, hours/price, materials, equipment, duration
3. On save: creates a Work Order (draft) via existing `createChangeOrder` / `createFCWorkOrder` patterns
4. Updates `field_captures.status` → `converted` and sets `converted_work_order_id`

## Feature Gate
Add `'field_capture'` to the feature gate system so it can be toggled per plan.

## Files Modified
- `src/components/layout/BottomNav.tsx` — Add capture FAB on project pages
- `src/components/daily-log/DailyLogPanel.tsx` — Add field captures section
- `src/pages/ProjectHome.tsx` — Add capture button in overview
- `src/components/project/index.ts` — Export new components

## Mobile UX Design
- Camera button: 80px circle, amber background, camera icon
- Voice button: 56px circle, hold-to-record with red pulsing ring
- Reason chips: horizontal scroll, 44px height, single-select
- Location: compact dropdown, pre-selected if only one structure
- Text input: single-line, optional, placeholder "Quick note..."
- Save: full-width 56px button at bottom with safe-area padding
- Entire form fits above the fold on most phones

