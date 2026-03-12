import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, UserPlus, ChevronRight, Loader2, Check, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useProjectInvite } from '@/hooks/useProjectInvite';
import type { AttentionItem } from './NeedsAttentionTile';
import type { Reminder } from './RemindersTile';

export interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface DashboardAttentionBannerProps {
  attentionItems: AttentionItem[];
  pendingInvites: PendingInvite[];
  reminders: Reminder[];
  onRefresh: () => void;
}

export function DashboardAttentionBanner({ attentionItems, pendingInvites, reminders, onRefresh }: DashboardAttentionBannerProps) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading: inviteLoading } = useProjectInvite();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const changeOrders = attentionItems.filter(i => i.type === 'change_order');
  const invoices = attentionItems.filter(i => i.type === 'invoice');
  const sentInvites = attentionItems.filter(i => i.type === 'invite');
  const upcomingReminders = reminders.filter(r => !r.completed).slice(0, 3);

  const totalItems = attentionItems.length + pendingInvites.length;

  if (totalItems === 0 && upcomingReminders.length === 0) return null;

  const handleAccept = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const success = await acceptInvite(invite.projectId);
    if (success) onRefresh();
    setProcessingId(null);
  };

  const handleDecline = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    const success = await declineInvite(invite.projectId);
    if (success) onRefresh();
    setProcessingId(null);
  };

  return (
    <Card data-sasha-card="Action Items">
      <CardContent className="p-4 space-y-1">
        {/* Urgent: Work Orders needing approval */}
        {changeOrders.length > 0 && (
          <ActionRow
            icon={<ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            severity="amber"
            onClick={() => navigate(`/project/${changeOrders[0].projectId}?tab=work-orders`)}
          >
            <span className="font-medium">{changeOrders.length} Work Order{changeOrders.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground"> need approval</span>
            {changeOrders.length === 1 && (
              <span className="text-muted-foreground"> · {changeOrders[0].projectName}</span>
            )}
          </ActionRow>
        )}

        {/* Invoices to review */}
        {invoices.length > 0 && (
          <ActionRow
            icon={<FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            severity="blue"
            onClick={() => navigate(`/project/${invoices[0].projectId}?tab=invoices`)}
          >
            <span className="font-medium">{invoices.length} Invoice{invoices.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground"> to review</span>
            {invoices.length === 1 && (
              <span className="text-muted-foreground"> · {invoices[0].projectName}</span>
            )}
          </ActionRow>
        )}

        {/* Sent invites awaiting response */}
        {sentInvites.length > 0 && (
          <ActionRow
            icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
            severity="muted"
          >
            <span className="font-medium">{sentInvites.length} invite{sentInvites.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground"> awaiting response</span>
          </ActionRow>
        )}

        {/* Upcoming reminders */}
        {upcomingReminders.length > 0 && (
          <ActionRow
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            severity="muted"
            onClick={() => navigate('/reminders')}
          >
            <span className="font-medium">{upcomingReminders.length} reminder{upcomingReminders.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground"> upcoming</span>
          </ActionRow>
        )}

        {/* Incoming project invitations */}
        {pendingInvites.length > 0 && (
          <div className="pt-2 space-y-2">
            {pendingInvites.slice(0, 3).map((invite) => {
              const isProcessing = processingId === invite.id;
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{invite.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · from {invite.invitedByOrgName}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invite)}
                      disabled={inviteLoading || isProcessing}
                      className="h-9 text-sm px-3"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(invite)}
                      disabled={inviteLoading || isProcessing}
                      className="h-9 text-sm px-3"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingInvites.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{pendingInvites.length - 3} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  icon,
  severity,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  severity: 'amber' | 'blue' | 'muted';
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left min-h-[44px] transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/60',
      )}
    >
      {icon}
      <div className="flex-1 min-w-0 truncate">{children}</div>
      {onClick && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
    </Comp>
  );
}
