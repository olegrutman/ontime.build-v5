import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { CONTEPanel } from './CONTEPanel';
import { FCPricingToggleCard } from './FCPricingToggleCard';
import { FCInputRequestCard } from './FCInputRequestCard';
import { COStatusActions } from './COStatusActions';
import { COSOVPanel } from './COSOVPanel';
import type { ChangeOrder, COFinancials, COCollaborator, COFCOrgOption, COCreatedByRole } from '@/types/changeOrder';
import type { UseMutationResult } from '@tanstack/react-query';
import type { CONTELogEntry } from '@/types/changeOrder';
import type { MarkupVisibility } from '@/hooks/useMarkupVisibility';

interface COSidebarProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  role: COCreatedByRole;
  myOrgId: string;
  projectId: string;
  financials: COFinancials;
  collaborators: COCollaborator[];
  fcOrgOptions: COFCOrgOption[];
  fcCollabName: string;
  canEdit: boolean;
  canRequestFCInput: boolean;
  canCompleteFCInput: boolean;
  nteLog: CONTELogEntry[];
  requestFCInput: { mutateAsync: (orgId: string) => Promise<any> };
  completeFCInput: { mutateAsync: () => Promise<any> };
  requestNTEIncrease: UseMutationResult<any, Error, any, unknown>;
  approveNTEIncrease: UseMutationResult<any, Error, any, unknown>;
  rejectNTEIncrease: UseMutationResult<any, Error, any, unknown>;
  onRefresh: () => void;
  lineItemCount?: number;
  markupVisibility?: MarkupVisibility;
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const COSidebar = forwardRef<HTMLDivElement, COSidebarProps>(function COSidebar(props, ref) {
  const {
    co, isGC, isTC, isFC, role, myOrgId, projectId,
    financials, collaborators, fcOrgOptions, fcCollabName,
    canEdit, canRequestFCInput, canCompleteFCInput,
    nteLog, requestFCInput, completeFCInput,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
    onRefresh,
  } = props;
  const rl = useRoleLabelsContext();

  const totalApprovedSpend = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  // Profitability calc
  let revenue = 0, costs = 0;
  if (isTC) {
    revenue = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;
    costs = financials.fcLaborTotal + financials.tcActualCostTotal + financials.materialsCost + financials.equipmentCost;
  } else if (isFC) {
    revenue = financials.fcLaborTotal;
    costs = financials.fcActualCostTotal;
  }
  const margin = revenue - costs;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  const statusLabel = co.status === 'work_in_progress' ? 'Work in Progress'
    : co.status === 'closed_for_pricing' ? 'Closed for Pricing'
    : co.status === 'submitted' ? 'Submitted for Approval'
    : co.status === 'approved' ? 'Approved'
    : co.status === 'rejected' ? 'Rejected'
    : co.status === 'draft' ? 'Draft'
    : co.status.replace(/_/g, ' ');

  return (
    <div ref={ref} className="space-y-3">
      {/* Actions Card — Navy */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[0.7rem] uppercase tracking-wider font-semibold" style={{ color: 'hsl(220 27% 65%)' }}>Actions</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--amber))] animate-pulse" />
            <span className="text-xs text-white/80 font-medium">{statusLabel}</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <COStatusActions
            co={co} isGC={isGC} isTC={isTC} isFC={isFC}
            currentOrgId={myOrgId} projectId={projectId}
            financials={financials} collaborators={collaborators}
            onRefresh={onRefresh}
            lineItemCount={props.lineItemCount}
          />
        </div>
      </div>

      {/* FC Pricing Toggle — move higher so TC sees it immediately */}
      {isTC && (collaborators.length > 0 || co.created_by_role === 'FC') && (
        <FCPricingToggleCard
          co={co} financials={financials} myOrgId={myOrgId}
          onRefresh={onRefresh} fcCollabName={fcCollabName} gcSideName="GC"
        />
      )}

      {/* Financials Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[0.7rem] uppercase tracking-wider font-semibold text-muted-foreground">Financials</h3>
        </div>
        <div className="px-4 py-3 space-y-2">
          {isGC && (
            <>
              <div className="flex justify-between text-sm font-semibold">
                <span>TC Submitted</span>
                <span className="font-mono">{fmtCurrency(financials.grandTotal)}</span>
              </div>
            </>
          )}
          {isTC && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billable to GC</span>
                <span className="font-mono font-medium">{fmtCurrency(financials.tcBillableToGC)}</span>
              </div>
              {financials.equipmentTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Equipment</span>
                  <span className="font-mono font-medium">{fmtCurrency(financials.equipmentTotal)}</span>
                </div>
              )}
              {financials.materialsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materials</span>
                  <span className="font-mono font-medium">{fmtCurrency(financials.materialsTotal)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total to GC</span>
                  <span className="font-mono">{fmtCurrency(financials.grandTotal)}</span>
                </div>
              </div>
            </>
          )}
          {isFC && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">My Labor</span>
                <span className="font-mono font-medium">{fmtCurrency(financials.fcLaborTotal)}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{fmtCurrency(financials.fcLaborTotal)}</span>
                </div>
              </div>
            </>
          )}

          {/* TC / FC Profitability */}
          {(isTC || isFC) && (
            <div className="border-t border-border pt-3 mt-3 space-y-2">
              <p className="text-[0.65rem] uppercase tracking-wider font-semibold text-muted-foreground">
                {isTC ? 'TC' : 'FC'} Profitability
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-mono font-medium">{fmtCurrency(revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Internal Costs</span>
                <span className="font-mono font-medium">{fmtCurrency(costs)}</span>
              </div>
              <div className={cn(
                'rounded-lg px-3 py-2',
                margin >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20',
              )}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Gross Margin</span>
                  <div className="text-right">
                    <span className={cn('font-mono font-bold', margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                      {fmtCurrency(margin)}
                    </span>
                    <span className={cn('text-xs ml-1', margin >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      ({marginPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                {revenue > 0 && (
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', margin >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(Math.max(marginPct, 0), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SOV Panel */}
      <COSOVPanel coId={co.id} isGC={isGC} isTC={isTC} isFC={isFC} myOrgId={myOrgId} />

      {/* Field Crew Card */}
      {isTC && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[0.7rem] uppercase tracking-wider font-semibold text-muted-foreground">{rl.FC}</h3>
          </div>
          <div className="px-4 py-3">
            <FCInputRequestCard
              canRequest={canRequestFCInput} canComplete={canCompleteFCInput}
              options={fcOrgOptions} collaborators={collaborators} acting={false}
              onRequest={async (orgId) => { await requestFCInput.mutateAsync(orgId); onRefresh(); }}
              onComplete={async () => { await completeFCInput.mutateAsync(); onRefresh(); }}
            />
          </div>
        </div>
      )}

      {/* NTE */}
      {co.pricing_type === 'nte' && co.nte_cap && (
        <CONTEPanel
          co={co} nteLog={nteLog} usedAmount={financials.laborTotal}
          isGC={isGC} isTC={isTC} isFC={isFC}
          requestNTEIncrease={requestNTEIncrease}
          approveNTEIncrease={approveNTEIncrease}
          rejectNTEIncrease={rejectNTEIncrease}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
});
