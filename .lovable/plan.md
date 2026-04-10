

# Replace Generic Role Labels with Company Names and "Your/My" on Overview Pages

## Concept
Instead of "General Contractor", "Trade Contractor", "Field Crew" — use the actual company names from contract data. For the viewer's own metrics, use "Your" or "My".

## Data Already Available
- **GC Overview**: `tcName` = TC company name (from `upstreamContract`), `gcName` = viewer's own org
- **TC Overview**: `gcName` = GC company name (from `upstreamContract`), `fcName` = FC company name (from `downstreamContract`), `userOrgRoles[0]?.organization?.name` = viewer's own org
- **FC Overview**: `tcName` = TC company name (from contract), viewer's own org from `userOrgRoles`

## Changes by File

### 1. `GCProjectOverviewContent.tsx`
- Add `const myOrgName = userOrgRoles[0]?.organization?.name || 'Your Company';`
- **Card 2 label**: `"TC CONTRACT"` → `"{tcName} Contract"` (shows actual TC company name)
- **Card 2 sub**: `"TC margin"` → `"Your margin"`
- **Card 3 label**: `"GC MARGIN"` → `"YOUR MARGIN"`
- **Margin table rows**: `"TC Contract"` → `tcName`, `"GC Gross Margin"` → `"Your Gross Margin"`, `"Net GC Margin"` → `"Your Net Margin"`, `"CO Cost (to TC)"` → `"CO Cost (to {tcName})"`
- **Team card sub**: `"Materials: General Contractor"` → `"Materials: {myOrgName}"` or keep if TC

### 2. `TCProjectOverview.tsx`
- **Header button**: `"Submit Invoice to General Contractor"` → `"Submit Invoice to {gcName}"`
- **Header button**: `"View General Contractor Contract"` → `"View {gcName} Contract"`
- **Card 1 label**: `"GENERAL CONTRACTOR CONTRACT (WHAT YOU EARN)"` → `"{gcName} CONTRACT (YOUR REVENUE)"`
- **Card 1 rows**: `"Contract Value (set by General Contractor)"` → `"Contract Value (set by {gcName})"`, `"Received from General Contractor"` → `"Received from {gcName}"`, `"Pending from General Contractor"` → `"Pending from {gcName}"`
- **Card 1 info**: `"set by your GC"` → `"set by {gcName}"`
- **Card 2 label**: `"FIELD CREW CONTRACT (YOU SET THIS)"` → `"{fcName || 'Field Crew'} CONTRACT (YOU SET THIS)"`
- **Card 2 margin rows**: `"General Contractor Contract (your revenue)"` → `"{gcName} (your revenue)"`, `"Field Crew Contract (your cost)"` → `"{fcName} (your cost)"`, `"Trade Contractor Gross Margin"` → `"Your Gross Margin"`, `"Trade Contractor Margin %"` → `"Your Margin %"`, `"Net Trade Contractor Margin after COs"` → `"Your Net Margin after COs"`
- **Card 3 label**: `"TRADE CONTRACTOR GROSS MARGIN"` → `"YOUR GROSS MARGIN"`
- **Card 3 rows**: `"General Contractor Contract"` → `gcName`, `"Field Crew Contract"` → `fcName`, `"Net Trade Contractor Margin"` → `"Your Net Margin"`
- **Card 5 label**: `"RECEIVED FROM GENERAL CONTRACTOR"` → `"RECEIVED FROM {gcName}"`
- **Card 6 label**: `"PENDING FROM GENERAL CONTRACTOR"` → `"PENDING FROM {gcName}"`, pills/sub similarly
- **Card 7**: `"PAID TO FIELD CREW"` → `"PAID TO {fcName}"`
- **Card 8**: `"PENDING — YOU OWE FIELD CREW"` → `"PENDING — YOU OWE {fcName}"`
- **Cash Flow Ladder**: Already uses `gcName`/`fcName` for company names, keep role labels as secondary subtitle
- **Warnings**: `"Invoice Awaiting General Contractor Approval"` → `"Invoice Awaiting {gcName} Approval"`, `"Chasing General Contractor"` → `"Chasing {gcName}"`, `"Field Crew Invoice Awaiting Your Approval"` → `"{fcName} Invoice Awaiting Your Approval"`, `"You owe Field Crew"` → `"You owe {fcName}"`, `"General Contractor waiting on answers"` → `"{gcName} waiting on answers"`

### 3. `FCProjectOverview.tsx`
- **Header sub**: `"Field Crew · {tcName}"` → `"Your overview · {tcName}"`
- **Header button**: `"Submit Invoice to TC"` → `"Submit Invoice to {tcName}"`
- **Card 1 label**: `"MY CONTRACT"` → stays (already good)
- **Card 1 rows**: `"Contract Value (set by TC)"` → `"Contract Value (set by {tcName})"`
- **Card 1 info**: `"Contact your TC"` → `"Contact {tcName}"`
- **Card 3 sub**: `"approved by TC and GC"` → `"approved"`
- **Card 4 label**: `"PAID BY TC"` → `"PAID BY {tcName}"`
- **Card 5 label**: `"PENDING FROM TC"` → `"PENDING FROM {tcName}"`, sub/pills: `"TC reviewing"` → `"{tcName} reviewing"`, `"Pending TC Approval"` → `"Pending {tcName} Approval"`, `"Your TC is reviewing"` → `"{tcName} is reviewing"`
- **Card 6 button**: `"+ Submit CO Request to TC"` → `"+ Submit CO Request to {tcName}"`
- **Warnings**: `"INV Awaiting TC Approval"` → `"Invoice Awaiting {tcName} Approval"`

| # | File | Scope |
|---|------|-------|
| 1 | `GCProjectOverviewContent.tsx` | ~15 label replacements using `tcName` and "Your" |
| 2 | `TCProjectOverview.tsx` | ~30 label replacements using `gcName`, `fcName`, and "Your" |
| 3 | `FCProjectOverview.tsx` | ~12 label replacements using `tcName` and "Your" |

