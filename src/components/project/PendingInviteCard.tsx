import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectInvite } from '@/hooks/useProjectInvite';

interface PendingInviteCardProps {
  projectId: string;
}

export function PendingInviteCard({ projectId }: PendingInviteCardProps) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading } = useProjectInvite();
  const [responded, setResponded] = useState(false);

  const handleAccept = async () => {
    const ok = await acceptInvite(projectId);
    if (ok) {
      setResponded(true);
      // Reload the page to fetch the project now that access is granted
      window.location.reload();
    }
  };

  const handleDecline = async () => {
    const ok = await declineInvite(projectId);
    if (ok) {
      setResponded(true);
      navigate('/dashboard');
    }
  };

  if (responded) return null;

  return (
    <div className="max-w-md w-full bg-card border rounded-xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Project Invitation</h2>
          <p className="text-sm text-muted-foreground">You've been invited to join this project</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleAccept} disabled={loading} className="flex-1 gap-1.5">
          <Check className="h-4 w-4" /> Accept
        </Button>
        <Button onClick={handleDecline} disabled={loading} variant="outline" className="flex-1 gap-1.5">
          <X className="h-4 w-4" /> Decline
        </Button>
      </div>
    </div>
  );
}
