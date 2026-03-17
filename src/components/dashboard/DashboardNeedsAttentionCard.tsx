import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { useProjectInvite } from '@/hooks/useProjectInvite';

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface Props {
  attentionItems: AttentionItem[];
  pendingInvites: PendingInvite[];
  onRefresh?: () => void;
}

const typeConfig: Record<string, { emoji: string; borderColor: string; badge: string; badgeStyle: string }> = {
  invoice: {
    emoji: '💰',
    borderColor: 'border-l-red-500',
    badge: 'Review',
    badgeStyle: 'bg-red-50 text-red-700',
  },
  invite: {
    emoji: '📨',
    borderColor: 'border-l-blue-500',
    badge: 'Respond',
    badgeStyle: 'bg-blue-50 text-blue-700',
  },
  sent_invite: {
    emoji: '📤',
    borderColor: 'border-l-amber-500',
    badge: 'Awaiting',
    badgeStyle: 'bg-amber-50 text-amber-700',
  },
};

export function DashboardNeedsAttentionCard({ attentionItems, pendingInvites, onRefresh }: Props) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading: inviteLoading } = useProjectInvite();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (projectId: string, id: string) => {
    setProcessingId(id);
    const ok = await acceptInvite(projectId);
    if (ok) onRefresh?.();
    setProcessingId(null);
  };

  const handleDecline = async (projectId: string, id: string) => {
    setProcessingId(id);
    const ok = await declineInvite(projectId);
    if (ok) onRefresh?.();
    setProcessingId(null);
  };

  const allItems = [
    ...attentionItems.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.projectName,
      projectId: item.projectId,
      onClick: () => navigate(`/project/${item.projectId}`),
    })),
    ...pendingInvites.map(inv => ({
      id: inv.id,
      type: 'invite' as const,
      title: `Invite: ${inv.projectName}`,
      subtitle: `From ${inv.invitedByOrgName} · ${inv.role}`,
      projectId: inv.projectId,
      onClick: () => {},
    })),
  ];

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Needs Attention</h3>
        {allItems.length > 0 && (
          <span className="text-[0.68rem] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
            {allItems.length}
          </span>
        )}
      </div>

      <div className="px-3.5 md:px-[14px] pb-3 space-y-[5px]">
        {allItems.length === 0 ? (
          <div className="text-center py-8 md:py-6">
            <span className="text-[1.8rem]">🎉</span>
            <p className="text-[0.82rem] text-muted-foreground mt-1">All caught up</p>
          </div>
        ) : (
          allItems.slice(0, 5).map(item => {
            const config = typeConfig[item.type];
            const isIncomingInvite = item.type === 'invite';
            const isProcessing = processingId === item.id;

            if (isIncomingInvite) {
              return (
                <div
                  key={item.id}
                  className={`w-full bg-card border border-border rounded-md border-l-[3px] md:border-l-[2.5px] ${config.borderColor} px-3 md:px-[10px] py-2.5 md:py-[9px] flex items-center gap-2.5 md:gap-2`}
                  style={{ minHeight: '56px' }}
                >
                  <span className="text-base md:text-sm flex-shrink-0">{config.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] md:text-[0.78rem] font-semibold text-foreground truncate">{item.title}</div>
                    <div className="text-[0.72rem] md:text-[0.67rem] text-muted-foreground truncate">{item.subtitle}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(item.projectId, item.id)}
                      disabled={inviteLoading || isProcessing}
                      className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(item.projectId, item.id)}
                      disabled={inviteLoading || isProcessing}
                      className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full text-left bg-card border border-border rounded-md border-l-[3px] md:border-l-[2.5px] ${config.borderColor} px-3 md:px-[10px] py-2.5 md:py-[9px] hover:bg-accent hover:translate-x-px transition-all flex items-center gap-2.5 md:gap-2`}
                style={{ minHeight: '56px' }}
              >
                <span className="text-base md:text-sm flex-shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.82rem] md:text-[0.78rem] font-semibold text-foreground truncate">{item.title}</div>
                  <div className="text-[0.72rem] md:text-[0.67rem] text-muted-foreground truncate">{item.subtitle}</div>
                </div>
                <span className={`text-[0.68rem] md:text-[0.63rem] font-bold px-[7px] py-[2px] rounded-md flex-shrink-0 ${config.badgeStyle}`}>
                  {config.badge}
                </span>
              </button>
            );
          })
        )}
        {allItems.length > 5 && (
          <p className="text-[0.72rem] text-muted-foreground text-center pt-1">
            +{allItems.length - 5} more
          </p>
        )}
      </div>
    </div>
  );
}