

## Plan — strip cards down to only what they're about

### Card 1 — General Contractor Revenue (TC dashboard)
- 2 columns: **Project | Contract Value**
- Drop Collected, % Collected, and totals beyond contract sum.
- Total row: total contract value only.

### Card 2 — Field Crew / Labor Cost
- 2 columns: **Project | Contract Cost**
- Drop Paid to Date, Pending.
- Total row: total FC cost only.

### Card 3 — Gross Margin
- 3 columns: **Project | Gross Margin | Margin %**
- Drop the GC Contract and FC Contract breakdown columns (still computed internally for the math).
- Total row: total margin + overall %.

### Cards 4–8 — stack doc# + project in one cell, drop the Project column

Use a small helper rendering:
```
<TdN>
  <div>{co.title}</div>
  <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:2 }}>{co.projectName}</div>
</TdN>
```

Per card:
- **Card 4 Change Orders:** `CO | Status | View →` (3 cols). CO# on top, project under.
- **Card 5 Received from GC:** `Project (with collected $ under name) | Contract | Paid | % | Pending` — actually here keep Project as primary; just remove the redundant "GC Contract" if user wants tighter. Keeping as-is unless you say otherwise — this card *is* about per-project collection so all columns are relevant. Will tighten to: `Project | Paid | % | Pending` (drop Contract column since it's already in Card 1).
- **Card 6 Pending from GC:** `Invoice | Amount | Status` (3 cols). Invoice# on top, project under.
- **Card 7 Materials POs:** Already groups by project in headers. Inside each group: `PO | Amount | Status` — already correct, no change.
- **Card 8 Needs Attention:** `Item | Type | View →` (3 cols). Item title on top, project under.

### Files
- `src/components/dashboard/TCDashboardView.tsx` — only file changed.

### Verification
- Cards 1, 2 show 2 columns; Card 3 shows 3.
- Cards 4, 6, 8 show 3 columns with doc# on top of project name in the first cell.
- Card 5 trimmed to 4 columns (Contract column removed).
- Card 7 unchanged (already grouped by project).
- Empty states still render.
- Totals update correctly.

