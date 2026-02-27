

# Move TC Labor Tile Below Description

## What Changes
In `ChangeOrderDetailPage.tsx`, move the existing `GCLaborReviewPanel` block (currently at lines 448-454) to render immediately after the combined Header + Scope Card (line 403), so GC users see the labor tile right below the description.

## File: `src/components/change-order-detail/ChangeOrderDetailPage.tsx`

### Move this block:
```tsx
{/* GC Labor Review (fixed price only) - collapsible */}
{(changeOrder as any).pricing_mode !== 'tm' && isGC && tcLabor.length > 0 && (
  <GCLaborReviewPanel
    tcLabor={tcLabor}
    tcCompanyName={participants.find(p => p.role === 'TC' && p.is_active)?.organization?.name}
  />
)}
```

### From: after FC Hours panel (line 448)
### To: immediately after the closing `</Card>` of the Header + Scope card (line 403), before the Rejection Alert

New order in Zone A (main content) for GC users:
1. Header + Scope Card (unchanged)
2. **TC Labor tile** (moved up from below)
3. Rejection Alert
4. T&M Time Cards
5. FC Hours
6. TC Pricing (TC only)
7. Materials (collapsible for GC)
8. Equipment (collapsible for GC)

No other files or components change. The `GCLaborReviewPanel` component itself is already collapsible with the full TC company name.
