import { useMemo, useState } from 'react';
import { Loader2, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { COCollaborator, COFCOrgOption } from '@/types/changeOrder';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';

interface FCInputRequestCardProps {
  canRequest: boolean;
  canComplete: boolean;
  options: COFCOrgOption[];
  collaborators: COCollaborator[];
  acting: boolean;
  /** Set when the crew company itself created this work order (no invite row exists). */
  creatorCrewName?: string;
  /** Change order status — after submission crew pricing is a private sub↔crew agreement. */
  coStatus?: string;
  /** Crew's priced total on this change order. */
  crewTotal?: number;
  /** What the subcontractor bills the general contractor for labor. */
  billedUpstream?: number;
  onRequest: (orgId: string) => Promise<void>;
  onComplete: () => Promise<void>;
}

const fmt = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FCInputRequestCard({
  canRequest,
  canComplete,
  options,
  collaborators,
  acting,
  creatorCrewName,
  coStatus,
  crewTotal = 0,
  billedUpstream = 0,
  onRequest,
  onComplete,
}: FCInputRequestCardProps) {
  const afterSubmission = ['submitted', 'approved', 'contracted'].includes(coStatus ?? '');
  const overBilled = crewTotal > 0 && billedUpstream > 0 && crewTotal > billedUpstream + 0.005;
  const rl = useRoleLabelsContext();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const activeCollaborator = useMemo(
    () => collaborators.find(collaborator => collaborator.status === 'active') ?? null,
    [collaborators]
  );

  const completedCollaborator = useMemo(
    () => collaborators.find(collaborator => collaborator.status === 'completed') ?? null,
    [collaborators]
  );

  const statusLabel = activeCollaborator
    ? `Waiting on ${rl.FC}`
    : completedCollaborator
      ? `${rl.FC} input complete`
      : creatorCrewName
        ? `Input received from ${creatorCrewName}`
        : `No ${rl.FC.toLowerCase()} requested yet`;

  const selectedValue = selectedOrgId || activeCollaborator?.organization_id || '';

  return (
    <div className="co-light-shell overflow-hidden">
      <div className="px-4 py-3 border-b border-border co-light-header">
        <h3 className="text-sm font-semibold text-foreground">{rl.FC} involvement</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-foreground">{statusLabel}</p>
          {(activeCollaborator ?? completedCollaborator)?.organization?.name ? (
            <p className="text-xs text-muted-foreground">
              {(activeCollaborator ?? completedCollaborator)?.organization?.name}
            </p>
          ) : creatorCrewName ? (
            <p className="text-xs text-muted-foreground">
              {creatorCrewName} created this work order and logged their own pricing.
            </p>
          ) : null}
        </div>

        {afterSubmission && (
          <p className="text-xs text-muted-foreground break-words">
            {rl.FC} pricing after submission is between you and your {rl.FC.toLowerCase()}. It does not change the price sent to the {rl.GC}.
          </p>
        )}

        {overBilled && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive break-words">
            {rl.FC} price ({fmt(crewTotal)}) exceeds your billed amount ({fmt(billedUpstream)}).
          </div>
        )}

        {canRequest && (
          <div className="space-y-2">
            <Label htmlFor="fc-org-select">Assign {rl.FC.toLowerCase()}</Label>
            <Select value={selectedValue} onValueChange={setSelectedOrgId}>
              <SelectTrigger id="fc-org-select">
                <SelectValue placeholder="Choose a company" />
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full h-8 text-xs gap-1"
              disabled={acting || !selectedValue}
              onClick={() => void onRequest(selectedValue)}
            >
              {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRoundPlus className="h-3 w-3" />}
              {activeCollaborator ? `Re-request ${rl.FC} input` : `Request ${rl.FC} input`}
            </Button>
          </div>
        )}

        {canComplete && activeCollaborator && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            disabled={acting}
            onClick={() => void onComplete()}
          >
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Mark FC input complete
          </Button>
        )}
      </div>
    </div>
  );
}
