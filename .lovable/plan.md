
Fix the leak in two layers: the immediate UI bug that still shows price in the CO add-material flow, and the underlying data-access rules that still let TC read price data even when GC is material-responsible.

1. Confirmed root causes
- The exact leak in your screenshot is in the estimate-based product picker path, not the main CO table gate.
- `COMaterialsPanel` now passes `hidePricing={!showPricingColumns}` correctly to `ProductPickerContent`.
- But `ProductPickerContent -> EstimateSubTabs -> PSMBrowser -> QuantityPanel` drops that prop, so `QuantityPanel` falls back to `hidePricing = false` and still renders the `Line Total`.
- There is also a backend privacy gap:
  - `supplier_estimates` / `supplier_estimate_items` are readable by all project participants, so TC can still fetch estimate `unit_price`.
  - PO visibility is mostly enforced in UI (`usePOPricingVisibility`), but current PO/PO-line-item SELECT policies are still broad enough that creator-org access can expose pricing rows in regular POs.

2. UI fixes
- Thread `hidePricing` all the way through the estimate picker path:
  - `src/components/po-wizard-v2/ProductPicker.tsx`
  - `src/components/po-wizard-v2/EstimateSubTabs.tsx`
  - `src/components/po-wizard-v2/PSMBrowser.tsx`
  - `src/components/po-wizard-v2/QuantityPanel.tsx`
- Ensure the estimate-based quantity screen hides all price-revealing UI for non-responsible TC users:
  - no line total bar
  - no unit-price-derived display
- Re-audit `COMaterialsPanel` table rendering to make sure only non-price fields remain visible for TC when GC is responsible.

3. Responsibility resolution hardening
- Replace the fragile “first non-null contract” lookup with a shared resolver that targets the actual upstream TC↔GC contract.
- Use that same resolver everywhere material responsibility matters so COs and regular POs stay consistent:
  - `src/hooks/useCOResponsibility.ts`
  - `src/components/change-orders/COMaterialsPanel.tsx`
  - `src/components/project/PurchaseOrdersTab.tsx`
  - overview/team-card reads that display responsibility
- This prevents future wrong matches if a downstream FC contract also has responsibility set.

4. Database / RLS hardening
- Lock down raw pricing sources so UI hiding is not the only protection.
- Add a migration to:
  - restrict raw `supplier_estimate_items` price access to the pricing owner and supplier only
  - restrict raw PO pricing fields similarly
- For users who should still see item names/qty but not prices, expose redacted data through security-invoker views instead of direct table reads:
  - estimate-items public view without `unit_price`
  - PO-line-items public view without unit-price / total-price columns
- Update affected UI queries to use the redacted view when the viewer is not the pricing owner.

5. Validation after implementation
- Test as TC on a project where GC is material-responsible:
  - CO materials table: no material prices visible
  - CO add-material sheet, both catalog and estimate/materials paths: no price or line total visible
  - regular PO list/detail: item descriptions and qty allowed if intended, but no raw pricing visible
- Test GC and supplier roles to confirm pricing still appears where it should.
- Verify no regressions for TC-responsible projects.

Technical note
- The current screenshot is explained by the missing `hidePricing` prop propagation.
- The broader security issue is that pricing data is still queryable from the backend tables, so I recommend fixing both in the same pass rather than only patching the visible screen again.
