import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sendCONotification, buildCONotification } from '@/lib/coNotifications';
import { toast } from 'sonner';
import type { ChangeOrder, COCollaborator } from '@/types/changeOrder';

interface COAcceptBannerProps {
  co: ChangeOrder;
  projectId: string;
  myOrgId: string;
  collaborators: COCollaborator[];
  onRefresh: () => void;
}

export function COAcceptBanner({ co, projectId, myOrgId, collaborators, onRefresh }: COAcceptBannerProps) {
  const navigate = useNavigate();
  const [acting, setActing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Find an invited collaborator row for current org
  const invitation = collaborators.find(
    c => c.organization_id === myOrgId && c.status === 'invited'
  );

  if (!invitation || accepted) return null;

  // Resolve inviter org name. The CO creator (co.org_id) is always the inviter — fall
  // back to "Someone" only when neither the creator nor a collaborator row matches.
  const inviterFromCollaborators = collaborators.find(c => c.organization_id === co.org_id);
  const inviterOrgName = co.org_id === myOrgId
    ? 'Your organization'
    : inviterFromCollaborators?.organization?.name ?? 'Someone';

  async function handleAccept() {
    setActing(true);
    try {
      const { error } = await supabase
        .from('change_order_collaborators')
        .update({ status: 'active', accepted_at: new Date().toISOString() })
        .eq('id', invitation!.id);
      if (error) throw error;

      // Notify CO creator
      const { title, body } = buildCONotification('CO_ACCEPTED', co.title);
      await sendCONotification({
        recipient_user_id: co.created_by_user_id,
        recipient_org_id: co.org_id,
        co_id: co.id,
        project_id: projectId,
        type: 'CO_ACCEPTED',
        title,
        body,
      });

      toast.success('Invitation accepted');
      setAccepted(true);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to accept');
    } finally {
      setActing(false);
    }
  }

  async function handleDecline() {
    setActing(true);
    try {
      const { error } = await supabase
        .from('change_order_collaborators')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', invitation!.id);
      if (error) throw error;

      const { title, body } = buildCONotification('CO_REJECTED', co.title);
      await sendCONotification({
        recipient_user_id: co.created_by_user_id,
        recipient_org_id: co.org_id,
        co_id: co.id,
        project_id: projectId,
        type: 'CO_REJECTED',
        title,
        body,
      });

      toast.success('Invitation declined');
      navigate(`/project/${projectId}/change-orders`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to decline');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {inviterOrgName} invited you to this CO
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Accept to start collaborating, or decline to remove yourself.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={acting}
          onClick={handleDecline}
          className="h-8 text-xs gap-1"
        >
          {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
          Decline
        </Button>
        <Button
          size="sm"
          disabled={acting}
          onClick={handleAccept}
          className="h-8 text-xs gap-1"
        >
          {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          Accept
        </Button>
      </div>
    </div>
  );
}
