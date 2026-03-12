import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';

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
  const activeProjects = projects.filter(p => !['archived'].includes(p.status));
  const totalValue = activeProjects.reduce((sum, p) => sum + (p.contractValue || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground">Active Projects</h3>
        <button
          onClick={() => navigate('/projects')}
          className="text-[0.75rem] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          All Projects →
        </button>
      </div>

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
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-[18px] py-3" colSpan={4}>
                    <div className="h-5 bg-accent rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : activeProjects.length === 0 ? (
              <tr>
                <td className="px-[18px] py-6 text-center text-[0.8rem] text-muted-foreground" colSpan={4}>
                  No projects yet
                </td>
              </tr>
            ) : (
              activeProjects.slice(0, 6).map((project, idx) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeProjects.length > 0 && (
        <div className="flex items-center justify-between px-[18px] py-[11px] bg-accent border-t border-border">
          <span className="text-[0.72rem] text-muted-foreground">Portfolio Total</span>
          <span className="font-heading text-[1.1rem] font-black text-secondary">
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}
    </div>
  );
}
