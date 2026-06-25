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

interface FCInputRequestCardProps {
  canRequest: boolean;
  canComplete: boolean;
  options: COFCOrgOption[];
  collaborators: COCollaborator[];
  acting: boolean;
  onRequest: (orgId: string) => Promise<void>;
  onComplete: () => Promise<void>;
}

export function FCInputRequestCard({
  canRequest,
  canComplete,
  options,
  collaborators,
  acting,
  onRequest,
  onComplete,
}: FCInputRequestCardProps) {
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
    ? 'Waiting on FC input'
    : completedCollaborator
      ? 'FC input complete'
      : 'No FC requested yet';

  const selectedValue = selectedOrgId || activeCollaborator?.organization_id || '';

  return (
    <div className="co-light-shell overflow-hidden">
      <div className="px-4 py-3 border-b border-border co-light-header">
        <h3 className="text-sm font-semibold text-foreground">Field crew involvement</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-foreground">{statusLabel}</p>
          {(activeCollaborator ?? completedCollaborator)?.organization?.name && (
            <p className="text-xs text-muted-foreground">
              {(activeCollaborator ?? completedCollaborator)?.organization?.name}
            </p>
          )}
        </div>

        {canRequest && (
          <div className="space-y-2">
            <Label htmlFor="fc-org-select">Assign field crew</Label>
            <Select value={selectedValue} onValueChange={setSelectedOrgId}>
              <SelectTrigger id="fc-org-select">
                <SelectValue placeholder="Choose a field crew org" />
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
              {activeCollaborator ? 'Re-request FC input' : 'Request FC input'}
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
