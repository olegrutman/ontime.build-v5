import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { C, fmt } from '@/components/shared/KpiCard';

export interface TeamMember {
  userId: string;
  name: string;
  title: string;
  scope: 'org' | 'assigned';
  isAdmin: boolean;
  projectIds: Set<string>;
}

/** Loads supplier team members and their per-user project assignments. */
export function useSupplierTeam(orgId?: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [{ data: roles }, { data: pm }] = await Promise.all([
        supabase.from('user_org_roles').select('user_id, is_admin, project_scope').eq('organization_id', orgId),
        supabase.from('project_members').select('project_id, user_id, status').eq('organization_id', orgId).eq('status', 'active'),
      ]);
      const ids = (roles ?? []).map(r => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('user_id, full_name, email, job_title').in('user_id', ids)
        : { data: [] as any[] };
      setMembers((roles ?? []).map(r => {
        const p = (profs ?? []).find((x: any) => x.user_id === r.user_id);
        return {
          userId: r.user_id,
          name: p?.full_name || p?.email || 'Team member',
          title: p?.job_title || '',
          scope: (r.project_scope as 'org' | 'assigned') ?? 'org',
          isAdmin: !!r.is_admin,
          projectIds: new Set((pm ?? []).filter(m => m.user_id === r.user_id).map(m => m.project_id)),
        };
      }));
      setLoaded(true);
    })();
  }, [orgId]);
  return { members, loaded };
}

export interface PortfolioRow { projectId: string; ordered: number; billed: number; received: number; alert: boolean }

/** Selection key: 'all' | 'unassigned' | userId */
export function SupplierTeamPortfolioStrip({ members, rows, selected, onSelect }: {
  members: TeamMember[]; rows: PortfolioRow[]; selected: string; onSelect: (k: string) => void;
}) {
  const sum = (rs: PortfolioRow[]) => ({
    n: rs.length,
    ordered: rs.reduce((s, r) => s + r.ordered, 0),
    ar: rs.reduce((s, r) => s + Math.max(0, r.billed - r.received), 0),
    alerts: rs.filter(r => r.alert).length,
  });
  const reps = members.filter(m => [...m.projectIds].some(id => rows.some(r => r.projectId === id)));
  const assigned = new Set(reps.flatMap(m => [...m.projectIds]));
  const unassigned = rows.filter(r => !assigned.has(r.projectId));
  const cards = [
    { key: 'all', name: 'All company', title: 'Every project', s: sum(rows) },
    ...reps.map(m => ({ key: m.userId, name: m.name, title: m.title, s: sum(rows.filter(r => m.projectIds.has(r.projectId))) })),
    ...(unassigned.length ? [{ key: 'unassigned', name: 'Unassigned', title: 'Needs an account manager', s: sum(unassigned) }] : []),
  ];
  return (
    <div>
      <div className="font-heading" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.7px', color: C.faint, fontWeight: 700, marginBottom: 8 }}>
        Sales team portfolio
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {cards.map(c => {
          const on = selected === c.key;
          const warn = c.key === 'unassigned';
          return (
            <button key={c.key} onClick={() => onSelect(c.key)} aria-pressed={on}
              style={{ flexShrink: 0, width: 200, textAlign: 'left', padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
                background: on ? C.amberPale : C.surface, border: `${on ? 2 : 1}px solid ${on ? C.amber : warn ? C.amber : C.border}` }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: C.ink, overflowWrap: 'anywhere' }}>{c.name}</div>
              <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: 8 }}>{c.title || '\u00a0'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.muted }}>
                <span>{c.s.n} projects</span>
                {c.s.alerts > 0
                  ? <span style={{ color: C.red, fontWeight: 700 }}>{c.s.alerts} alert{c.s.alerts > 1 ? 's' : ''}</span>
                  : <span style={{ color: C.green, fontWeight: 600 }}>✓ clear</span>}
              </div>
              <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginTop: 4, color: C.ink }}>
                <span>{fmt(c.s.ordered)} ord.</span>
                <span style={{ color: c.s.ar > 0 ? C.amberD : C.muted }}>{fmt(c.s.ar)} AR</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
