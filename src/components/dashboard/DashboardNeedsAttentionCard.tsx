import { useNavigate } from 'react-router-dom';

interface AttentionItem {
  id: string;
  type: 'change_order' | 'invoice' | 'invite';
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
}

const typeConfig: Record<string, { emoji: string; borderColor: string; badge: string; badgeStyle: string }> = {
  invoice: {
    emoji: '💰',
    borderColor: 'border-l-red-500',
    badge: 'Review',
    badgeStyle: 'bg-red-50 text-red-700',
  },
  change_order: {
    emoji: '⚒',
    borderColor: 'border-l-amber-500',
    badge: 'Pending',
    badgeStyle: 'bg-amber-50 text-amber-700',
  },
  invite: {
    emoji: '📨',
    borderColor: 'border-l-blue-500',
    badge: 'Respond',
    badgeStyle: 'bg-blue-50 text-blue-700',
  },
};

export function DashboardNeedsAttentionCard({ attentionItems, pendingInvites }: Props) {
  const navigate = useNavigate();

  const allItems = [
    ...attentionItems.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.projectName,
      onClick: () => navigate(`/project/${item.projectId}`),
    })),
    ...pendingInvites.map(inv => ({
      id: inv.id,
      type: 'invite' as const,
      title: `Invite: ${inv.projectName}`,
      subtitle: `From ${inv.invitedByOrgName} · ${inv.role}`,
      onClick: () => navigate(`/project/${inv.projectId}`),
    })),
  ];

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-[18px] py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Needs Attention</h3>
        {allItems.length > 0 && (
          <span className="text-[0.68rem] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
            {allItems.length}
          </span>
        )}
      </div>

      <div className="px-[14px] pb-3 space-y-[5px]">
        {allItems.length === 0 ? (
          <div className="text-center py-6 text-[0.8rem] text-muted-foreground">
            All caught up 🎉
          </div>
        ) : (
          allItems.slice(0, 5).map(item => {
            const config = typeConfig[item.type] || typeConfig.change_order;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full text-left bg-card border border-border rounded-md border-l-[2.5px] ${config.borderColor} px-[10px] py-[9px] hover:bg-accent hover:translate-x-px transition-all flex items-center gap-2`}
              >
                <span className="text-sm flex-shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.78rem] font-semibold text-foreground truncate">{item.title}</div>
                  <div className="text-[0.67rem] text-muted-foreground truncate">{item.subtitle}</div>
                </div>
                <span className={`text-[0.63rem] font-bold px-[7px] py-[2px] rounded-md flex-shrink-0 ${config.badgeStyle}`}>
                  {config.badge}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
