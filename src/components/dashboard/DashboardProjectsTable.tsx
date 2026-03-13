import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Project {
  id: string;
  name: string;
  status: string;
  project_type: string;
  contractValue: number | null;
  pendingActions: number;
}

interface Props {
  projects: Project[];
  loading: boolean;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  setup: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-accent text-muted-foreground',
  completed: 'bg-accent text-muted-foreground',
  archived: 'bg-accent text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  setup: 'Setup',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const projectColors = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#059669', '#D97706', '#7C3AED', '#DC2626', '#2563EB'];

export function DashboardProjectsTable({ projects, loading }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const activeProjects = projects.filter(p => !['archived'].includes(p.status));
  const totalValue = activeProjects.reduce((sum, p) => sum + (p.contractValue || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] md:text-[1rem] font-bold text-foreground">Active Projects</h3>
        <span className="text-[0.75rem] font-medium text-muted-foreground">
          {activeProjects.length} active
        </span>
      </div>

      {loading ? (
        <div className="px-4 pb-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-accent rounded-lg animate-pulse" />
          ))}
        </div>
      ) : activeProjects.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="text-[1.8rem]">📋</span>
          <p className="text-[0.82rem] text-muted-foreground mt-1">No projects yet</p>
        </div>
      ) : isMobile ? (
        /* ── Mobile: Stacked card rows ── */
        <div className="divide-y divide-border">
          {activeProjects.slice(0, 6).map((project, idx) => (
            <button
              key={project.id}
              className="w-full text-left px-4 py-3 hover:bg-[hsl(var(--amber-pale))] transition-colors active:bg-[hsl(var(--amber-pale))]"
              style={{ minHeight: '60px' }}
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: projectColors[idx % projectColors.length] }}
                  />
                  <span className="text-[0.85rem] font-semibold text-foreground truncate">
                    {project.name}
                  </span>
                </div>
                <span className="text-[0.82rem] font-semibold text-foreground ml-2 shrink-0">
                  {formatCurrency(project.contractValue)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 pl-4">
                <span className="text-[0.72rem] text-muted-foreground capitalize">
                  {project.project_type?.replace(/_/g, ' ') || '—'}
                </span>
                <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-[10px] ${statusStyles[project.status] || statusStyles.active}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* ── Desktop: Table ── */
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-y border-border bg-accent">
                <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Project</th>
                <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium hidden sm:table-cell">Type</th>
                <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium hidden md:table-cell">Value</th>
                <th className="px-[18px] py-[7px] text-[0.64rem] uppercase tracking-[0.8px] text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.slice(0, 6).map((project, idx) => (
                <tr
                  key={project.id}
                  className="border-b border-border cursor-pointer hover:bg-[hsl(var(--amber-pale))] transition-colors"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <td className="px-[18px] py-[10px]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: projectColors[idx % projectColors.length] }}
                      />
                      <span className="text-[0.8rem] font-semibold text-foreground truncate max-w-[200px]">
                        {project.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-[18px] py-[10px] hidden sm:table-cell">
                    <span className="text-[0.75rem] text-muted-foreground capitalize">
                      {project.project_type?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-[18px] py-[10px] hidden md:table-cell">
                    <span className="text-[0.8rem] font-semibold text-foreground">
                      {formatCurrency(project.contractValue)}
                    </span>
                  </td>
                  <td className="px-[18px] py-[10px]">
                    <span className={`text-[0.63rem] font-bold px-2 py-0.5 rounded-[10px] ${statusStyles[project.status] || statusStyles.active}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeProjects.length > 0 && (
        <div className="flex items-center justify-between px-4 py-[11px] bg-accent border-t border-border">
          <span className="text-[0.72rem] text-muted-foreground">Portfolio Total</span>
          <span className="font-heading text-[1.1rem] font-black text-secondary">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}
    </div>
  );
}
