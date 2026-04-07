import { forwardRef } from 'react';
import { DT } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { CONTEPanel } from './CONTEPanel';
import { FCPricingToggleCard } from './FCPricingToggleCard';
import { FCInputRequestCard } from './FCInputRequestCard';
import { COStatusActions } from './COStatusActions';
import { COBudgetTracker } from './COBudgetTracker';
import { COProfitabilityCard } from './COProfitabilityCard';
import { COSOVPanel } from './COSOVPanel';
import type { ChangeOrder, COFinancials, COCollaborator, COFCOrgOption, COCreatedByRole } from '@/types/changeOrder';
import type { UseMutationResult } from '@tanstack/react-query';
import type { CONTELogEntry } from '@/types/changeOrder';

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
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3
      className="text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground font-semibold px-3.5 pt-3.5 pb-2"
     
    >
      {title}
    </h3>
  );
}

function FinRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm px-3.5">
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground', bold && 'font-semibold')}>{label}</span>
      <span className={cn('font-mono', bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'font-medium text-foreground')}>
        {fmtCurrency(value)}
      </span>
    </div>
  );
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

  const totalApprovedSpend = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  return (
    <div ref={ref} className="space-y-3">
      {/* GC Budget Tracker */}
      <COBudgetTracker
        gcBudget={(co as any).gc_budget ?? null}
        totalApprovedSpend={totalApprovedSpend}
        isGC={isGC}
      />

      {/* Actions */}
      <COStatusActions
        co={co} isGC={isGC} isTC={isTC} isFC={isFC}
        currentOrgId={myOrgId} projectId={projectId}
        financials={financials} collaborators={collaborators}
        onRefresh={onRefresh}
      />

      {/* Financials */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <SectionHeader title="Financials" />
        <div className="space-y-1.5 pb-3.5">
          {isGC && (
            <>
              <FinRow label="Labor" value={financials.tcBillableToGC} />
              {(co.materials_needed || financials.materialsTotal > 0) && <FinRow label="Materials" value={financials.materialsTotal} />}
              {(co.equipment_needed || financials.equipmentTotal > 0) && <FinRow label="Equipment" value={financials.equipmentTotal} />}
              <div className="border-t border-border mx-3.5 pt-1.5 mt-1.5">
                <FinRow label="Total billed" value={totalApprovedSpend} bold />
              </div>
            </>
          )}
          {isTC && (
            <>
              {financials.fcLaborTotal > 0 && <FinRow label="FC cost" value={financials.fcLaborTotal} muted />}
              <FinRow label="Billable to GC" value={financials.tcBillableToGC} />
              {financials.materialsTotal > 0 && <FinRow label="Materials" value={financials.materialsTotal} />}
              {financials.equipmentTotal > 0 && <FinRow label="Equipment" value={financials.equipmentTotal} />}
              <div className="border-t border-border mx-3.5 pt-1.5 mt-1.5">
                <FinRow label="Total" value={financials.grandTotal} bold />
              </div>
            </>
          )}
          {isFC && (
            <>
              <FinRow label="My labor" value={financials.fcLaborTotal} />
              <div className="border-t border-border mx-3.5 pt-1.5 mt-1.5">
                <FinRow label="Total" value={financials.fcLaborTotal} bold />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profitability — TC and FC only */}
      <COProfitabilityCard isTC={isTC} isFC={isFC} financials={financials} />

      {/* SOV Panel — GC and TC */}
      <COSOVPanel coId={co.id} isGC={isGC} isTC={isTC} isFC={isFC} myOrgId={myOrgId} />

      {/* FC Pricing Toggle */}
      {isTC && collaborators.length > 0 && (
        <FCPricingToggleCard
          co={co} financials={financials} myOrgId={myOrgId}
          onRefresh={onRefresh} fcCollabName={fcCollabName} gcSideName="GC"
        />
      )}

      {/* FC Input */}
      <FCInputRequestCard
        canRequest={canRequestFCInput} canComplete={canCompleteFCInput}
        options={fcOrgOptions} collaborators={collaborators} acting={false}
        onRequest={async (orgId) => { await requestFCInput.mutateAsync(orgId); onRefresh(); }}
        onComplete={async () => { await completeFCInput.mutateAsync(); onRefresh(); }}
      />

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
