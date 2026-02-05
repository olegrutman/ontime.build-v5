
# Plan: Supplier Project Overview - PO-Based Financial Tracking

## Summary

Customize the Supplier Project Overview to:
1. Replace "Contracts" with "Finalized POs" (these ARE the supplier's contracts)
2. Create a PO summary tile showing POs needing attention (awaiting pricing, ready to ship)
3. Track financials: Total Finalized POs → Invoiced → Paid
4. Enable PO → Invoice conversion workflow
5. Remove SOV and Work Orders tabs for suppliers

---

## Business Logic

```text
PO Lifecycle for Supplier:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  SUBMITTED  │ →  │   PRICED    │ →  │  FINALIZED  │ →  │  DELIVERED  │
│(Need to add │    │(Awaiting    │    │(=CONTRACT)  │    │             │
│  pricing)   │    │ approval)   │    │Can invoice  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              ↓
                                      ┌─────────────┐    ┌─────────────┐
                                      │   INVOICE   │ →  │    PAID     │
                                      │  Created    │    │             │
                                      └─────────────┘    └─────────────┘
```

**Key Concept**: FINALIZED PO = Supplier Contract
- Total of all FINALIZED POs = Total Contract Value
- Supplier creates invoices FROM finalized POs
- Track: Invoiced vs Paid amounts

---

## Database Changes

### 1. Add `po_id` to invoices table

Add a new column to link invoices directly to POs for suppliers:

```sql
ALTER TABLE public.invoices 
ADD COLUMN po_id UUID REFERENCES public.purchase_orders(id);

-- Index for faster lookups
CREATE INDEX idx_invoices_po_id ON public.invoices(po_id);
```

This allows suppliers to create invoices directly from POs without needing an SOV.

---

## Component Changes

### File 1: `src/components/project/ProjectTopBar.tsx`

Add `isSupplier` prop to conditionally show/hide tabs:

```tsx
interface ProjectTopBarProps {
  projectName: string;
  projectStatus: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onStatusChange?: (status: string) => void;
  isSupplier?: boolean;  // NEW
}

// In render - hide SOV, Work Orders for suppliers:
{!isSupplier && <TabsTrigger value="sov">SOV</TabsTrigger>}
{!isSupplier && <TabsTrigger value="work-orders">Work Orders</TabsTrigger>}
{isSupplier && <TabsTrigger value="estimates">Estimates</TabsTrigger>}
```

**Supplier Tabs**: Overview | Estimates | Invoices | POs

---

### File 2: `src/components/project/SupplierContractsSection.tsx` (NEW)

Replaces "Contracts" in Project Details. Shows finalized POs as supplier contracts.

```tsx
interface SupplierContractsSectionProps {
  projectId: string;
  supplierId: string;
}

export function SupplierContractsSection({ projectId, supplierId }) {
  // Query: Finalized POs for this project & supplier
  const { data: pos } = useQuery({
    queryKey: ['supplier-contracts', projectId, supplierId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, po_name, status, finalized_at, line_items:po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId)
        .in('status', ['FINALIZED', 'DELIVERED']);
      return data;
    }
  });

  const totalContractValue = pos?.reduce((sum, po) => {
    const poTotal = po.line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
    return sum + poTotal;
  }, 0) || 0;

  return (
    <Card className="overflow-hidden">
      <Collapsible>
        <CollapsibleTrigger>
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              My Orders (Contracts)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {pos?.length || 0} finalized • {formatCurrency(totalContractValue)}
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2">
            {pos?.map(po => (
              <div key={po.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{po.po_number}</p>
                  <p className="text-xs text-muted-foreground">{po.po_name}</p>
                </div>
                <span className="font-mono text-sm">
                  {formatCurrency(po.line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0)}
                </span>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

---

### File 3: `src/components/project/SupplierPOSummaryCard.tsx` (NEW)

Shows POs needing immediate attention in "Needs Attention" section.

```tsx
export function SupplierPOSummaryCard({ projectId, supplierId }) {
  // Query POs grouped by status
  const { data: statusCounts } = useQuery({
    queryKey: ['supplier-po-status', projectId, supplierId],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId);
      
      return {
        awaiting_pricing: data?.filter(p => p.status === 'SUBMITTED').length || 0,
        priced: data?.filter(p => p.status === 'PRICED').length || 0,
        finalized: data?.filter(p => p.status === 'FINALIZED').length || 0,
        ready_for_delivery: data?.filter(p => p.status === 'READY_FOR_DELIVERY').length || 0,
        delivered: data?.filter(p => p.status === 'DELIVERED').length || 0,
      };
    }
  });

  const urgentCount = statusCounts?.awaiting_pricing || 0;

  return (
    <Card className={cn("h-full flex flex-col", urgentCount > 0 && "border-amber-500/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Purchase Orders
          </div>
          {urgentCount > 0 && (
            <Badge variant="destructive">{urgentCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{urgentCount} need pricing</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">{statusCounts?.finalized || 0} finalized</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Truck className="h-4 w-4" />
          <span className="text-sm">{statusCounts?.delivered || 0} delivered</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### File 4: `src/components/project/SupplierFinancialsSummaryCard.tsx` (NEW)

Financial snapshot for suppliers: Contract Value → Invoiced → Paid.

```tsx
export function SupplierFinancialsSummaryCard({ projectId, supplierId }) {
  const { data } = useQuery({
    queryKey: ['supplier-financials', projectId, supplierId],
    queryFn: async () => {
      // Get total from finalized POs (= contract value)
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, po_line_items(line_total)')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId)
        .in('status', ['FINALIZED', 'DELIVERED']);
      
      const totalContract = pos?.reduce((sum, po) => {
        return sum + (po.po_line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0);
      }, 0) || 0;

      // Get invoiced amounts (linked to these POs)
      const poIds = pos?.map(p => p.id) || [];
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, po_id')
        .in('po_id', poIds);

      const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const totalPaid = invoices?.filter(i => i.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      return { totalContract, totalInvoiced, totalPaid };
    }
  });

  const outstanding = (data?.totalInvoiced || 0) - (data?.totalPaid || 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-green-600" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Order Value</span>
          <span className="font-semibold">{formatCurrency(data?.totalContract || 0)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Invoiced</span>
          <span className="font-medium">{formatCurrency(data?.totalInvoiced || 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Paid</span>
          <span className="font-medium text-green-600">{formatCurrency(data?.totalPaid || 0)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Outstanding</span>
          <span className={cn(
            "font-bold",
            outstanding > 0 ? "text-amber-600" : "text-green-600"
          )}>
            {formatCurrency(outstanding)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### File 5: `src/components/project/SupplierEstimatesSection.tsx` (NEW)

Shows estimates for Project Details section (replaces Contracts).

```tsx
export function SupplierEstimatesSection({ projectId, supplierId }) {
  const { data: estimates } = useQuery({...});
  
  return (
    <Card className="overflow-hidden">
      <Collapsible>
        <CollapsibleTrigger>
          <CardHeader className="bg-muted/30">
            <CardTitle>My Estimates</CardTitle>
            <p className="text-xs text-muted-foreground">
              {estimates?.length || 0} estimates
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {estimates?.map(e => <EstimateRow key={e.id} ... />)}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

---

### File 6: `src/pages/ProjectHome.tsx`

Update to detect supplier role and render supplier-specific components.

**Key Changes:**
1. Detect if current org is a supplier
2. Pass `isSupplier` to `ProjectTopBar`
3. Conditionally render sections

```tsx
export default function ProjectHome() {
  const { userOrgRoles } = useAuth();
  
  // Detect if current org is a supplier
  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';
  const supplierId = /* get supplier_id from suppliers table where org_id matches */;

  return (
    // ...
    <ProjectTopBar
      projectName={project.name}
      projectStatus={projectStatus}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onStatusChange={handleStatusChange}
      isSupplier={isSupplier}
    />

    {/* Overview Tab */}
    {activeTab === 'overview' && (
      <div className="space-y-8">
        {/* Section 1: Project Details */}
        <section>
          <h2>Project Details</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <ProjectTeamSection projectId={id!} />
            {isSupplier ? (
              <SupplierContractsSection projectId={id!} supplierId={supplierId} />
            ) : (
              <ProjectContractsSection projectId={id!} />
            )}
            <ProjectScopeSection projectId={id!} projectType={project.project_type} />
          </div>
        </section>

        {/* Section 2: Needs Attention */}
        <section>
          <h2>Needs Attention</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {isSupplier ? (
              <>
                <SupplierPOSummaryCard projectId={id!} supplierId={supplierId} />
                <InvoiceSummaryCard projectId={id!} />
                <SupplierFinancialsSummaryCard projectId={id!} supplierId={supplierId} />
              </>
            ) : (
              <>
                <WorkOrderSummaryCard projectId={id!} />
                <InvoiceSummaryCard projectId={id!} />
                <POSummaryCard projectId={id!} />
              </>
            )}
          </div>
        </section>

        {/* Section 3: Financial Snapshot - hide for suppliers (already shown above) */}
        {!isSupplier && (
          <section>
            <h2>Financial Snapshot</h2>
            <ProjectFinancialsSectionNew projectId={id!} />
          </section>
        )}
      </div>
    )}
  );
}
```

---

### File 7: `src/components/project/index.ts`

Export new components.

```tsx
export { SupplierContractsSection } from './SupplierContractsSection';
export { SupplierPOSummaryCard } from './SupplierPOSummaryCard';
export { SupplierFinancialsSummaryCard } from './SupplierFinancialsSummaryCard';
export { SupplierEstimatesSection } from './SupplierEstimatesSection';
```

---

## Visual Summary - Supplier Project Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ Oak Ridge Residence                              [Active ▼] 🔔 │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Estimates] [Invoices] [POs]                        │  ← No SOV, No Work Orders
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PROJECT DETAILS                                                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ 👥 Team          │ │ 📦 My Orders     │ │ 🏠 Scope         │ │
│ │                  │ │    (Contracts)   │ │                  │ │
│ │ 4 members        │ │ 3 finalized      │ │ Residential      │ │
│ │                  │ │ $42,500 total    │ │ 2,500 sq ft      │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                 │
│ NEEDS ATTENTION                                                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │ 📦 Purchase      │ │ 🧾 Invoices      │ │ 💵 Financial     │ │
│ │    Orders        │ │                  │ │    Summary       │ │
│ │                  │ │ 1 Draft          │ │                  │ │
│ │ ⚠️ 2 Need Pricing│ │ 1 Submitted      │ │ Order:  $42,500  │ │
│ │ ✓ 3 Finalized    │ │ 1 Paid           │ │ Invoiced: $28,000│ │
│ │ 🚚 1 Delivered   │ │                  │ │ Paid:    $15,000 │ │
│ │                  │ │                  │ │ ─────────────────│ │
│ │                  │ │                  │ │ Outstanding:     │ │
│ │                  │ │                  │ │        $13,000   │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | CREATE - Add `po_id` column to invoices |
| `src/components/project/ProjectTopBar.tsx` | MODIFY - Add `isSupplier` prop |
| `src/components/project/SupplierContractsSection.tsx` | CREATE - Finalized POs as contracts |
| `src/components/project/SupplierPOSummaryCard.tsx` | CREATE - PO status summary |
| `src/components/project/SupplierFinancialsSummaryCard.tsx` | CREATE - Financial tracking |
| `src/components/project/SupplierEstimatesSection.tsx` | CREATE - Project estimates |
| `src/pages/ProjectHome.tsx` | MODIFY - Role detection & conditional rendering |
| `src/components/project/index.ts` | MODIFY - Export new components |
| `src/types/invoice.ts` | MODIFY - Add `po_id` field |

---

## Future Enhancement: PO → Invoice Conversion

After this is implemented, the next step would be adding a "Create Invoice" button on finalized POs that:
1. Opens invoice creation dialog
2. Pre-populates from PO line items
3. Links invoice to PO via `po_id`
4. Auto-calculates totals from PO pricing
