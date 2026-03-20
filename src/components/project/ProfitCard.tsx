import { useState } from 'react';
import { TrendingUp, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { cn, formatCurrency as fmt } from '@/lib/utils';
import { useActualCosts } from '@/hooks/useActualCosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ActualCostPopup } from './ActualCostPopup';

interface ProfitCardProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function ProfitCard({ financials, projectId }: ProfitCardProps) {
  const { toast } = useToast();
  const { userOrgRoles } = useAuth();
  const {
    loading, viewerRole, upstreamContract, downstreamContract,
    ownerContractValue, materialMarkupType, materialMarkupValue,
    materialDelivered, laborBudget,
    isTCMaterialResponsible, isTCSelfPerforming, updateOwnerContract,
    materialEstimate, approvedEstimateSum, refetch,
  } = financials;

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [togglingPerf, setTogglingPerf] = useState(false);
  const [costPopupOpen, setCostPopupOpen] = useState(false);

  const { totalActualCost } = useActualCosts({ projectId });

  const handleToggleSelfPerforming = async () => {
    setTogglingPerf(true);
    try {
      const orgId = userOrgRoles[0]?.organization_id;
      if (!orgId) return;
      const { data: teamRow } = await supabase
        .from('project_team')
        .select('id, is_self_performing')
        .eq('project_id', projectId)
        .eq('org_id', orgId)
        .eq('role', 'Trade Contractor')
        .maybeSingle();
      if (!teamRow) return;
      const newVal = !teamRow.is_self_performing;
      const { error } = await supabase
        .from('project_team')
        .update({ is_self_performing: newVal } as any)
        .eq('id', teamRow.id);
      if (error) throw error;
      toast({ title: newVal ? 'Self-performing enabled' : 'Self-performing disabled' });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setTogglingPerf(false);
    }
  };

  if (loading) return null;

  const gcContractValue = upstreamContract?.contract_sum || 0;
  const fcContractValue = downstreamContract?.contract_sum || 0;
  const currentTotal = gcContractValue;

  const handleSaveOwnerContract = async () => {
    if (!upstreamContract) return;
    setSaving(true);
    const ok = await updateOwnerContract(upstreamContract.id, editValue);
    setSaving(false);
    if (ok) { toast({ title: 'Owner contract updated' }); setEditing(false); }
    else toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
  };

  // GC Profit
  if (viewerRole === 'General Contractor') {
    if (editing) {
      return (
        <div className="bg-card rounded-lg border shadow-sm p-5 space-y-3">
          <p className="kpi-label">Set Owner Contract Value</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="relative flex-1 min-w-[100px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input type="number" min="0" step="1000" className="pl-7 h-9 text-sm" value={editValue || ''} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} autoFocus />
            </div>
            <Button size="sm" onClick={handleSaveOwnerContract} disabled={saving} className="h-9"><Check className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-9"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      );
    }

    const hasOwner = ownerContractValue != null && ownerContractValue > 0;
    const gcProfit = hasOwner ? ownerContractValue - currentTotal : 0;

    return (
      <div className="bg-card rounded-2xl shadow-sm p-5 space-y-2.5" data-sasha-card="Profit Position">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Profit Position</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Owner Contract</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setEditValue(ownerContractValue || 0); setEditing(true); }} className="p-0.5 hover:bg-accent rounded transition-colors">
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <span className={cn("text-sm font-semibold tabular-nums", !hasOwner && 'text-amber-600 dark:text-amber-400')}>
              {hasOwner ? fmt(ownerContractValue) : 'Not set'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Contract Total</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(currentTotal)}</span>
        </div>

        {hasOwner && (
          <div className="border-t pt-2.5 flex items-center justify-between">
            <span className="text-sm font-medium">GC Profit</span>
            <span className={cn("text-lg font-bold tabular-nums", gcProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
              {fmt(gcProfit)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // FC Profit
  if (viewerRole === 'Field Crew') {
    const fcValue = downstreamContract?.contract_sum || 0;
    const hasLaborBudget = laborBudget != null && laborBudget > 0;
    const fcContractTotal = fcValue;
    const hasActualCost = totalActualCost > 0;
    const fcProfit = hasActualCost
      ? fcContractTotal - totalActualCost
      : hasLaborBudget ? fcContractTotal - laborBudget : 0;

    if (!hasLaborBudget && !hasActualCost) return null;

    return (
      <div className="bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Profit Position</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Contract Total</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(fcContractTotal)}</span>
        </div>

        {hasActualCost ? (
          <button
            onClick={() => setCostPopupOpen(true)}
            className="flex items-center justify-between w-full rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="text-sm text-muted-foreground">Actual Cost</span>
            <span className="text-sm font-semibold tabular-nums">{fmt(totalActualCost)}</span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Labor Budget</span>
            <span className="text-sm font-semibold tabular-nums">{fmt(laborBudget || 0)}</span>
          </div>
        )}

        <div className="border-t pt-2.5 flex items-center justify-between">
          <span className="text-sm font-medium">FC Profit</span>
          <span className={cn("text-lg font-bold tabular-nums", fcProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
            {fmt(fcProfit)}
          </span>
        </div>
        <ActualCostPopup
          open={costPopupOpen}
          onOpenChange={setCostPopupOpen}
          projectId={projectId}
          earningsOrRevenue={fcContractTotal}
          label="Contract Total"
        />
      </div>
    );
  }

  // TC Profit
  if (viewerRole === 'Trade Contractor') {
    const {
      receivablesInvoiced, payablesInvoiced,
    } = financials;

    const revenueTotal = currentTotal;
    const hasActualCost = totalActualCost > 0;
    const estimateCost = isTCMaterialResponsible ? (materialEstimate || approvedEstimateSum || 0) : 0;
    // Self-performing TC: deduct actual cost instead of FC labor
    const laborDeduction = isTCSelfPerforming
      ? (hasActualCost ? totalActualCost : 0)
      : fcContractValue;
    const laborMargin = revenueTotal - laborDeduction - estimateCost;
    const laborMarginPct = revenueTotal > 0 ? (laborMargin / revenueTotal) * 100 : 0;
    const netPosition = receivablesInvoiced - payablesInvoiced;
    const realizedPct = laborMargin > 0 ? (netPosition / laborMargin) * 100 : 0;

    if (!isTCMaterialResponsible) {
      return (
        <div className="bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Profit Position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Self-Performing</span>
              <Switch checked={isTCSelfPerforming} disabled={togglingPerf} onCheckedChange={handleToggleSelfPerforming} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Revenue Total</span>
            <span className="text-sm font-semibold tabular-nums">{fmt(revenueTotal)}</span>
          </div>
          {!isTCSelfPerforming && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">FC Labor Cost</span>
              <span className="text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">-{fmt(fcContractValue)}</span>
            </div>
          )}

          <button
            onClick={() => setCostPopupOpen(true)}
            className="flex items-center justify-between w-full rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="text-sm text-muted-foreground">
              {isTCSelfPerforming ? (hasActualCost ? 'Actual Cost' : 'Internal Cost') : (hasActualCost ? 'Actual Cost' : 'Internal Cost')}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {fmt(hasActualCost ? totalActualCost : 0)}
            </span>
          </button>

          <div className="border-t pt-2.5 flex items-center justify-between">
            <span className="text-sm font-medium">Labor Margin</span>
            <div className="text-right">
              <span className={cn("text-lg font-bold tabular-nums", laborMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                {fmt(laborMargin)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">({laborMarginPct.toFixed(1)}%)</span>
            </div>
          </div>
          {laborMargin > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-muted-foreground">Realized</span>
              <span className={cn("text-sm font-semibold tabular-nums", netPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                {fmt(netPosition)} <span className="text-xs text-muted-foreground">({realizedPct.toFixed(1)}%)</span>
              </span>
            </div>
          )}
          <ActualCostPopup
            open={costPopupOpen}
            onOpenChange={setCostPopupOpen}
            projectId={projectId}
            earningsOrRevenue={revenueTotal}
            label="Revenue"
          />
        </div>
      );
    }

    // TC with materials
    const materialCost = materialDelivered;
    let materialRevenue = materialCost;
    if (materialMarkupType === 'percent' && materialMarkupValue != null) {
      materialRevenue = materialCost * (1 + materialMarkupValue / 100);
    } else if (materialMarkupType === 'fixed' && materialMarkupValue != null) {
      materialRevenue = materialCost + materialMarkupValue;
    }
    const materialMargin = materialRevenue - materialCost;
    const totalProfit = laborMargin + materialMargin;

    return (
      <div className="bg-card rounded-2xl shadow-sm p-5 space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Profit Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Self-Performing</span>
            <Switch checked={isTCSelfPerforming} disabled={togglingPerf} onCheckedChange={handleToggleSelfPerforming} />
          </div>
        </div>

        {/* Labor */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Labor Margin</span>
          <span className={cn("text-sm font-semibold tabular-nums", laborMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
            {fmt(laborMargin)}
          </span>
        </div>

        {/* Materials */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Material Margin</span>
          <span className={cn("text-sm font-semibold tabular-nums", materialMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
            {fmt(materialMargin)}
          </span>
        </div>
        {materialMarkupType && (
          <p className="text-[10px] text-muted-foreground">
            Markup: {materialMarkupType === 'percent' ? `${materialMarkupValue}%` : fmt(materialMarkupValue || 0)} on {fmt(materialCost)} delivered
          </p>
        )}

        <button
          onClick={() => setCostPopupOpen(true)}
          className="flex items-center justify-between w-full rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <span className="text-sm text-muted-foreground">
            {hasActualCost ? 'Actual Cost' : 'Internal Cost'}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {fmt(hasActualCost ? totalActualCost : 0)}
          </span>
        </button>

        <div className="border-t pt-2.5 flex items-center justify-between">
          <span className="text-sm font-medium">Total Projected Profit</span>
          <span className={cn("text-lg font-bold tabular-nums", totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
            {fmt(totalProfit)}
          </span>
        </div>
        {laborMargin > 0 && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Realized</span>
            <span className={cn("text-sm font-semibold tabular-nums", netPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
              {fmt(netPosition)} <span className="text-xs text-muted-foreground">({realizedPct.toFixed(1)}%)</span>
            </span>
          </div>
        )}
        <ActualCostPopup
          open={costPopupOpen}
          onOpenChange={setCostPopupOpen}
          projectId={projectId}
          earningsOrRevenue={revenueTotal}
          label="Revenue"
        />
      </div>
    );
  }

  return null;
}
