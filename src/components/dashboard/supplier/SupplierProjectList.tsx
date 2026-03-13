import { useNavigate } from 'react-router-dom';
import type { ProjectHealthRow } from '@/hooks/useSupplierDashboardData';
import { formatCurrency } from '@/lib/utils';

interface Props {
  projects: ProjectHealthRow[];
}

export function SupplierProjectList({ projects }: Props) {
  const navigate = useNavigate();

  // Deduplicate by projectId (projectHealth already has unique projects)
  const uniqueProjects = projects;

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          My Projects
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">
          {uniqueProjects.length} active project{uniqueProjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-border">
        {uniqueProjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-[0.78rem] text-muted-foreground">No projects yet</p>
          </div>
        ) : (
          uniqueProjects.map(proj => (
            <button
              key={proj.projectId}
              onClick={() => navigate(`/project/${proj.projectId}`)}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[0.82rem] font-semibold text-foreground truncate">
                  {proj.projectName}
                </div>
                <div className="text-[0.67rem] text-muted-foreground truncate">
                  GC: {proj.gcName}
                </div>
              </div>
              {proj.deliveredTotal > 0 && (
                <span className="text-[0.72rem] font-semibold text-foreground flex-shrink-0">
                  {formatCurrency(proj.deliveredTotal)} delivered
                </span>
              )}
              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
