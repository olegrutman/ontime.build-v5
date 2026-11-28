import { COReviewHistory } from '@/components/change-orders/COReviewHistory';
import { forwardRef } from 'react';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { useCORoutingTargets } from '@/hooks/useCORoutingTargets';
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
  requestFCInput: { mutateAsync: (orgId: string) => Promise<any>; isPending?: boolean };
  completeFCInput: { mutateAsync: () => Promise<any>; isPending?: boolean };
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
    requestFCInput, completeFCInput,
    onRefresh, financials,
  } = props;
  const rl = useRoleLabelsContext();
  const { data: routing } = useCORoutingTargets(props.projectId);
  const ownCollaborator = collaborators.find(c => c.organization_id === props.myOrgId && ['active', 'completed'].includes(String(c.status)));
  const showCrewCard = isFC && !!ownCollaborator;
  const showSubcontractorCard = isTC && (collaborators.length > 0 || canRequestFCInput);

  return (
    <div ref={ref} className="space-y-3">
      <COTeamCard co={co} collaborators={collaborators} />

      <COReviewHistory coId={co.id} />

      <COSOVPanel coId={co.id} isGC={isGC} isTC={isTC} isFC={isFC} myOrgId={props.myOrgId} />

      {(showSubcontractorCard || showCrewCard) && (
        <div id="fc-request-card" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{showCrewCard ? 'Your input handoff' : `${rl.FC} involvement`}</h3>
          </div>
          <div className="px-4 py-3">
            <FCInputRequestCard
              canRequest={showSubcontractorCard && canRequestFCInput}
              canComplete={showCrewCard && canCompleteFCInput}
              recipientName={showCrewCard ? (routing?.targets[0]?.name ?? rl.TC) : undefined}
              coStatus={co.status}
              crewTotal={financials.fcLaborTotal}
              billedUpstream={showCrewCard ? 0 : financials.tcBillableToGC}
              options={fcOrgOptions}
              collaborators={showCrewCard ? collaborators.filter(c => c.organization_id === props.myOrgId) : collaborators}
              acting={!!(requestFCInput.isPending || completeFCInput.isPending)}
              creatorCrewName={co.created_by_role === 'FC' ? (fcCollabName || undefined) : undefined}
              onRequest={async (orgId) => { await requestFCInput.mutateAsync(orgId); onRefresh(); }}
              onComplete={async () => { await completeFCInput.mutateAsync(); onRefresh(); }}
            />
          </div>
        </div>
      )}

    </div>
  );
});
