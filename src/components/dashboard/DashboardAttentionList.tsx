import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface DashboardAttentionListProps {
  attentionItems: AttentionItem[];
  pendingInvitesCount: number;
}

const TYPE_CONFIG = {
  invoice: { icon: FileText, label: 'Invoice needs review', color: 'text-amber-600 dark:text-amber-400' },
  invite: { icon: Mail, label: 'Invite pending', color: 'text-blue-600 dark:text-blue-400' },
  sent_invite: { icon: Mail, label: 'Awaiting response', color: 'text-muted-foreground' },
};

export function DashboardAttentionList({ attentionItems, pendingInvitesCount }: DashboardAttentionListProps) {
  const navigate = useNavigate();
  const totalCount = attentionItems.length + pendingInvitesCount;

  if (totalCount === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Needs Attention</h3>
        <span className="ml-auto text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
          {totalCount}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {attentionItems.slice(0, 6).map((item) => {
          const config = TYPE_CONFIG[item.type];
          const Icon = config.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'invoice') {
                  navigate(`/project/${item.projectId}/invoices?highlight=${item.id}`);
                } else {
                  navigate(`/project/${item.projectId}/overview`);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-left"
            >
              <Icon className={cn('w-4 h-4 shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{config.label} · {item.projectName}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
