import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, cn } from '@/lib/utils';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusMenu, type ProjectStatusFilter } from './StatusMenu';
import { SurfaceCard, SurfaceCardHeader } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';

interface Project {
  id: string;
  name: string;
  project_type: string;
  status: string;
  updated_at: string;
  userRole: string | null;
  contractValue: number | null;
  pendingActions: number;
  contract_mode?: string;
}

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

const STATUS_DOT: Record<string, string> = {
  setup: 'bg-violet-500',
  draft: 'bg-violet-500',
  active: 'bg-emerald-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-muted-foreground',
};

const TITLE_MAP: Record<string, string> = {
  setup: 'Setup Projects',
  active: 'Projects in Progress',
  on_hold: 'On Hold Projects',
  completed: 'Completed Projects',
  archived: 'Archived Projects',
};

interface ProjectSnapshotListProps {
  projects: Project[];
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (f: ProjectStatusFilter) => void;
  statusCounts: { setup: number; active: number; on_hold: number; completed: number; archived: number };
  loading: boolean;
  canCreate: boolean;
  onCreateProject: () => void;
  orgType: string | null;
  orgId?: string;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onStatusChange?: (id: string, status: 'active' | 'on_hold' | 'completed') => void;
  attentionItems?: AttentionItem[];
}

export function ProjectSnapshotList({
  projects,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  loading,
  canCreate,
  onCreateProject,
  attentionItems = [],
}: ProjectSnapshotListProps) {
  const navigate = useNavigate();

  // Build attention map: projectId -> { issueCount, tag }
  const attentionMap = useMemo(() => {
    const map = new Map<string, { issues: string[]; tag: 'watch' | 'at_risk' }>();
    attentionItems.forEach((item) => {
      const existing = map.get(item.projectId);
      const issue =
        item.type === 'invoice'
          ? `Invoice ${item.title} needs review`
          : item.type === 'sent_invite'
          ? `${item.title} invite pending`
          : `Invite pending from ${item.title}`;
      if (existing) {
        existing.issues.push(issue);
      } else {
        map.set(item.projectId, { issues: [issue], tag: 'watch' });
      }
    });
    map.forEach((val) => {
      if (val.issues.length >= 2) val.tag = 'at_risk';
    });
    return map;
  }, [attentionItems]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter === 'setup') return p.status === 'setup' || p.status === 'draft';
      return p.status === statusFilter;
    });
  }, [projects, statusFilter]);

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title={TITLE_MAP[statusFilter] || 'Projects'}
        action={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCreateProject}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                New
              </Button>
            )}
          </div>
        }
      />

      {/* Status filter pills */}
      <div className="px-5">
        <StatusMenu
          currentFilter={statusFilter}
          onFilterChange={onStatusFilterChange}
          counts={statusCounts}
        />
      </div>

      {loading ? (
        <div className="px-5 py-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-accent/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-[0.85rem] text-muted-foreground">
          No {statusFilter} projects
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map((project) => {
            const attention = attentionMap.get(project.id);
            return (
              <button
                key={project.id}
                onClick={() => navigate(`/project/${project.id}/overview`)}
                className="w-full flex items-start sm:items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-accent/40 transition-colors text-left group"
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0', STATUS_DOT[project.status] || 'bg-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.85rem] font-semibold truncate group-hover:text-primary transition-colors">
                    {project.name}
                    {project.contract_mode === 'tm' && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-800 dark:text-amber-300">T&M</span>
                    )}
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground mt-0.5">
                    {project.project_type}
                    {project.pendingActions > 0 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                        · {project.pendingActions} pending
                      </span>
                    )}
                  </p>
                  {/* Mobile: show value + attention inline below */}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                    {attention && (
                      <StatusPill variant={attention.tag}>
                        {attention.tag === 'at_risk' ? 'At Risk' : 'Watch'}
                      </StatusPill>
                    )}
                    {project.contractValue != null && project.contractValue > 0 && (
                      <span className="text-[0.8rem] font-semibold text-foreground tabular-nums">
                        {formatCurrency(project.contractValue)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Desktop: show value + attention on right */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {attention && (
                    <StatusPill variant={attention.tag}>
                      {attention.tag === 'at_risk' ? 'At Risk' : 'Watch'}
                    </StatusPill>
                  )}
                  {project.contractValue != null && project.contractValue > 0 && (
                    <span className="text-[0.85rem] font-semibold text-foreground tabular-nums">
                      {formatCurrency(project.contractValue)}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
              </button>
            );
          })}
        </div>
      )}
    </SurfaceCard>
  );
}
