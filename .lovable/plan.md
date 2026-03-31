

# Use Full Company Names Instead of GC/TC/FC on Overview Page

## Problem
Three overview cards use abbreviations like "GC → You (TC)", "FC Contract", "GC Profit" instead of actual company names. Per the project's naming convention, company names should be the primary identifier with role labels as secondary badges only.

## Changes

### 1. `OverviewContractsSection.tsx`
- Replace hardcoded labels like `'GC → You (TC)'`, `'You (GC) → TC'`, `'You (TC) → FC'` with actual org names from `upstreamContract.from_org_name` / `to_org_name`
- Format: `"Acme Builders → Your Company"` with a small role badge `(GC)` / `(TC)` / `(FC)` as secondary text
- Keep fallbacks like `'General Contractor'` only when org name is truly null

### 2. `OverviewProfitCard.tsx`
- Replace `'GC Profit'` → use actual org context, e.g. just `'Profit'` or `'Your Profit'`
- Replace `'FC Contract'` row label → use the actual FC org name from `downstreamContract.to_org_name` (e.g. `"Smith Crew Contract"`)
- Replace `'FC Profit'` → `'Your Profit'`

### 3. `OverviewTeamCard.tsx`
- The `ROLE_SHORT` map already shows abbreviations as secondary badges — this is fine
- Update the materials line: instead of showing `(TC)` or `(GC)` as the parenthetical, show the full role name or just rely on the org name which is already displayed

## Files Modified
| File | Change |
|------|--------|
| `OverviewContractsSection.tsx` | Replace abbreviated labels with real org names + role badge |
| `OverviewProfitCard.tsx` | Replace GC/TC/FC prefixed labels with org names or generic "Your Profit" |
| `OverviewTeamCard.tsx` | Minor — update materials parenthetical to use full role name |

