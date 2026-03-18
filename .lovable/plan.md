
Goal: verify and fix why FC users still report (1) unable to save labor pricing and (2) pricing visibility leakage.

What I found from code + backend checks
- FC pricing leakage is still present in `COMaterialsPanel.tsx` (not just equipment):
  - it uses `!isGC` to show unit cost and totals, which includes FC users.
- `COEquipmentPanel.tsx` already has FC guards, but correctness depends on `isFC` being resolved correctly.
- `CODetailPage.tsx` still derives write org context from `userOrgRoles[0]`, which is fragile for multi-org users and can cause wrong `org_id` on insert.
- Backend data shows FC inserts are possible (recent FC lump-sum rows exist), so this is likely a context/UX mismatch rather than a hard backend block in all cases.

Implementation plan
1) Make viewer context CO-specific in `CODetailPage.tsx`
- Resolve the active membership for the current CO:
  - prefer role whose `organization_id === co.assigned_to_org_id`
  - else `organization_id === co.org_id`
  - else fallback to first role.
- Derive `isFC/isTC/isGC` and `myOrgId` from this resolved membership (not global first role).
- Pass this resolved `myOrgId` consistently to labor row/forms (and panel actions that write rows).

2) Fully hide FC pricing in materials UI (`COMaterialsPanel.tsx`)
- Replace `!isGC` checks with role-appropriate checks:
  - FC sees description/qty/UOM only.
  - hide Unit Cost, Markup, Billed/Amount, Cost/Markup/Total footer.
- Keep TC/GC behavior intact.

3) Re-check equipment privacy (`COEquipmentPanel.tsx`)
- Keep current FC guards, but align with the new CO-specific role context from step 1.
- Ensure no billed/cost/markup/footer totals render for FC in any branch.

4) Fix “can’t save” UX in labor entry (`LaborEntryForm.tsx`)
- Add explicit validation for hourly mode (`hours > 0` and `rate > 0`) and clear helper/error messaging.
- Add visible toast/error feedback in catch block (not console-only) so failed saves aren’t silent.
- Keep generated `line_total` omitted (DB computes it).

5) Verification checklist (end-to-end)
- Login as FC assigned org on shared CO:
  - confirm no materials/equipment pricing appears anywhere.
  - add lump sum labor entry: row persists and appears under FC entries.
  - add hourly labor entry with valid rate: persists.
  - try hourly with missing rate: blocked with clear message.
- Login as TC:
  - confirm TC still sees cost/markup/billed and can edit own sections.
- Confirm no regression on combined CO detail rendering.

Technical details
- No database migration required for this pass.
- Main files to update:
  - `src/components/change-orders/CODetailPage.tsx`
  - `src/components/change-orders/COMaterialsPanel.tsx`
  - `src/components/change-orders/COEquipmentPanel.tsx`
  - `src/components/change-orders/LaborEntryForm.tsx`
