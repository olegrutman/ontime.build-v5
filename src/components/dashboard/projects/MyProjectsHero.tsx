import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { C, fontLabel, fontVal } from '@/components/shared/KpiCard';
import { RichProjectCard } from './RichProjectCard';
import { resolveProjectNextAction } from './projectNextAction';
import type { RecentDoc, ProjectFinancialDetail } from '@/hooks/useDashboardData';

interface ProjectWithDetails {
  id: string;
  name: string;
  status: string;
  contractValue: number | null;
}

interface AttentionItem {
  id: string;
  type: 'invoice' | 'invite' | 'sent_invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface MyProjectsHeroProps {
  projects: ProjectWithDetails[];
  projectFinancials: ProjectFinancialDetail[];
  recentDocs: RecentDoc[];
  attentionItems: AttentionItem[];
  orgType: 'GC' | 'TC' | 'FC' | string | null;
}

const ROLE_LABELS: Record<string, { contract: string; cost: string }> = {
  GC: { contract: 'Owner Contract', cost: 'Subs Cost' },
  TC: { contract: 'GC Contract', cost: 'FC + Materials' },
  FC: { contract: 'TC/GC Contract', cost: 'Labor Cost' },
};

export function MyProjectsHero({
  projects,
  projectFinancials,
  recentDocs,
  attentionItems,
  orgType,
}: MyProjectsHeroProps) {
  const navigate = useNavigate();
  const active = projects.filter((p) => !['archived', 'completed'].includes(p.status));
  const labels = ROLE_LABELS[orgType || 'TC'] || ROLE_LABELS.TC;
  const hideCost = orgType === 'FC'; // FC shouldn't see upstream pricing

  const pfMap = new Map(projectFinancials.map((p) => [p.projectId, p]));

  return (
    <section
      style={{
        background: 'transparent',
        display: 'flex', flexDirection: 'column', gap: 12,
        ...fontLabel,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: '1.1rem', color: C.ink, ...fontVal,
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            My Projects
          </span>
          <span style={{ fontSize: '0.72rem', color: C.faint, fontWeight: 600 }}>
            {active.length} active · {projects.length} total
          </span>
        </div>
        <button
          onClick={() => navigate('/create-project')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: C.navy, color: '#FFF',
            fontSize: '0.72rem', fontWeight: 700, ...fontLabel,
            border: 'none', cursor: 'pointer',
            flexShrink: 0,
          }}
          className="hover:brightness-110"
          aria-label="New Project"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">New Project</span>
        </button>

      </header>

      {projects.length === 0 ? (
        <div
          style={{
            background: C.surface,
            borderRadius: 14,
            border: `1px dashed ${C.border}`,
            padding: '32px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            textAlign: 'center',
          }}
        >
          <FolderOpen size={32} color={C.faint} />
          <div style={{ fontSize: '0.95rem', color: C.ink, fontWeight: 700 }}>No projects yet</div>
          <div style={{ fontSize: '0.78rem', color: C.muted, maxWidth: 360 }}>
            Create your first project to start tracking contracts, change orders, and cash flow.
          </div>
          <button
            onClick={() => navigate('/create-project')}
            style={{
              marginTop: 4,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: C.navy, color: '#FFF',
              fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Create project
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 12,
          }}
        >
          {active.map((p) => {
            const pf = pfMap.get(p.id);
            const revenue = pf?.revenue ?? p.contractValue ?? 0;
            const costs = pf?.costs ?? 0;
            const paidToYou = pf?.paidToYou ?? 0;
            const paidByYou = pf?.paidByYou ?? 0;
            const pendingToCollect = pf?.pendingToCollect ?? 0;
            const action = resolveProjectNextAction(p.id, recentDocs, attentionItems);
            return (
              <RichProjectCard
                key={p.id}
                projectId={p.id}
                projectName={p.name}
                projectStatus={p.status}
                revenue={revenue}
                costs={costs}
                paidToYou={paidToYou}
                pendingToCollect={pendingToCollect}
                contractLabel={labels.contract}
                costLabel={labels.cost}
                nextAction={action}
                hideCost={hideCost}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
