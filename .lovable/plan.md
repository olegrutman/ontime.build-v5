

# Professional UI/UX Polish for Project Setup Page

## Issues Found

### Visual & Layout Issues
1. **Inconsistent max-widths**: `ProjectSetupFlow` uses `max-w-5xl`, but inner components use `max-w-[680px]` — creates awkward width mismatches between cards and their content
2. **ProjectInfoCard** is too compact — tiny icon, cramped text, pencil edit icon is hard to hit on mobile
3. **Card headers** use inconsistent spacing — some `px-4 py-3`, content areas have no consistent padding
4. **PhaseContracts** renders its own inner Card inside the parent card — double card nesting
5. **PhaseSOV** also has its own heading + inner layout that clashes with the parent card wrapper
6. **Framing Scope wizard** embedded view has a `max-w-3xl` summary that doesn't match the card width
7. **Locked card states** show a centered Lock icon that feels empty — needs better visual hierarchy
8. **No step numbering** on the setup cards — user has no sense of 1-2-3-4 progression

### Typography & Spacing
9. **Font sizes inconsistent**: Card headers use `text-sm`, subtitles `text-[10px]` — too small on desktop
10. **Contracts card** inner heading ("Contract Setup") is redundant with the card header ("Contracts")
11. **SOV card** inner heading ("Schedule of Values") duplicates the card header
12. **No section spacing rhythm** — `space-y-6` between cards but card internals have different rhythms

### Functional Issues
13. **Console warning**: `DocLine` component receives ref but isn't wrapped in `forwardRef`
14. **Contract inputs** have no column headers (user sees `$` and `%` inputs with no visible labels)
15. **Building Profile section** title shows "0. Building Profile" — the "0." prefix looks unprofessional

### Missing Professional Touches
16. No progress indicator showing overall setup completion (e.g., "Step 2 of 4")
17. No visual connection between cards (timeline/stepper visual)
18. Locked cards have no hover tooltip explaining why they're locked

## Plan

### 1. `ProjectSetupFlow.tsx` — Unified layout with stepper
- Change `max-w-5xl` to `max-w-4xl` for tighter, more focused layout
- Add a vertical stepper/timeline connector between cards (numbered circles with connecting lines)
- Each card gets a step number (1: Project Info, 2: Framing Scope, 3: Contracts, 4: SOV)
- Add overall progress indicator at top: "Project Setup — Step X of 4"
- Consistent card padding and structure

### 2. `ProjectInfoCard.tsx` — Polish
- Larger icon area (12×12 instead of 10×10)
- Bigger project name font (`text-base font-bold`)
- Better inline edit UX with proper input sizing
- Add project type badge chip next to name

### 3. `PhaseContracts.tsx` — Remove redundant wrapper
- Remove the inner `<h2>Contract Setup</h2>` heading (parent card already has it)
- Remove the inner `<Card>` wrapper — render content directly
- Add visible column headers: "Party", "Contract Amount", "Retainage %"
- Add table-style layout with header row
- Improve empty state message

### 4. `PhaseSOV.tsx` — Remove redundant wrapper
- Remove the inner `<h2>Schedule of Values</h2>` heading
- Let content flow directly inside the parent card
- Keep the total contract value display as a subtle badge

### 5. `FramingScopeWizard.tsx` — Embedded mode polish
- Remove `max-w-3xl` constraint on embedded completed view (let it fill the card)
- Ensure padding is consistent with other card contents (`p-5`)

### 6. `BuildingProfileSection.tsx` — Remove "0." prefix
- Change "0. Building Profile" to just "Building Profile"

### 7. `ScopeDocument.tsx` — Fix ref warning
- The `DocLine` function component is being given a ref somewhere — wrap it or remove the ref

## Files Modified
| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Add stepper UI, tighten max-width, add progress header, consistent card structure |
| `ProjectInfoCard.tsx` | Larger icon, better typography, badge for project type |
| `PhaseContracts.tsx` | Remove redundant heading/card, add column headers |
| `PhaseSOV.tsx` | Remove redundant heading |
| `FramingScopeWizard.tsx` | Fix embedded padding consistency |
| `BuildingProfileSection.tsx` | Remove "0." prefix from title |
| `ScopeDocument.tsx` | Fix forwardRef warning on DocLine |

