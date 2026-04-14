

# Three Changes to Wizards

## 1. Location labels: "Inside/Outside" → "Interior/Exterior"

**File**: `src/components/change-orders/VisualLocationPicker.tsx`

Change the two TapCard labels from "Inside"/"Outside" to "Interior"/"Exterior". Also update the assembled tag text that gets saved (lines 125, 144) from `['Inside']`/`['Outside']` to `['Interior']`/`['Exterior']`.

The internal state values (`'inside'`/`'outside'`) stay the same — only the user-facing labels and tag strings change.

## 2. Verify material responsibility is coded correctly

After review, material responsibility is **correctly implemented**:

- **TMWOWizard**: Stores `materials_responsible` and `equipment_responsible` on the `change_orders` row (lines 266-268). Users pick "TC supplies" or "GC supplies" in the Resources step.
- **COWizard**: Same fields stored (lines 292-293), using the `ToggleWithSelector` component.
- **`useCOResponsibility` hook**: Resolves the effective responsibility by checking the CO-level override first, then falling back to the project contract's `material_responsibility` setting. It correctly filters out null contracts (line 32).
- **Project setup (`ContractsStep`)**: Stores the project-level default via `material_responsibility` answer.

No code changes needed here — the logic is sound.

## 3. Add "How" step to the TMWOWizard

The CO wizard has a "How" step (Step 4) with role-specific config:
- **GC**: Assign to TC, pricing type selector, GC budget, materials/equipment toggles, share toggle
- **TC**: Pricing type selector, FC input needed, share toggle
- **FC**: Quick log hours, share toggle

The TMWOWizard currently lacks this step — it hardcodes `pricing_type: 'tm'` and buries materials/FC input into a "Resources" step. The plan is to **replace** the TMWOWizard's "Resources" step with a "How" step that mirrors the CO wizard.

**File**: `src/components/change-orders/wizard/TMWOWizard.tsx`

Changes:
- Rename step 4 from `{ key: 'resources', ... }` to `{ key: 'how', label: 'How', description: 'Pricing & configuration' }`
- Add `pricingType`, `nteCap`, `gcBudget`, `assignedToOrgId` fields to `TMWOData` and `INITIAL_DATA`
- Replace `StepResources` with a new `StepHow` component that renders role-aware config:
  - **GC view**: Assign to TC dropdown, pricing type selector (Fixed/T&M/NTE), GC budget input, materials/equipment toggles, share toggle
  - **TC view**: Pricing type selector, materials/equipment toggles, FC input + crew selector, urgency, share toggle
  - **FC view**: Quick log hours, share toggle
- Update `handleSubmit` to use `data.pricingType` instead of hardcoded `'tm'`, and store `nte_cap` and `gc_budget` from the new fields
- Update `canAdvance` for the `'how'` step: GC must select assignee; NTE must have cap value
- Import `PricingTypeSelector`, `ToggleWithSelector`, `ShareToggle` from COWizard (export them) or duplicate them locally
- Update the step rendering to use `currentStep.key === 'how'`

**File**: `src/components/change-orders/wizard/COWizard.tsx`
- Export `PricingTypeSelector`, `ToggleWithSelector`, `ShareToggle` so TMWOWizard can reuse them (or move to a shared file)

## Technical details

- The `PRICING_OPTIONS` array and shared sub-components (`PricingTypeSelector`, `ToggleWithSelector`, `ShareToggle`) will be extracted from COWizard and shared
- TMWOWizard submit logic (line 259) changes from `pricing_type: 'tm'` to `pricing_type: data.pricingType`
- The `gc_budget` field (line 270) changes from `data.estimatedCost` to `data.gcBudget` for GC role, keeping `estimatedCost` in the review step for non-GC roles
- No database changes required — all fields already exist on the `change_orders` table

