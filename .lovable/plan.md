
# Plan: Project Overview Enhancements

## Overview
Implement four enhancements to the Project Overview page:
1. Create a new Invoice Summary tile (similar to Work Orders)
2. Make the Project Team tile collapsible
3. Separate Main Contracts from Change Order Contracts
4. Rename "Work Order" to "Change Order" and remove Work Orders column from Change Order contracts

---

## 1. Create InvoiceSummaryCard Component

**New file: `src/components/project/InvoiceSummaryCard.tsx`**

A new tile matching the WorkOrderSummaryCard design that shows:
- Count stats: Draft, Pending Approval, Approved, Paid
- Role-specific financial views:
  - **GC**: Total received invoices pending approval
  - **TC**: Sent vs Received totals (like Work Orders profit view)
  - **FC**: My submitted invoices total

### Data Fetching
```typescript
const { data: invoices } = await supabase
  .from('invoices')
  .select('id, status, total_amount, contract_id')
  .eq('project_id', projectId);
```

### Display Layout
```text
+---------------------------------------------+
|  [Receipt Icon] Invoices                    |
+---------------------------------------------+
|    [2]           [3]           [7]          |
|  Approved      Pending        Total         |
+---------------------------------------------+
|  Total Billed                    $42,151    |
+---------------------------------------------+
```

---

## 2. Make ProjectTeamSection Collapsible

**Modify: `src/components/project/ProjectTeamSection.tsx`**

Use existing Radix Collapsible primitive from `@/components/ui/collapsible`:
- Wrap CardHeader in CollapsibleTrigger
- Wrap CardContent in CollapsibleContent
- Add ChevronDown icon that rotates on expand
- Default state: expanded
- Show team count in header (always visible)

### Implementation Pattern
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const [isOpen, setIsOpen] = useState(true);

return (
  <Card>
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer">
          <div className="flex items-center justify-between">
            <CardTitle>Project Team ({team.length})</CardTitle>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent>{/* team list */}</CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
);
```

---

## 3. Separate Contract Types

**Modify: `src/components/project/ProjectContractsSection.tsx`**

Split contracts into two groups with clear visual separation:

### Separation Logic
```typescript
const isChangeOrderContract = (contract: Contract) => 
  contract.trade === 'Work Order' || contract.trade === 'Work Order Labor';

const mainContracts = contracts.filter(c => !isChangeOrderContract(c));
const changeOrderContracts = contracts.filter(c => isChangeOrderContract(c));
```

### Display Structure
- **Section 1: "Main Contracts"** - Primary project contracts (GC-TC, TC-FC)
- **Section 2: "Change Order Contracts"** - Auto-generated from Change Orders
- Hide sections if empty (no Change Order contracts = no section shown)

---

## 4. Rename Labels and Remove Work Orders Column

**In ProjectContractsSection.tsx:**

### Label Changes
| Current | New |
|---------|-----|
| `trade === 'Work Order'` | Display as "Change Order" |
| `trade === 'Work Order Labor'` | Display as "Change Order Labor" |

### Column Changes for Change Order Contracts
- **Remove** the "Work Orders" column/stat (lines 210-218) from Change Order contracts section
- Main contracts keep all 4 columns: Contract Sum, Work Orders, Invoiced, Retainage
- Change Order contracts show only 3 columns: Contract Sum, Invoiced, Retainage

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/project/InvoiceSummaryCard.tsx` | **NEW** - Invoice summary tile matching WorkOrderSummaryCard design |
| `src/components/project/index.ts` | Export InvoiceSummaryCard |
| `src/pages/ProjectHome.tsx` | Add InvoiceSummaryCard below WorkOrderSummaryCard |
| `src/components/project/ProjectTeamSection.tsx` | Make collapsible with Radix Collapsible |
| `src/components/project/ProjectContractsSection.tsx` | Separate contracts, rename labels, remove Work Orders column from Change Order section |

---

## Updated Layout in ProjectHome.tsx

Left column order:
```text
- WorkOrderSummaryCard
- InvoiceSummaryCard (NEW)
- ProjectTeamSection (collapsible)
- ProjectContractsSection (separated sections)
```

---

## Technical Notes

### InvoiceSummaryCard Role Views
- **GC View**: Shows received invoices count, pending approval count, total amounts received
- **TC View**: Shows sent vs received summary with net position
- **FC View**: Shows "My Invoices" with submitted/approved counts and earnings

### Contract Trade Mapping
```typescript
const formatTrade = (trade: string | null): string => {
  if (trade === 'Work Order') return 'Change Order';
  if (trade === 'Work Order Labor') return 'Change Order Labor';
  return trade || '';
};
```

---

## Testing Checklist

1. Verify InvoiceSummaryCard displays correct counts for each status
2. Verify role-specific views work (GC/TC/FC)
3. Test ProjectTeamSection collapse/expand animation
4. Verify Main Contracts section shows only primary contracts
5. Verify Change Order Contracts section shows only work order contracts
6. Confirm "Work Order" labels now read "Change Order"
7. Confirm Work Orders column is removed from Change Order contracts
8. Test empty state when no Change Order contracts exist
