import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { C, fontVal, fontLabel, fmt } from '@/components/shared/KpiCard';

export interface SwitcherProject {
  projectId: string;
  name: string;
  risk: 'On Track' | 'Watch' | 'Over Budget';
  ar: number;
}

interface Props {
  projects: SwitcherProject[];
}

const DOT: Record<SwitcherProject['risk'], string> = {
  'On Track': C.green,
  'Watch': C.amber,
  'Over Budget': C.red,
};

/**
 * Sticky project switcher — one-tap entry into any active project from the
 * top of the supplier dashboard.
 */
export function SupplierProjectSwitcher({ projects }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return projects;
    return projects.filter(p => p.name.toLowerCase().includes(t));
  }, [projects, q]);

  if (projects.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-30"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '10px 12px',
        ...fontLabel,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, color: C.faint }}>
          Open a project
        </span>
        <button
          onClick={() => navigate('/projects/archive')}
          style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.amber, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View archive →
        </button>
      </div>

      <div
        style={{ display: 'flex', gap: 7, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}
        className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {filtered.length === 0 ? (
          <span style={{ fontSize: '0.72rem', color: C.muted, padding: '6px 2px' }}>No matching projects</span>
        ) : filtered.map(p => (
          <button
            key={p.projectId}
            onClick={() => navigate(`/project/${p.projectId}`)}
            className="hover:border-[#F5A623] transition-colors"
            style={{
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
              background: C.surface2, border: `1px solid ${C.border}`,
              fontSize: '0.74rem', fontWeight: 700, color: C.ink, ...fontLabel,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOT[p.risk], flexShrink: 0 }} />
            {p.name}
            {p.ar > 0 && (
              <span style={{ ...fontVal, fontSize: '0.66rem', fontWeight: 600, color: C.muted }}>
                AR {fmt(p.ar)}
              </span>
            )}
          </button>
        ))}
      </div>

      {projects.length > 3 && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
            border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 10px', background: C.surface2,
          }}
        >
          <Search size={13} style={{ color: C.faint, flexShrink: 0 }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search projects…"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.74rem', color: C.ink, ...fontLabel,
            }}
          />
        </div>
      )}
    </div>
  );
}
