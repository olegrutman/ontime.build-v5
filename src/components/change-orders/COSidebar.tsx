import { forwardRef } from 'react';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { CONTEPanel } from './CONTEPanel';
import { FCInputRequestCard } from './FCInputRequestCard';
import { COSOVPanel } from './COSOVPanel';
import { COTeamCard } from './COTeamCard';
import type { ChangeOrder, COFinancials, COCollaborator, COFCOrgOption, COCreatedByRole, COLineItem, COLaborEntry } from '@/types/changeOrder';
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
  lineItems?: COLineItem[];
  laborEntries?: COLaborEntry[];
  markupVisibility?: MarkupVisibility;
  materialResponsible?: 'GC' | 'TC';
  equipmentResponsible?: 'GC' | 'TC';
  tcBillableTotal?: number;
  currentLaborTotal?: number;
}

export const COSidebar = forwardRef<HTMLDivElement, COSidebarProps>(function COSidebar(props, ref) {
  const {
    co, isGC, isTC, isFC, collaborators, fcOrgOptions, fcCollabName,
    canRequestFCInput, canCompleteFCInput,
    nteLog, requestFCInput, completeFCInput,
    requestNTEIncrease, approveNTEIncrease, rejectNTEIncrease,
    onRefresh, financials,
  } = props;
  const rl = useRoleLabelsContext();

  return (
    <div ref={ref} className="space-y-3">
      <COTeamCard co={co} collaborators={collaborators} />

      <COSOVPanel coId={co.id} isGC={isGC} isTC={isTC} isFC={isFC} myOrgId={props.myOrgId} />

      {isTC && (canCompleteFCInput || (canRequestFCInput && !collaborators.some(c => ['active', 'completed'].includes(String(c.status))))) && (
        <div id="fc-request-card" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{rl.FC} involvement</h3>
          </div>
          <div className="px-4 py-3">
            <FCInputRequestCard
              canRequest={canRequestFCInput}
              canComplete={canCompleteFCInput}
              coStatus={co.status}
              crewTotal={financials.fcLaborTotal}
              billedUpstream={financials.tcBillableToGC}
              options={fcOrgOptions}
              collaborators={collaborators}
              acting={false}
              creatorCrewName={co.created_by_role === 'FC' ? (fcCollabName || undefined) : undefined}
              onRequest={async (orgId) => { await requestFCInput.mutateAsync(orgId); onRefresh(); }}
              onComplete={async () => { await completeFCInput.mutateAsync(); onRefresh(); }}
            />
          </div>
        </div>
      )}

      {co.pricing_type === 'nte' && co.nte_cap && (
        <CONTEPanel
          co={co}
          nteLog={nteLog}
          usedAmount={financials.laborTotal}
          isGC={isGC}
          isTC={isTC}
          isFC={isFC}
          requestNTEIncrease={requestNTEIncrease}
          approveNTEIncrease={approveNTEIncrease}
          rejectNTEIncrease={rejectNTEIncrease}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
});
