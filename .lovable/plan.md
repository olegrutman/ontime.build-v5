

# Improve Contrast: Replace Grey-on-Grey Throughout Overview Page

## Problem

The design tokens use low-contrast greys — `C.faint = '#9AAABB'` for labels/headers and `C.muted = '#5A6A7E'` for secondary text. These are hard to read, especially on the light `#F7F9FC` and `#FFFFFF` backgrounds. Buttons like "Add Member", "Create RFI", toggle labels, table headers, and sub-text all blend in.

## Changes

### File: `src/components/project/GCProjectOverviewContent.tsx`

1. **Darken design tokens**:
   - `faint: '#9AAABB'` → `'#64748B'` (slate-500 — used for table headers, section labels)
   - `muted: '#5A6A7E'` → `'#334155'` (slate-700 — used for body text, button labels, sub-text)

2. **Darken action buttons** — The "Add Member", "Create PO", "Create CO", "Create RFI", "View All" buttons use `color: C.muted` which was too light. With the updated `C.muted` they will automatically be more readable.

3. **Material responsibility buttons** — Already use `color: C.ink` so they're fine. The "Who handles materials?" label uses `C.ink` too — no change needed.

4. **Team card role abbreviations** — Currently `color: C.muted`, will get darker automatically.

5. **KPI card label** ("OWNER BUDGET", "TC CONTRACT", etc.) — Uses `C.faint`, will become more readable.

6. **Table headers** (THead) — Uses `C.faint`, will become more readable.

7. **"Expand for detail" footer** — Uses `C.muted`, will become more readable.

This is a two-line token change that fixes contrast across all cards, tables, buttons, and labels simultaneously.

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Update `faint` and `muted` color tokens for better contrast |

