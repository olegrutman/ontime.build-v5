import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

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

export function DashboardAttentionList({ attentionItems, pendingInvitesCount }: DashboardAttentionListProps) {
  const navigate = useNavigate();
  const totalCount = attentionItems.length + pendingInvitesCount;
  const [expanded, setExpanded] = useState(false);

  if (totalCount === 0) return null;

  const byProject = new Map<string, { projectName: string; projectId: string; issues: string[]; tag: string }>();
  attentionItems.forEach((item) => {
    const existing = byProject.get(item.projectId);
    const issue = item.type === 'invoice' ? `Invoice ${item.title} needs review` : item.type === 'sent_invite' ? `${item.title} invite pending` : `Invite pending from ${item.title}`;
    if (existing) {
      existing.issues.push(issue);
    } else {
      byProject.set(item.projectId, {
        projectName: item.projectName,
        projectId: item.projectId,
        issues: [issue],
        tag: 'Watch',
      });
    }
  });

  byProject.forEach((val) => {
    if (val.issues.length >= 2) val.tag = 'At Risk';
  });

  const allItems = Array.from(byProject.values());
  const visibleItems = expanded ? allItems : allItems.slice(0, 3);
  const hasMore = allItems.length > 3;

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Projects needing attention</h3>
          <p className="text-sm text-muted-foreground">The jobs most likely to hurt your margin or schedule first</p>
        </div>
        <button
          onClick={() => document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm text-primary font-medium hover:underline shrink-0"
        >
          See all projects
        </button>
      </div>
      <div className="divide-y divide-border/40">
        {visibleItems.map((item) => (
          <button
            key={item.projectId}
            onClick={() => navigate(`/project/${item.projectId}/overview`)}
            className="w-full p-5 flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors text-left"
          >
            <div className="min-w-0">
              <p className="font-semibold">{item.projectName}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.issues.join(' · ')}</p>
            </div>
            <span className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold shrink-0',
              item.tag === 'At Risk' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
            )}>
              {item.tag}
            </span>
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-sm text-primary font-medium hover:bg-accent/30 transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? 'Show less' : `Show all (${allItems.length})`}
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
