

# Full CO System Bug Report & Fix Plan

## Bugs Found

### Bug 1 (CRITICAL): CO Invoice Creation Shows ALL Approved COs — No Org Filtering

**File:** `src/components/invoices/CreateInvoiceFromCOs.tsx` lines 67-72

The query fetches ALL approved/contracted COs on the project with zero org filtering:
```ts
.from('change_orders')
.select('id, title, co_number, location_tag, reason, pricing_type')
.eq('project_id', projectId)
.in('status', ['approved', 'contracted'])
```

This means:
- **TC sees GC-created COs** they shouldn't invoice for
- **FC sees all COs** including ones they have no involvement in
- A TC could accidentally invoice for a CO that belongs to a different TC

**Fix:** Filter COs based on role:
- TC should only see COs where `assigned_to_org_id = currentOrgId` (COs assigned to them)
- FC should only see COs where they are a collaborator
- GC should not be creating invoices from COs at all (they receive invoices)

### Bug 2 (CRITICAL): CO Invoice Generates Line Items for ALL Labor — No Role Filtering

**File:** `src/components/invoices/CreateInvoiceFromCOs.tsx` lines 118-158

When generating invoice line items, the code fetches ALL labor entries for selected COs with `is_actual_cost = false` but does NOT filter by `entered_by_role`. This means:
- A TC creating an invoice will include FC's labor entries as line items, double-billing
- The TC's invoice to GC should only include TC labor entries (or the TC's submitted price)
- An FC creating an invoice to TC should only include FC labor entries

**Fix:** Filter labor entries by the invoicing org's role:
- TC invoicing GC: only include `entered_by_role = 'TC'` labor
- FC invoicing TC: only include `entered_by_role = 'FC'` labor

### Bug 3 (MEDIUM): CO Detail — "Created by" Still Shows Role Code Instead of Org Name

**File:** `src/components/change-orders/CODetailPage.tsx` line 539

```tsx
<DetailRow label="Created by" value={co.created_by_role} />
```

Shows "GC", "TC", or "FC" instead of the actual company name. Should use `coOwnerOrgName`.

### Bug 4 (MEDIUM): CO Detail — "Current role" Sidebar Shows Raw Role Code

**File:** `src/components/change-orders/CODetailPage.tsx` line 415

```tsx
<p className="text-sm font-semibold text-foreground">{role}</p>
```

Shows "GC", "TC", or "FC". Should show `myOrgName`.

### Bug 5 (LOW): StepConfig Fetches from Wrong Table

**File:** `src/components/change-orders/wizard/StepConfig.tsx` line 66

The wizard fetches team members from `project_team` table with `status = 'Accepted'`, but the actual project members are in `project_participants` with `invite_status = 'ACCEPTED'`. If `project_team` is a legacy/empty table, TC and FC dropdowns would be empty, preventing CO creation.

Looking at the network data showing FC members returned from `project_participants`, this is likely a bug that makes the TC/FC dropdowns empty in some cases.

### Bug 6 (MEDIUM): FC Wizard Config Incorrectly Uses `assignedToOrgId` for FC Dropdown

**File:** `src/components/change-orders/wizard/StepConfig.tsx` line 266

In the TC config section, the FC dropdown writes to `data.assignedToOrgId`:
```tsx
<Select
  value={data.assignedToOrgId}
  onValueChange={(v) => onChange({ assignedToOrgId: v })}
>
```

But `assignedToOrgId` is used for the TC assignment (from GC). When TC selects an FC here, it overwrites the assignment field, which the wizard then uses as `assigned_to_org_id` on the CO. The FC should be added as a collaborator, not as the assigned party.

### Bug 7 (LOW): TC Wizard Config Shows "Share immediately" But TC-Created COs Share With Whom?

When a TC creates a CO, the `shareDraftNow` toggle says "Share immediately" but there's no assigned party (no GC org ID set). The wizard creates the CO with `assigned_to_org_id: data.assignedToOrgId || null`, which would be the FC org if selected in bug 6, or null. Sharing a CO with no assigned party would fail silently or share to the wrong org.

### Bug 8 (LOW): CO Invoice Doesn't Check `completion_acknowledged_at` Before Allowing Creation

The CO lifecycle requires GC to acknowledge completion before TC can invoice. But `CreateInvoiceFromCOs` only checks for `approved`/`contracted` status — it doesn't verify `completion_acknowledged_at` is set.

## Fix Plan

### File: `src/components/invoices/CreateInvoiceFromCOs.tsx`
1. **Add org-based filtering** to the approved COs query:
   - Add `.or(`org_id.eq.${currentOrgId},assigned_to_org_id.eq.${currentOrgId}`)` 
   - Then client-side filter: TC only sees COs where `assigned_to_org_id === currentOrgId`
   - Also fetch `org_id, assigned_to_org_id` in the select
2. **Filter labor entries by role** when generating line items:
   - Determine the invoicing role from org type
   - TC: filter `entered_by_role = 'TC'` 
   - FC: filter `entered_by_role = 'FC'`
3. **Check `completion_acknowledged_at`** — only show COs where it's set (for TC invoicing)

### File: `src/components/change-orders/CODetailPage.tsx`
4. Line 415: Replace `{role}` with `{myOrgName}`
5. Line 539: Replace `co.created_by_role` with `coOwnerOrgName ?? co.created_by_role`

### File: `src/components/change-orders/wizard/StepConfig.tsx`
6. **Fix FC assignment** in TC config: Use a separate field or add FC as collaborator after creation instead of overwriting `assignedToOrgId`
7. **Fix data source**: Change `project_team` query to use `project_participants` table with `invite_status = 'ACCEPTED'`

## Priority

| Bug | Severity | File |
|-----|----------|------|
| #1 CO Invoice shows all COs | CRITICAL | CreateInvoiceFromCOs.tsx |
| #2 CO Invoice includes wrong labor | CRITICAL | CreateInvoiceFromCOs.tsx |
| #3 "Created by" shows role code | MEDIUM | CODetailPage.tsx |
| #4 "Current role" shows role code | MEDIUM | CODetailPage.tsx |
| #5 Wrong table for team members | MEDIUM | StepConfig.tsx |
| #6 FC overwrites assignedToOrgId | MEDIUM | StepConfig.tsx |
| #7 TC share target unclear | LOW | StepConfig.tsx |
| #8 No completion_acknowledged check | LOW | CreateInvoiceFromCOs.tsx |

