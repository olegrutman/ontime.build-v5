import { useState } from 'react';
import { Pencil, Check, X, Plus, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials, getContractCounterpartyName } from '@/hooks/useProjectFinancials';
import { cn, formatCurrency as fmt } from '@/lib/utils';

interface ContractHeroCardProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function ContractHeroCard({ financials, projectId }: ContractHeroCardProps) {
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSum, setEditSum] = useState(0);
  const [editRetainage, setEditRetainage] = useState(0);
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newSum, setNewSum] = useState(0);
  const [newRetainage, setNewRetainage] = useState(0);
  const [selectedFcOrg, setSelectedFcOrg] = useState('');

  const {
    loading, viewerRole, upstreamContract, downstreamContract, userOrgIds,
    materialDelivered, materialOrderedPending, isTCMaterialResponsible,
    materialEstimate, approvedEstimateSum,
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
      <div data-sasha-card="Contract" className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
        <p className="kpi-label">Edit Contract</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-7 h-9 text-sm" value={editSum || ''} onChange={e => setEditSum(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <div className="relative w-24">
            <Input type="number" min="0" max="20" step="0.5" className="pr-7 h-9 text-sm" value={editRetainage || ''} onChange={e => setEditRetainage(parseFloat(e.target.value) || 0)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-9"><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  // FC contract creation overlay
  if (creating) {
    return (
      <div data-sasha-card="Contract" className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
        <p className="kpi-label">Add Field Crew Contract</p>
        {fcParticipants.length > 1 && (
          <select className="w-full h-9 text-sm border rounded-lg px-3 bg-background" value={selectedFcOrg} onChange={e => setSelectedFcOrg(e.target.value)}>
            <option value="">Select Field Crew...</option>
            {fcParticipants.map(fc => <option key={fc.org_id} value={fc.org_id}>{fc.org_name}</option>)}
          </select>
        )}
        <div className="flex gap-2 items-end flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="1000" className="pl-7 h-9 text-sm" value={newSum || ''} onChange={e => setNewSum(parseFloat(e.target.value) || 0)} autoFocus />
          </div>
          <div className="relative w-24">
            <Input type="number" min="0" max="20" step="0.5" className="pr-7 h-9 text-sm" value={newRetainage || ''} onChange={e => setNewRetainage(parseFloat(e.target.value) || 0)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <Button size="sm" onClick={handleCreateFC} disabled={saving || (fcParticipants.length > 1 && !selectedFcOrg)} className="h-9"><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
    );
  }

  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;
  const isTC = viewerRole === 'Trade Contractor';
  const isFC = viewerRole === 'Field Crew';
  const isSupplier = viewerRole === 'Supplier';

  // Supplier hero
  if (isSupplier) {
    const supplierOutstanding = supplierInvoiced - supplierPaid;
    return (
      <div data-sasha-card="Contract" className="bg-card rounded-lg border shadow-sm p-5 md:p-6">
        <p className="kpi-label mb-1">Order Value</p>
        <p className="kpi-value">{fmt(supplierOrderValue)}</p>
        <div className="border-t mt-4 pt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5">Invoiced</p>
            <p className="font-heading text-[1.2rem] md:text-sm font-bold tabular-nums">{fmt(supplierInvoiced)}</p>
          </div>
          <div>
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5">Paid</p>
            <p className="font-heading text-[1.2rem] md:text-sm font-bold tabular-nums text-green-600 dark:text-green-400">{fmt(supplierPaid)}</p>
          </div>
          <div>
            <p className="text-[0.65rem] md:text-xs text-muted-foreground mb-0.5">Outstanding</p>
            <p className={cn("font-heading text-[1.2rem] md:text-sm font-bold tabular-nums", supplierOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>{fmt(supplierOutstanding)}</p>
          </div>
        </div>
      </div>
    );
  }

  // FC hero
  if (isFC) {
    const fcContract = downstreamContract;
    const fcValue = fcContract?.contract_sum || 0;
    return (
      <div data-sasha-card="Contract" className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 md:p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Contract with {getContractCounterpartyName(fcContract, userOrgIds)}
        </p>
        <div className="flex items-center gap-2 mb-4">
          <p className="font-heading text-[1.9rem] md:text-3xl font-black tabular-nums text-foreground">{fcContract ? fmt(fcValue) : '—'}</p>
        </div>
      </div>
    );
  }

  // GC / TC hero
  const currentTotal = gcContractValue;

  return (
    <div data-sasha-card="Contract" className="bg-white dark:bg-card rounded-2xl shadow-sm p-5 md:p-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Current Contract Total</p>
      <p className="font-heading text-[1.9rem] md:text-3xl font-black tabular-nums text-foreground mb-4">{fmt(currentTotal)}</p>

      <div className="border-t pt-4 grid grid-cols-2 gap-4">
        {/* Original Contract */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            {isTC ? `Incoming (${getContractCounterpartyName(upstreamContract, userOrgIds)})` : `Contract with ${getContractCounterpartyName(upstreamContract, userOrgIds)}`}
          </p>
          <div className="group flex items-center gap-1.5">
            <span className="text-lg font-semibold tabular-nums">{upstreamContract ? fmt(gcContractValue) : '—'}</span>
            {upstreamContract && (
              <button onClick={() => startEdit(upstreamContract)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded">
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* TC: Outgoing FC contract */}
      {isTC && (
        <div className="border-t mt-4 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Outgoing ({getContractCounterpartyName(downstreamContract, userOrgIds)})</span>
            <div className="group flex items-center gap-1.5">
              <span className="text-sm font-semibold tabular-nums">{downstreamContract ? fmt(fcContractValue) : '—'}</span>
              {(downstreamContract || fcParticipants.length > 0) && (
                <button
                  onClick={() => {
                    if (downstreamContract) startEdit(downstreamContract);
                    else if (fcParticipants.length > 0) {
                      setCreating(true);
                      if (fcParticipants.length === 1) setSelectedFcOrg(fcParticipants[0].org_id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
                >
                  {downstreamContract ? <Pencil className="h-3 w-3 text-muted-foreground" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TC: Live Position */}
      {isTC && (() => {
        const materialCosts = isTCMaterialResponsible ? (materialEstimate || approvedEstimateSum || 0) : 0;
        const livePosition = gcContractValue - fcContractValue - materialCosts;
        return (
          <div className="mt-4 flex items-center justify-between py-2.5 px-3 rounded-xl bg-accent/30">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Live Position</span>
            </div>
            <span className={cn("text-xl font-bold tabular-nums", livePosition > 0 ? 'text-green-600 dark:text-green-400' : livePosition < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
              {fmt(livePosition)}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
