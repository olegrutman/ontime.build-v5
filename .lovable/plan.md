

# Move Contracts After Basics + Live Side-by-Side SOVs During Scope

## What You'll See

**New 5-step flow:**
```text
Step 1: Project Basics + Team
Step 2: Contracts (enter dollar amounts up front — TC sees two inputs)
Step 3: Building Type
Step 4: Scope (split screen: questions left, live dual SOV right — updating as you answer)
Step 5: Review
```

**Step 2 (Contracts):** Simple — enter contract values. No SOV preview here yet because there's no building type or scope to generate from. GC sees one input, TC sees two (GC contract + FC contract).

**Step 4 (Scope):** This is where the magic happens. Split-screen layout:
- **Left side:** Scope questions (structure, roof, envelope, etc.)
- **Right side:** Live SOV preview(s) that build out as you answer each question
  - GC creator: one SOV
  - TC creator: **two SOVs side by side** (GC→TC and TC→FC) with same percentages, different dollar amounts from step 2

The SOVs grow and update in front of your eyes as you toggle floors, basement, roof options, etc.

## Technical Changes

### `src/pages/CreateProjectNew.tsx`
- Reorder steps: basics → contracts → building_type → scope → review
- Update step indices in `canProceed()` and `renderStep()`
- Contracts validation moves to step index 1, building type to index 2, scope to index 3

### `src/components/project-wizard-new/ContractsStep.tsx`
- Remove SOV preview from this step (no building type selected yet)
- Keep just the contract value inputs + material responsibility question
- GC: one input. TC: two inputs side by side

### `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx`
- Add split-screen layout: questions on the left, SOV preview(s) on the right
- Accept `sovLines`, `contractValue`, `fcContractValue`, and `creatorOrgType` as new props
- For TC: render two `SOVLivePreview` components side by side labeled "GC → TC" and "TC → FC"
- For GC: render one `SOVLivePreview`
- On mobile: stack vertically or use tabs

### `src/components/project-wizard-new/UnifiedReviewStep.tsx`
- No structural changes needed — already shows dual SOVs for TC

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | Reorder steps: basics → contracts → building_type → scope → review |
| `src/components/project-wizard-new/ContractsStep.tsx` | Remove SOV preview (not available yet at step 2) |
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Add split-screen with live SOV preview(s); dual side-by-side for TC |

