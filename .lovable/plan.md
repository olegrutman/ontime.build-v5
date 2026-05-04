
## Analysis: "Go to Full Review" Click Path

When the user clicks **"Go to Full Review"** from Step 3 (Pricing & Routing), the handler dispatches `SET_STEP` with `step: 4`, which renders `StepReview`. The navigation itself works correctly. However, there are several stale references from the old 9-step wizard that cause UI inconsistencies:

### Bugs Found

1. **StepReview header says "Step 9 of 9"** (line 26) — should say "Step 4 of 4"

2. **Mobile bottom bar says "Step X of 9"** (PickerShell.tsx line 589) — should say "of 4"

3. **Mobile submit button checks `state.step === 9`** (line 600) — should check `state.step === 4`, meaning the Submit button **never appears on mobile** at the review step. Users see "Next →" instead, which does nothing since `handleNext` caps at step 4.

4. **Item context strip checks `state.step < 9`** (line 554) — should check `state.step < 4`, currently shows on review step when it shouldn't.

5. **PickerAside submit logic** — needs to be checked for the same `step === 9` gate.

### Proposed Fix (5 lines changed)

| File | Line | Change |
|------|------|--------|
| `StepReview.tsx` | 26 | "Step 9 of 9" → "Step 4 of 4" |
| `PickerShell.tsx` | 554 | `state.step < 9` → `state.step < 4` |
| `PickerShell.tsx` | 589 | "of 9" → "of 4" |
| `PickerShell.tsx` | 600 | `state.step === 9` → `state.step === 4` |
| `PickerAside.tsx` | Check for similar step === 9 references |

### Impact

- **Critical on mobile**: Submit button is unreachable — users cannot submit a CO/WO from the review step on mobile devices.
- **Cosmetic on desktop**: Wrong step indicator text.
