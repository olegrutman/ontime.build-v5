import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardFooter } from '@/components/ui/surface-card';
import { CollapseToggle } from '@/components/ui/collapse-toggle';

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

  const byProject = new Map<string, { projectName: string; projectId: string; issues: string[]; tag: 'watch' | 'at_risk' }>();
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
        tag: 'watch',
      });
    }
  });

  byProject.forEach((val) => {
    if (val.issues.length >= 2) val.tag = 'at_risk';
  });

  const allItems = Array.from(byProject.values());
  const visibleItems = expanded ? allItems : allItems.slice(0, 3);
  const hasMore = allItems.length > 3;

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title="Projects needing attention"
        subtitle="The jobs most likely to hurt your margin or schedule first"
        action={
          <button
            onClick={() => document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-[0.8rem] text-primary font-medium hover:underline shrink-0"
          >
            See all projects
          </button>
        }
      />
      <div className="divide-y divide-border/40">
        {visibleItems.map((item) => (
          <button
            key={item.projectId}
            onClick={() => navigate(`/project/${item.projectId}/overview`)}
            className="w-full px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-accent/40 transition-colors text-left"
          >
            <div className="min-w-0">
              <p className="text-[0.85rem] font-semibold">{item.projectName}</p>
              <p className="text-[0.8rem] text-muted-foreground mt-0.5">{item.issues.join(' · ')}</p>
            </div>
            <StatusPill variant={item.tag}>
              {item.tag === 'at_risk' ? 'At Risk' : 'Watch'}
            </StatusPill>
          </button>
        ))}
      </div>
      {hasMore && (
        <SurfaceCardFooter>
          <CollapseToggle expanded={expanded} totalCount={allItems.length} onToggle={() => setExpanded(!expanded)} />
        </SurfaceCardFooter>
      )}
    </SurfaceCard>
  );
}
