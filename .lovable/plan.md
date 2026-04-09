

# Split Scope & Contracts + Dual SOV for Trade Contractors

## What This Does

Today the wizard has one "Scope & Contract" step that mixes scope questions with the contract value. This change:

1. **Separates Scope from Contracts** — scope questions become their own step (just building questions, no money). Contracts become a dedicated step where you enter dollar amounts.

2. **TC gets two contracts** — When a Trade Contractor creates a project, they enter:
   - **GC contract sum** (what the GC pays the TC — upstream)
   - **FC contract sum** (what the TC pays the FC — downstream)

3. **Two SOVs with identical percentages but different prices** — The wizard generates one percentage breakdown, then creates two SOV records:
   - GC → TC SOV at the GC contract price
   - TC → FC SOV at the FC contract price
   - Same line items, same percentages, different dollar values

4. **GC gets one contract** — GC creators only see one contract input (their TC contract), one SOV — same as today.

## New 5-Step Wizard Flow

```text
Step 1: Project Basics + Team
Step 2: Building Type
Step 3: Scope (questions only — structure, roof, envelope, backout, exterior)
Step 4: Contracts (GC sees 1 input, TC sees 2 inputs + dual SOV preview)
Step 5: Review (summary of everything including both SOVs for TC)
```

## Technical Changes

### 1. `src/pages/CreateProjectNew.tsx`
- Update `UNIFIED_STEPS` from 4 to 5 steps: basics → building_type → scope → contracts → review
- Step 3 (scope) renders `ScopeQuestionsPanel` without the contract value question or SOV preview — just the scope questions
- Step 4 (contracts) renders a new `ContractsStep` component
- Adjust step indices and `canProceed` validation

### 2. New: `src/components/project-wizard-new/ContractsStep.tsx`
- If creator is **GC**: single card — "Contract Value" input + SOV live preview (same as current behavior)
- If creator is **TC**: two cards side by side (or stacked on mobile):
  - **GC Contract** card — "What is the GC paying you?" input
  - **FC Contract** card — "What are you paying your FC?" input
  - Below both: dual SOV preview showing both sets of dollar amounts with the same percentage column
- Material responsibility question moves here (it's contract-related, not scope)

### 3. `src/hooks/useSetupWizardV2.ts`
- Add `fc_contract_value` to answers (alongside existing `contract_value` which becomes the GC contract value)
- `sovLines` stays as-is (percentages only change based on scope answers)
- Add a helper `getSovLinesForValue(contractValue: number)` that applies percentages to any dollar amount
- Update `saveAll` to:
  - If TC: create **two** `project_contracts` rows (one GC→TC, one TC→FC) and **two** `project_sov` + `project_sov_items` sets
  - If GC: create one contract + one SOV (current behavior)

### 4. `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx`
- Remove SOV preview from this component (it moves to the Contracts step)
- Component becomes a pure question panel — no split layout needed, just the grouped questions

### 5. `src/components/project-wizard-new/UnifiedReviewStep.tsx`
- If TC: show both contracts and both SOV summaries in the review
- If GC: show single contract + SOV (current behavior)

| File | Change |
|------|--------|
| `src/pages/CreateProjectNew.tsx` | 5-step flow; scope and contracts are separate steps |
| `src/components/project-wizard-new/ContractsStep.tsx` | New component — contract value inputs + SOV preview; TC sees dual inputs |
| `src/hooks/useSetupWizardV2.ts` | Add `fc_contract_value`; dual contract/SOV save logic for TC |
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Remove SOV preview; pure question panel |
| `src/components/project-wizard-new/UnifiedReviewStep.tsx` | Show dual contracts/SOVs for TC creators |

