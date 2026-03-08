import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, FileText, UserPlus, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProjectInvite } from '@/hooks/useProjectInvite';
import type { AttentionItem } from './NeedsAttentionTile';

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
  onRefresh: () => void;
}

export function DashboardAttentionBanner({ attentionItems, pendingInvites, onRefresh }: DashboardAttentionBannerProps) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading: inviteLoading } = useProjectInvite();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const groupedItems = {
    change_orders: attentionItems.filter(i => i.type === 'change_order'),
    invoices: attentionItems.filter(i => i.type === 'invoice'),
    invites: attentionItems.filter(i => i.type === 'invite'),
  };

  const totalAttention = attentionItems.length + pendingInvites.length;

  if (totalAttention === 0) return null;

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

  const handleWorkOrdersClick = () => {
    if (groupedItems.change_orders.length > 0) {
      navigate(`/project/${groupedItems.change_orders[0].projectId}?tab=work-orders`);
    }
  };

  const handleInvoicesClick = () => {
    if (groupedItems.invoices.length > 0) {
      navigate(`/project/${groupedItems.invoices[0].projectId}?tab=invoices`);
    }
  };

  return (
    <div data-sasha-card="Dashboard Attention" className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
          {totalAttention} item{totalAttention > 1 ? 's' : ''} need{totalAttention === 1 ? 's' : ''} your attention
        </h3>
      </div>

      {/* Action Chips */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {groupedItems.change_orders.length > 0 && (
          <button
            onClick={handleWorkOrdersClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg",
              "bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60",
              "text-amber-800 dark:text-amber-200 text-sm font-medium",
              "transition-colors cursor-pointer min-h-[44px]"
            )}
          >
            <ClipboardList className="h-4 w-4" />
            <span>{groupedItems.change_orders.length} Work Order{groupedItems.change_orders.length > 1 ? 's' : ''} need approval</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />
          </button>
        )}

        {groupedItems.invoices.length > 0 && (
          <button
            onClick={handleInvoicesClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg",
              "bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60",
              "text-amber-800 dark:text-amber-200 text-sm font-medium",
              "transition-colors cursor-pointer min-h-[44px]"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>{groupedItems.invoices.length} Invoice{groupedItems.invoices.length > 1 ? 's' : ''} to review</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />
          </button>
        )}

        {groupedItems.invites.length > 0 && (
          <button
            onClick={() => {}}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg",
              "bg-amber-100/80 dark:bg-amber-900/40",
              "text-amber-800 dark:text-amber-200 text-sm font-medium",
              "min-h-[44px]"
            )}
          >
            <UserPlus className="h-4 w-4" />
            <span>{groupedItems.invites.length} sent invite{groupedItems.invites.length > 1 ? 's' : ''} awaiting response</span>
          </button>
        )}
      </div>

      {/* Pending Invitations (Inline) */}
      {pendingInvites.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
            <UserPlus className="h-4 w-4" />
            Project Invitations
          </div>
          {pendingInvites.slice(0, 5).map((invite) => {
            const isProcessing = processingId === invite.id;
            return (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-100/60 dark:bg-amber-900/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-amber-900 dark:text-amber-100 truncate">
                    {invite.projectName}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {invite.role} • from {invite.invitedByOrgName}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={inviteLoading || isProcessing}
                    className="h-10 text-sm px-4"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invite)}
                    disabled={inviteLoading || isProcessing}
                    className="h-10 text-sm px-4 border-amber-400 dark:border-amber-600"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <X className="h-4 w-4 mr-1" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
          {pendingInvites.length > 5 && (
            <p className="text-sm text-amber-700 dark:text-amber-300 text-center pt-1">
              +{pendingInvites.length - 5} more invitation{pendingInvites.length - 5 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
