import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectInvite } from '@/hooks/useProjectInvite';

export interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface PendingInvitesPanelProps {
  invites: PendingInvite[];
  onRefresh: () => void;
}

export function PendingInvitesPanel({ invites, onRefresh }: PendingInvitesPanelProps) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading } = useProjectInvite();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (invites.length === 0) {
    return null;
  }

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const success = await acceptInvite(invite.projectId);
    if (success) {
      onRefresh();
    }
    setProcessingId(null);
  };

  const handleDecline = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const success = await declineInvite(invite.projectId);
    if (success) {
      onRefresh();
    }
    setProcessingId(null);
  };

  return (
    <Card className="border-primary/30 dark:border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Project Invitations ({invites.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.slice(0, 5).map((invite) => {
          const isProcessing = processingId === invite.id;
          return (
            <div
              key={invite.id}
              className="p-3 border rounded-lg bg-muted/30 space-y-2"
            >
              <div>
                <p className="font-medium text-sm">{invite.projectName}</p>
                <p className="text-xs text-muted-foreground">
                  Invited as {invite.role} by {invite.invitedByOrgName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(invite)}
                  disabled={loading || isProcessing}
                  className="h-7 text-xs"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(invite)}
                  disabled={loading || isProcessing}
                  className="h-7 text-xs"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
        {invites.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{invites.length - 5} more invitations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
