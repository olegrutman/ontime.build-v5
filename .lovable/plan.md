

# Redesign Framing Scope Page to Match HTML Demo

## What Changes

Restyle the wizard shell (`FramingScopeWizard.tsx`), summary panel (`ScopeSummaryPanel.tsx`), and scope document (`ScopeDocument.tsx`) to match the polished HTML demo layout shown in the screenshot.

## Key Visual Differences to Fix

### 1. Header Bar (top of wizard)
**Current**: No header — just sections inline.
**Target**: A styled header bar showing "Framing Scope — [Project Name]" with subtitle "Rough carpentry · [Building Type] · [Story Count]" and pill badges "X included · Y excluded" (counted from answers).

### 2. Left Navigation — Grouped with Categories
**Current**: Flat list of 11 sections with completion dots.
**Target**: Grouped into labeled categories:
- **SETUP** header above sections 1-2 (Framing method, Building features)
- Sections 3-10 as main scope items (Exterior skin, Openings, Blocking & backing, Fire & smoke sep., Hardware & connectors, Dry-in & protection)
- **SCOPE CLOSEOUT** header above sections 11 + "Scope document"
- Active section gets amber/gold highlight when viewing the scope document
- Green filled dots for completed sections, gray dots for pending

### 3. Scope Document — Prominent Header Card
**Current**: Plain text header with DocLine rows.
**Target**:
- Amber/gold gradient card at top with "Division 06100 — Rough Carpentry Scope of Work", project name, building type, and date
- "COMPLETE: SCOPE DOCUMENT" label above
- Subtitle: "This is your official scope of work document. Review carefully before attaching to a contract or proposal."
- Sections use checkmark icons (✓) for included items with descriptive detail text, not just bare labels
- More comprehensive line items with sub-details (e.g., "Stick-frame labor · Labor only (GC furnishes all materials)")
- Included/excluded counts shown

### 4. Right Summary Panel — Structured Sections
**Current**: Numbered section headers with simple IN/EX badges.
**Target**: Named section groups without numbers:
- **FRAMING METHOD** — key method bullets
- **BUILDING FEATURES** — feature list
- **EXTERIOR SKIN** — sheathing/WRB/fascia items
- **OPENINGS** — window/door modes
- **BLOCKING** — key blocking items
- **FIRE SEPARATION** — fire/smoke items
- Compact bullet-style list (no IN/EX toggle badges, just text items that are included)

## Files Modified

| File | Change |
|------|--------|
| `FramingScopeWizard.tsx` | Add header bar with project info + included/excluded counts; restructure left nav with category groups and "Scope document" nav item; style adjustments |
| `ScopeSummaryPanel.tsx` | Restructure into named category groups; show only included items as bullet lists; remove numbered section headers |
| `ScopeDocument.tsx` | Add amber/gold hero card header; add checkmark icons per line; expand detail text for each item; add included/excluded count badges; improve section formatting |

## Files NOT Changed
- Section components (MethodSection, StructureSection, etc.) — question UI stays the same
- Types, hooks, database — untouched
- Navigation, routing — untouched

