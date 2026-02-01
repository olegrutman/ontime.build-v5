
# Plan: Replace Role Labels with Company Names on SOV and Invoice Pages

## Problem Summary
Currently, the SOV page and Invoice page display generic role labels like "Trade Contractor Contract with General Contractor" instead of actual company names like "ABC Framing Contract with XYZ Construction". This makes it hard for users to identify which contract/company they're working with.

## Current Behavior

**SOV Page (`ContractSOVEditor.tsx`):**
- SOV name shows as "Trade Contractor Contract with General Contractor"
- Contract list in empty state shows "Trade Contractor Contract with General Contractor"

**Invoice Page:**
- `InvoicesTab.tsx` tab labels show "Sent to GC" and "From Field Crews" instead of actual company names
- Role context messages reference "GC", "TC", "FC" abbreviations
- `CreateInvoiceFromSOV.tsx` contract dropdown shows "[Contract] Trade Contractor Contract with General Contractor"

## Solution

Update the `getContractDisplayName` function and all display logic to use actual organization names when available, falling back to roles only when names aren't present.

---

## Implementation Details

### 1. Update `getContractDisplayName` Function

**File: `src/hooks/useContractSOV.ts`**

Create an enhanced version that accepts organization names:

```typescript
// New signature with optional org names
export function getContractDisplayName(
  fromRole: string, 
  toRole: string,
  fromOrgName?: string | null,
  toOrgName?: string | null
): string {
  const from = fromOrgName || fromRole;
  const to = toOrgName || toRole;
  return `${from} → ${to}`;
}
```

### 2. Update `ProjectContract` Interface

**File: `src/hooks/useContractSOV.ts`**

Add organization name fields to the contract interface:

```typescript
export interface ProjectContract {
  // ... existing fields
  from_org_id?: string | null;
  to_org_id?: string | null;
  from_org_name?: string | null;
  to_org_name?: string | null;
}
```

### 3. Update Contract Query to Include Org Names

**File: `src/hooks/useContractSOV.ts`**

Modify the fetchData query to join organization names:

```typescript
supabase
  .from('project_contracts')
  .select(`
    *,
    from_org:organizations!project_contracts_from_org_id_fkey(name),
    to_org:organizations!project_contracts_to_org_id_fkey(name)
  `)
  .eq('project_id', projectId)
```

Then map the results to include `from_org_name` and `to_org_name`.

### 4. Update SOV Name Generation

**File: `src/hooks/useContractSOV.ts`**

When creating SOVs, use org names:

```typescript
const sovName = getContractDisplayName(
  contract.from_role, 
  contract.to_role,
  contract.from_org_name,
  contract.to_org_name
);
```

### 5. Update ContractSOVEditor Display

**File: `src/components/sov/ContractSOVEditor.tsx`**

Update contract list display to show company names:

```typescript
{contracts.map((c, i) => (
  <div key={c.id}>
    {i + 1}. {getContractDisplayName(c.from_role, c.to_role, c.from_org_name, c.to_org_name)} — {formatCurrency(c.contract_sum)}
  </div>
))}
```

### 6. Update Invoice Contract Dropdown

**File: `src/components/invoices/CreateInvoiceFromSOV.tsx`**

The contract data already has org names from the query. Update the dropdown to use them:

```typescript
<SelectItem key={contract.id} value={contract.id}>
  {typeLabel} {getContractDisplayName(
    contract.from_role, 
    contract.to_role,
    contract.from_org_name,
    contract.to_org_name
  )} — {formatCurrency(contract.contract_sum || 0)}
</SelectItem>
```

### 7. Update InvoicesTab Tab Labels

**File: `src/components/invoices/InvoicesTab.tsx`**

For the TC dual-view tabs, dynamically show the GC company name:

```typescript
// Add query for GC org name from contracts
const gcOrgName = useMemo(() => {
  const gcContract = contracts.find(c => c.to_role === 'General Contractor');
  return gcContract?.to_org_name || 'GC';
}, [contracts]);

// In tab triggers:
<TabsTrigger value="sent">
  <Send className="h-4 w-4" />
  Sent to {gcOrgName}
</TabsTrigger>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useContractSOV.ts` | Update `ProjectContract` interface, modify contract query to include org names, update `getContractDisplayName` signature |
| `src/components/sov/ContractSOVEditor.tsx` | Pass org names to `getContractDisplayName` calls |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Pass org names to `getContractDisplayName` calls |
| `src/components/invoices/InvoicesTab.tsx` | Fetch org names for tab labels, update role context messages |

---

## Visual Changes

**Before (SOV Page):**
```
Trade Contractor Contract with General Contractor — $50,000
```

**After (SOV Page):**
```
ABC Framing → XYZ Construction — $50,000
```

**Before (Invoice Tab - TC View):**
```
Tabs: [Sent to GC] [From Field Crews]
```

**After (Invoice Tab - TC View):**
```
Tabs: [Sent to XYZ Construction] [From Field Crews]
```

**Before (Invoice Creation Dropdown):**
```
[Contract] Trade Contractor Contract with General Contractor — $50,000
```

**After (Invoice Creation Dropdown):**
```
[Contract] ABC Framing → XYZ Construction — $50,000
```

---

## Testing Checklist

1. Navigate to a project's SOV tab
2. Verify SOV names show company names instead of roles
3. Navigate to Invoices tab
4. Verify tab labels show company names (for TC users)
5. Open "Create Invoice" dialog
6. Verify contract dropdown shows company names
7. Test with contracts missing org assignments (should fall back to roles)

