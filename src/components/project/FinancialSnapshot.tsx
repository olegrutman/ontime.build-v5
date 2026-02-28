import { useState } from 'react';
import { ChevronDown, DollarSign, Pencil, Check, X, Plus, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials, getContractCounterpartyName } from '@/hooks/useProjectFinancials';
import { cn } from '@/lib/utils';

function fmt(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

interface FinancialSnapshotProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function FinancialSnapshot({ financials, projectId }: FinancialSnapshotProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);

  // Contract editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSum, setEditSum] = useState(0);
  const [editRetainage, setEditRetainage] = useState(0);
  const [saving, setSaving] = useState(false);

  // FC contract creation
  const [creating, setCreating] = useState(false);
  const [newSum, setNewSum] = useState(0);
  const [newRetainage, setNewRetainage] = useState(0);
  const [selectedFcOrg, setSelectedFcOrg] = useState('');

  const {
    loading, viewerRole, upstreamContract, downstreamContract, userOrgIds,
    billedToDate, workOrderTotal, approvedWOCount, workOrderFCCost, retainageAmount,
    totalPaid, outstanding,
    supplierOrderValue, supplierInvoiced, supplierPaid,
    fcParticipants, updateContract, createFcContract,
  } = financials;

  if (loading) return null;

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

  // FC contract creation overlay
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

  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;
  const outstandingBalance = billedToDate - totalPaid - retainageAmount;

  // Build rows based on role
  const renderContent = () => {
    if (viewerRole === 'Supplier') {
      const supplierOutstanding = supplierInvoiced - supplierPaid;
      return (
        <div className="space-y-1.5">
          <MetricRow label="Order Value" value={fmt(supplierOrderValue)} />
          <MetricRow label="Invoiced" value={fmt(supplierInvoiced)} />
          <MetricRow label="Paid" value={fmt(supplierPaid)} color="green" />
          <MetricRow label="Outstanding" value={fmt(supplierOutstanding)} color={supplierOutstanding > 0 ? 'amber' : undefined} isBold />
        </div>
      );
    }

    if (viewerRole === 'Field Crew') {
      const fcContract = downstreamContract;
      const fcValue = fcContract?.contract_sum || 0;
      return (
        <div className="space-y-1.5">
          <MetricRow
            label={`Contract with ${getContractCounterpartyName(fcContract, userOrgIds)}`}
            value={fcContract ? fmt(fcValue) : '—'}
            editable={!!fcContract}
            onEdit={fcContract ? () => startEdit(fcContract) : undefined}
          />
          <MetricRow label="Earned (Approved WOs)" value={fmt(workOrderTotal)} subtext={approvedWOCount > 0 ? `${approvedWOCount} WOs` : undefined} />
          <Separator />
          <MetricRow label="Invoiced to Date" value={fmt(billedToDate)} />
          <MetricRow label="Retainage Held" value={fmt(retainageAmount)} color={retainageAmount > 0 ? 'amber' : undefined} />
          <MetricRow label="Remaining Balance" value={fmt(outstanding)} color={outstanding < 0 ? 'red' : undefined} isBold />
        </div>
      );
    }

    // GC and TC share similar structure
    const isTC = viewerRole === 'Trade Contractor';
    const currentTotal = gcContractValue + workOrderTotal;

    return (
      <div className="space-y-1.5">
        {/* Contract section */}
        <MetricRow
          label={isTC ? `Incoming Contract (${getContractCounterpartyName(upstreamContract, userOrgIds)})` : `Contract with ${getContractCounterpartyName(upstreamContract, userOrgIds)}`}
          value={upstreamContract ? fmt(gcContractValue) : '—'}
          editable={!!upstreamContract}
          onEdit={upstreamContract ? () => startEdit(upstreamContract) : undefined}
        />

        {/* TC: Outgoing FC contract */}
        {isTC && (
          <MetricRow
            label={`Outgoing Contract (${getContractCounterpartyName(downstreamContract, userOrgIds)})`}
            value={downstreamContract ? fmt(fcContractValue) : '—'}
            editable={!!downstreamContract || fcParticipants.length > 0}
            onEdit={() => {
              if (downstreamContract) startEdit(downstreamContract);
              else if (fcParticipants.length > 0) {
                setCreating(true);
                if (fcParticipants.length === 1) setSelectedFcOrg(fcParticipants[0].org_id);
              }
            }}
          />
        )}

        <MetricRow
          label="+ Approved Work Orders"
          value={fmt(workOrderTotal)}
          color="primary"
          subtext={approvedWOCount > 0 ? `${approvedWOCount} WOs` : undefined}
        />

        <Separator />

        <MetricRow label="= Current Contract Total" value={fmt(currentTotal)} isBold />

        <div className="h-1.5" />

        {/* Billing section */}
        <MetricRow label="Billed to Date" value={fmt(billedToDate)} />
        <MetricRow label="Paid" value={fmt(totalPaid)} color={totalPaid > 0 ? 'green' : undefined} />
        <MetricRow label="Retainage Held" value={fmt(retainageAmount)} color={retainageAmount > 0 ? 'amber' : undefined} />
        <MetricRow label="Outstanding" value={fmt(outstandingBalance)} color={outstandingBalance > 0 ? 'amber' : outstandingBalance < 0 ? 'red' : undefined} />

        {/* TC: Live Position */}
        {isTC && (
          <>
            <div className="h-1.5" />
            {(() => {
              const woProfit = workOrderTotal - workOrderFCCost;
              const livePosition = gcContractValue - fcContractValue + woProfit;
              return (
                <div className="flex items-center justify-between py-1 px-1 rounded bg-accent/30">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Live Position</span>
                  </div>
                  <span className={cn("text-lg font-bold tabular-nums", livePosition > 0 ? 'text-green-600 dark:text-green-400' : livePosition < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                    {fmt(livePosition)}
                  </span>
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border bg-card">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Financial Snapshot
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            {renderContent()}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Shared sub-components
function MetricRow({ label, value, color, subtext, isBold, editable, onEdit }: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'amber' | 'primary';
  subtext?: string;
  isBold?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}) {
  const colorClass = color === 'green' ? 'text-green-600 dark:text-green-400'
    : color === 'red' ? 'text-red-600 dark:text-red-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : color === 'primary' ? 'text-primary'
    : 'text-foreground';

  return (
    <div className="group flex items-center justify-between">
      <span className={cn("text-xs", isBold ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
      <div className="flex items-center gap-1.5">
        {subtext && <span className="text-[10px] text-muted-foreground">{subtext}</span>}
        <span className={cn("tabular-nums", isBold ? "text-lg font-bold" : "text-sm font-semibold", colorClass)}>
          {value}
        </span>
        {editable && onEdit && (
          <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

function Separator() {
  return <div className="border-t my-1" />;
}
