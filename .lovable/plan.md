

# Consolidate Setup into Cards + Expanded Scope Wizard

## What Changes

The current 4-phase wizard (Building → Scope → Contracts → SOV) gets replaced with a **single page layout using cards**:

```text
┌─────────────────────────────────────────────┐
│  PROJECT INFO CARD (read-only summary)      │
│  Name • Type • Address                      │
│  Edit button → inline edit                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  FRAMING SCOPE WIZARD (expandable card)     │
│  Section 0: Building Profile (NEW)          │
│    → stories, foundation, floor/roof system │
│    → garage, features (feeds scope gates)   │
│  Section 1-11: Existing scope sections      │
│    → Method, Structure, Sheathing...        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CONTRACTS CARD                             │
│  Contract sums + retainage per team member  │
│  Unlocks after scope is complete            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  SOV CARD                                   │
│  Auto-generated, review + activate          │
│  Unlocks after contracts saved              │
└─────────────────────────────────────────────┘
```

## Key Design Decisions

### Project Info Card
- Shows project name, type (from `project_profiles.project_type_id`), and address from `projects` table
- Small "Edit" link for inline editing — no wizard step needed
- Always visible at top

### Building Profile Moves INTO Framing Scope
- The physical building questions (project type, stories, units, buildings, foundation, floor system, roof system, garage) become a **new "Building Profile" section at the start** of the FramingScopeWizard — effectively Section 0
- This replaces `PhaseBuilding` entirely — no separate phase
- The building type selection here drives all scope gates (elevator, corridors, etc.)
- Saving building profile also saves to `project_profiles` (same as before)

### Contracts & SOV Stay as Cards
- `PhaseContracts` content renders inside a card on the same page
- `PhaseSOV` content renders inside a card below contracts
- Both show locked/disabled state until prerequisites met

### No More Phase Navigation
- Remove `SetupSidebar` phase-level navigation
- The scope wizard has its own internal section nav (already built)
- The page is a vertical scroll of cards

## Files Modified

| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Replace phase-switching layout with vertical card layout: Info Card → Scope Wizard Card → Contracts Card → SOV Card. Remove phase state machine. |
| `FramingScopeWizard.tsx` | Add Section 0 "Building Profile" that renders the building questions (type, stories, foundation, etc.) before Section 1. Save to `project_profiles`. Update section indexing. |
| `framingScope.ts` (types) | Add `SECTIONS` entry for building profile at index 0 |
| `useFramingScope.ts` | Track building profile completion as part of scope progress |
| `PhaseBuilding.tsx` | Delete or reduce to just the project info card component |
| `SetupSidebar.tsx` | Remove (no longer needed — scope wizard has its own nav) |

## Files NOT Changed
- 11 scope section components — unchanged
- Database schema — unchanged
- PhaseContracts, PhaseSOV — reused as card content
- Hooks, navigation, routing — minimal changes

