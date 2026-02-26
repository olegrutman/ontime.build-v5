import { useState } from 'react';
import { DollarSign, Receipt, TrendingUp, Percent, Package, Pencil, Check, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials, getContractCounterpartyName } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';

interface FinancialSignalBarProps {
  financials: ProjectFinancials;
  projectId: string;
  hideMaterialCards?: boolean;
}

function fmt(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

interface SignalCardProps {
  label: string;
  value: string;
  color?: 'default' | 'green' | 'red' | 'amber';
  icon?: React.ReactNode;
  subtext?: string;
  editable?: boolean;
  onEdit?: () => void;
}

function SignalCard({ label, value, color = 'default', icon, subtext, editable, onEdit }: SignalCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="group border bg-card p-2.5 sm:p-3 min-h-[64px] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground font-medium truncate leading-tight">
          {label}
        </span>
        {editable && (
          <button
            onClick={onEdit}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <p className={cn("text-lg sm:text-xl font-bold tabular-nums leading-tight", colorClasses[color])}>
        {value}
      </p>
      {subtext && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtext}</p>
      )}
    </div>
  );
}

export function FinancialSignalBar({ financials, projectId, hideMaterialCards }: FinancialSignalBarProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSum, setEditSum] = useState(0);
  const [editRetainage, setEditRetainage] = useState(0);
  const [saving, setSaving] = useState(false);

  // FC contract creation state
  const [creating, setCreating] = useState(false);
  const [newSum, setNewSum] = useState(0);
  const [newRetainage, setNewRetainage] = useState(0);
  const [selectedFcOrg, setSelectedFcOrg] = useState('');

  // Material budget edit state
  const [editingMatBudget, setEditingMatBudget] = useState(false);
  const [matBudgetValue, setMatBudgetValue] = useState(0);

  const {
    loading, viewerRole, upstreamContract, downstreamContract, userOrgIds,
    billedToDate, workOrderTotal, workOrderFCCost, retainageAmount, outstanding,
    materialEstimate, materialOrdered, totalPaidToFC,
    supplierOrderValue, supplierInvoiced, supplierPaid,
    fcParticipants, updateContract, createFcContract,
    isTCMaterialResponsible, isGCMaterialResponsible, materialEstimateTotal, updateMaterialEstimate,
    approvedEstimateSum, isDesignatedSupplier,
  } = financials;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px]" />)}
      </div>
    );
  }

  const startEdit = (contract: { id: string; contract_sum: number; retainage_percent: number }) => {
    setEditingId(contract.id);
    setEditSum(contract.contract_sum);
    setEditRetainage(contract.retainage_percent);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    const ok = await updateContract(editingId, editSum, editRetainage);
    setSaving(false);
    if (ok) { toast({ title: 'Contract updated' }); setEditingId(null); }
    else toast({ title: 'Error', description: 'Failed to update contract', variant: 'destructive' });
  };

  const handleCreateFC = async () => {
    setSaving(true);
    const ok = await createFcContract(selectedFcOrg, newSum, newRetainage);
    setSaving(false);
    if (ok) { toast({ title: 'Contract created' }); setCreating(false); setNewSum(0); setNewRetainage(0); setSelectedFcOrg(''); }
    else toast({ title: 'Error', description: 'Failed to create contract', variant: 'destructive' });
  };

  // Inline edit overlay
  if (editingId) {
    return (
      <div className="border bg-card p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Edit Contract</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-6 h-8 text-sm" value={editSum || ''} onChange={e => setEditSum(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <div className="relative w-24">
            <Input type="number" min="0" max="20" step="0.5" className="pr-6 h-8 text-sm" value={editRetainage || ''} onChange={e => setEditRetainage(parseFloat(e.target.value) || 0)} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8"><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={saving} className="h-8"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  // FC contract creation
  if (creating) {
    return (
      <div className="border bg-card p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Add Field Crew Contract</p>
        {fcParticipants.length > 1 && (
          <select className="w-full h-8 text-sm border rounded px-2 bg-background" value={selectedFcOrg} onChange={e => setSelectedFcOrg(e.target.value)}>
            <option value="">Select Field Crew...</option>
            {fcParticipants.map(fc => <option key={fc.org_id} value={fc.org_id}>{fc.org_name}</option>)}
          </select>
        )}
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-6 h-8 text-sm" value={newSum || ''} onChange={e => setNewSum(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <div className="relative w-24">
            <Input type="number" min="0" max="20" step="0.5" className="pr-6 h-8 text-sm" value={newRetainage || ''} onChange={e => setNewRetainage(parseFloat(e.target.value) || 0)} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <Button size="sm" onClick={handleCreateFC} disabled={saving || (fcParticipants.length > 1 && !selectedFcOrg)} className="h-8"><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)} disabled={saving} className="h-8"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  // Material budget edit overlay
  if (editingMatBudget && upstreamContract) {
    const handleSaveMatBudget = async () => {
      setSaving(true);
      const ok = await updateMaterialEstimate(upstreamContract.id, matBudgetValue);
      setSaving(false);
      if (ok) { toast({ title: 'Material budget updated' }); setEditingMatBudget(false); }
      else toast({ title: 'Error', description: 'Failed to update material budget', variant: 'destructive' });
    };
    return (
      <div className="border bg-card p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">Set Material Budget</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-6 h-8 text-sm" value={matBudgetValue || ''} onChange={e => setMatBudgetValue(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <Button size="sm" onClick={handleSaveMatBudget} disabled={saving} className="h-8"><Check className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingMatBudget(false)} disabled={saving} className="h-8"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  const cards: SignalCardProps[] = [];
  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;

  if (viewerRole === 'Field Crew') {
    cards.push({
      label: `Contract with ${getContractCounterpartyName(downstreamContract, userOrgIds)}`,
      value: downstreamContract ? fmt(fcContractValue) : '—',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      editable: !!downstreamContract,
      onEdit: downstreamContract ? () => startEdit(downstreamContract) : undefined,
    });
    cards.push({ label: 'Invoiced to Date', value: fmt(billedToDate), icon: <Receipt className="h-3.5 w-3.5" /> });
    cards.push({ label: 'Retainage Held', value: fmt(retainageAmount), icon: <Percent className="h-3.5 w-3.5" />, color: retainageAmount > 0 ? 'amber' : 'default' });
    const approvedPendingBilling = workOrderTotal - billedToDate;
    cards.push({ label: 'Approved WOs Pending Billing', value: fmt(Math.max(0, approvedPendingBilling)), color: approvedPendingBilling > 0 ? 'amber' : 'default' });
    cards.push({ label: 'Remaining Balance', value: fmt(outstanding), color: outstanding > 0 ? 'default' : outstanding < 0 ? 'red' : 'green' });
  }

  if (viewerRole === 'Trade Contractor') {
    cards.push({
      label: `Incoming Contract (${getContractCounterpartyName(upstreamContract, userOrgIds)})`,
      value: upstreamContract ? fmt(gcContractValue) : '—',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      editable: !!upstreamContract,
      onEdit: upstreamContract ? () => startEdit(upstreamContract) : undefined,
    });
    cards.push({
      label: `Outgoing Contract (${getContractCounterpartyName(downstreamContract, userOrgIds)})`,
      value: downstreamContract ? fmt(fcContractValue) : '—',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      editable: !!downstreamContract,
      onEdit: downstreamContract ? () => startEdit(downstreamContract) : undefined,
      subtext: !downstreamContract && fcParticipants.length > 0 ? 'Click + to add' : undefined,
    });
    // Material Budget card for TC with material responsibility
    if (isTCMaterialResponsible && !hideMaterialCards) {
      cards.push({
        label: 'Material Budget',
        value: materialEstimateTotal != null ? fmt(materialEstimateTotal) : 'Set budget',
        icon: <Package className="h-3.5 w-3.5" />,
        color: materialEstimateTotal != null ? 'default' : 'amber',
        editable: true,
        onEdit: () => { setMatBudgetValue(materialEstimateTotal || 0); setEditingMatBudget(true); },
        subtext: materialEstimateTotal != null ? 'Est. supplier costs' : 'Click to set',
      });
    } else if (materialEstimate > 0 && !hideMaterialCards) {
      cards.push({ label: 'Supplier Estimate', value: fmt(materialEstimate), icon: <Package className="h-3.5 w-3.5" /> });
    }
    cards.push({ label: 'Total Billed to GC', value: fmt(billedToDate), icon: <Receipt className="h-3.5 w-3.5" /> });
    const livePosition = gcContractValue - fcContractValue - materialOrdered;
    cards.push({
      label: 'Live Position',
      value: fmt(livePosition),
      color: livePosition > 0 ? 'green' : livePosition < 0 ? 'red' : 'default',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      subtext: 'In − Out − Materials',
    });
    if ((materialEstimate > 0 || materialOrdered > 0) && !hideMaterialCards) {
      const overBudget = materialOrdered > materialEstimate;
      cards.push({
        label: 'Material Ordered vs Est.',
        value: `${fmt(materialOrdered)} / ${fmt(materialEstimate)}`,
        color: overBudget ? 'red' : 'green',
        icon: <Package className="h-3.5 w-3.5" />,
      });
    }
    cards.push({ label: 'Total Paid to FC', value: fmt(totalPaidToFC) });

    // Add FC contract button if none exists
    if (!downstreamContract && fcParticipants.length > 0) {
      // Replace second card's onEdit to trigger create flow
      cards[1].onEdit = () => {
        setCreating(true);
        if (fcParticipants.length === 1) setSelectedFcOrg(fcParticipants[0].org_id);
      };
      cards[1].editable = true;
    }
  }

  if (viewerRole === 'General Contractor') {
    cards.push({
      label: `Contract with ${getContractCounterpartyName(upstreamContract, userOrgIds)}`,
      value: upstreamContract ? fmt(gcContractValue) : '—',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      editable: !!upstreamContract,
      onEdit: upstreamContract ? () => startEdit(upstreamContract) : undefined,
    });
    cards.push({ label: 'Approved Work Orders', value: fmt(workOrderTotal) });
    cards.push({ label: 'Total Invoiced', value: fmt(billedToDate), icon: <Receipt className="h-3.5 w-3.5" /> });
    cards.push({ label: 'Retainage Held', value: fmt(retainageAmount), icon: <Percent className="h-3.5 w-3.5" />, color: retainageAmount > 0 ? 'amber' : 'default' });
    // Material Budget card for GC with material responsibility
    if (isGCMaterialResponsible && !hideMaterialCards) {
      const budgetValue = materialEstimateTotal ?? approvedEstimateSum;
      cards.push({
        label: 'Material Budget',
        value: fmt(budgetValue || 0),
        icon: <Package className="h-3.5 w-3.5" />,
        color: budgetValue > 0 ? 'default' : 'amber',
        editable: true,
        onEdit: () => { setMatBudgetValue(budgetValue || 0); setEditingMatBudget(true); },
        subtext: materialEstimateTotal != null ? 'Manual override' : 'From approved estimates',
      });
    }
    if ((materialEstimate > 0 || materialOrdered > 0) && !hideMaterialCards) {
      const overBudget = materialOrdered > materialEstimate;
      cards.push({
        label: 'Supplier Est. vs Orders',
        value: `${fmt(materialEstimate)} / ${fmt(materialOrdered)}`,
        color: overBudget ? 'red' : 'green',
        icon: <Package className="h-3.5 w-3.5" />,
      });
    }
  }

  if (viewerRole === 'Supplier') {
    cards.push({ label: 'Order Value', value: fmt(supplierOrderValue), icon: <DollarSign className="h-3.5 w-3.5" /> });
    cards.push({ label: 'Invoiced', value: fmt(supplierInvoiced), icon: <Receipt className="h-3.5 w-3.5" /> });
    cards.push({ label: 'Paid', value: fmt(supplierPaid), color: 'green' });
    const outstanding = supplierInvoiced - supplierPaid;
    cards.push({ label: 'Outstanding', value: fmt(outstanding), color: outstanding > 0 ? 'amber' : 'default' });

    // Designated supplier can see and edit the material budget
    if (isDesignatedSupplier && upstreamContract) {
      const budgetValue = materialEstimateTotal ?? approvedEstimateSum;
      cards.push({
        label: 'Material Budget',
        value: fmt(budgetValue || 0),
        icon: <Package className="h-3.5 w-3.5" />,
        color: budgetValue > 0 ? 'default' : 'amber',
        editable: true,
        onEdit: () => { setMatBudgetValue(budgetValue || 0); setEditingMatBudget(true); },
        subtext: materialEstimateTotal != null ? 'Manual override' : 'From approved estimates',
      });
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {cards.map((card, i) => <SignalCard key={i} {...card} />)}
    </div>
  );
}
