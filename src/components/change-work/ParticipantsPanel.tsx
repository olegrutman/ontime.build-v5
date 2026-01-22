import { useState } from 'react';
import { WorkItemParticipant } from '@/types/changeWork';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, X, Check } from 'lucide-react';

interface ParticipantsPanelProps {
  participants: WorkItemParticipant[];
  workItemId: string;
  readOnly?: boolean;
  onInvite: (data: { work_item_id: string; org_code: string }) => void;
  onRemove: (data: { id: string; work_item_id: string }) => void;
}

export function ParticipantsPanel({
  participants,
  workItemId,
  readOnly = false,
  onInvite,
  onRemove,
}: ParticipantsPanelProps) {
  const [orgCode, setOrgCode] = useState('');

  const handleInvite = () => {
    if (!orgCode.trim()) return;
    onInvite({ work_item_id: workItemId, org_code: orgCode.trim() });
    setOrgCode('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Participants</h4>
        <Badge variant="secondary">{participants.length} invited</Badge>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {participant.organization?.name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {participant.organization?.org_code}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {participant.accepted_at ? (
                <Badge variant="default" className="gap-1">
                  <Check className="w-3 h-3" />
                  Accepted
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
              {!readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  onClick={() => onRemove({ id: participant.id, work_item_id: workItemId })}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {participants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No participants invited yet
          </p>
        )}
      </div>

      {!readOnly && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <Label className="text-sm font-medium mb-2 block">
            Invite by Org Code
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., ACME-TC"
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
              className="flex-1 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={!orgCode.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Invite
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter the organization code to invite them as a participant
          </p>
        </div>
      )}
    </div>
  );
}
