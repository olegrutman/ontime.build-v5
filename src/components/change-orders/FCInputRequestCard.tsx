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
  const crewName = (activeCollaborator ?? completedCollaborator)?.organization?.name ?? creatorCrewName;
  // Crew already known (it created the order or was requested) — no company picker needed.
  const showPicker = canRequest && !crewName;
  const [showChange, setShowChange] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground break-words">{crewName ?? `No ${rl.FC.toLowerCase()} yet`}</p>
          <p className="text-xs text-muted-foreground break-words">
            {creatorCrewName && !activeCollaborator && !completedCollaborator
              ? 'Created this work order and logged their pricing'
              : statusLabel}
          </p>
        </div>
        {crewName && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {activeCollaborator ? 'Waiting' : 'Received'}
          </span>
        )}
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

      {canRequest && crewName && !showChange && activeCollaborator && (
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowChange(true)}>
          Request a different {rl.FC.toLowerCase()}
        </button>
      )}

      {(showPicker || showChange) && (
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
            Mark {rl.FC.toLowerCase()} input complete
          </Button>
        )}
    </div>
  );
}
