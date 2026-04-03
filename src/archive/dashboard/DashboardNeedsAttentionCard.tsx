// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, FileText, Wrench, Truck, GitBranch } from 'lucide-react';
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

const typeConfig: Record<string, { icon: React.ElementType; borderColor: string; iconBg: string; iconColor: string; badge: string; badgeStyle: string }> = {
  invoice: {
    icon: FileText,
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    badge: 'Review',
    badgeStyle: 'bg-red-50 text-red-700',
  },
  invite: {
    icon: GitBranch,
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badge: 'Respond',
    badgeStyle: 'bg-blue-50 text-blue-700',
  },
  sent_invite: {
    icon: Truck,
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
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
        <h3 className="card-section-title">Needs Attention</h3>
        {allItems.length > 0 && (
          <span className="text-[0.68rem] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
            {allItems.length}
          </span>
        )}
      </div>

      <div className="px-3.5 pb-3 space-y-[5px]">
        {allItems.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-[1.8rem]">🎉</span>
            <p className="text-[0.82rem] text-muted-foreground mt-1">All caught up</p>
          </div>
        ) : (
          allItems.slice(0, 5).map((item, i) => {
            const config = typeConfig[item.type];
            const IconComp = config.icon;
            const isIncomingInvite = item.type === 'invite';
            const isProcessing = processingId === item.id;

            if (isIncomingInvite) {
              return (
                <div
                  key={item.id}
                  className={`w-full bg-card border border-border rounded-md border-l-[3px] ${config.borderColor} px-3 py-2.5 flex items-center gap-2.5 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]`}
                  style={{ animationDelay: `${300 + i * 50}ms`, minHeight: '56px' }}
                >
                  <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}>
                    <IconComp className={`h-4 w-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.82rem] font-semibold text-foreground truncate">{item.title}</div>
                    <div className="text-[0.72rem] text-muted-foreground truncate">{item.subtitle}</div>
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
                className={`w-full text-left bg-card border border-border rounded-md border-l-[3px] ${config.borderColor} px-3 py-2.5 hover:bg-accent/50 hover:translate-x-px transition-all flex items-center gap-2.5 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]`}
                style={{ animationDelay: `${300 + i * 50}ms`, minHeight: '56px' }}
              >
                <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0`}>
                  <IconComp className={`h-4 w-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.82rem] font-semibold text-foreground truncate">{item.title}</div>
                  <div className="text-[0.72rem] text-muted-foreground truncate">{item.subtitle}</div>
                </div>
                <span className={`text-[0.68rem] font-bold px-[7px] py-[2px] rounded-md flex-shrink-0 ${config.badgeStyle}`}>
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
