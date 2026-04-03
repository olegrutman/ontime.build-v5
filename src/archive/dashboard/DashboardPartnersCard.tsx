// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Partner {
  orgId: string;
  orgName: string;
  orgType: string;
  projectCount: number;
}

const typeBadgeStyles: Record<string, string> = {
  GC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TC: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  FC: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  SUPPLIER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function DashboardPartnersCard() {
  const { userOrgRoles } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const orgId = userOrgRoles[0]?.organization?.id;

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      // Step 1: Get my projects
      const { data: myProjects, error: projErr } = await supabase
        .from('project_team')
        .select('project_id')
        .eq('org_id', orgId)
        .eq('status', 'Accepted');

      if (projErr || !myProjects?.length) {
        console.error('DashboardPartnersCard: projects query error', projErr);
        return;
      }

      const projectIds = myProjects.map((p) => p.project_id);

      // Step 2: Get other orgs on those projects
      const { data: teamMembers, error: teamErr } = await supabase
        .from('project_team')
        .select('org_id, project_id, organizations!inner(id, name, type)')
        .in('project_id', projectIds)
        .neq('org_id', orgId)
        .eq('status', 'Accepted');

      if (teamErr || !teamMembers) {
        console.error('DashboardPartnersCard: team query error', teamErr);
        return;
      }

      const map = new Map<string, Partner>();
      for (const row of teamMembers as any[]) {
        const id = row.org_id;
        if (!id) continue;
        const existing = map.get(id);
        if (existing) {
          existing.projectCount++;
        } else {
          map.set(id, {
            orgId: id,
            orgName: row.organizations?.name || 'Unknown',
            orgType: row.organizations?.type || '',
            projectCount: 1,
          });
        }
      }
      setPartners(Array.from(map.values()).sort((a, b) => b.projectCount - a.projectCount));
    })();
  }, [orgId]);

  if (!orgId) return null;

  const shown = partners.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          My Partners
        </h3>
        <span className="text-[0.68rem] text-muted-foreground">{partners.length} orgs</span>
      </div>
      {shown.length === 0 ? (
        <div className="px-4 pb-4 text-center">
          <p className="text-[0.82rem] text-muted-foreground">No partners yet</p>
        </div>
      ) : (
        <div className="px-4 pb-3 space-y-2">
          {shown.map((p) => (
            <div key={p.orgId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-[0.78rem] font-medium text-foreground truncate">{p.orgName}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={`text-[0.58rem] px-1.5 py-0 ${typeBadgeStyles[p.orgType] || 'bg-muted text-muted-foreground'}`}>
                  {p.orgType}
                </Badge>
                <span className="text-[0.65rem] text-muted-foreground">{p.projectCount} proj</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
