import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { Package, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMember {
  role: string;
  org_name: string;
}

const ROLE_DOTS: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const ROLE_SHORT: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

interface Props {
  projectId: string;
  isTCMaterialResponsible: boolean;
  isGCMaterialResponsible: boolean;
}

export function OverviewTeamCard({ projectId, isTCMaterialResponsible, isGCMaterialResponsible }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('project_team')
        .select('role, org_id, organizations:org_id(name)')
        .eq('project_id', projectId);
      const m = (data || []).map((d: any) => ({
        role: d.role || 'Unknown',
        org_name: d.organizations?.name || 'Unknown',
      }));
      setMembers(m);
      setLoading(false);
    };
    fetch();
  }, [projectId]);

  const materialLabel = isTCMaterialResponsible ? 'TC' : isGCMaterialResponsible ? 'GC' : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <p className={DT.sectionHeader}>Team</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}
        </div>
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">No team members yet</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1.5 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', ROLE_DOTS[m.role] || 'bg-muted-foreground')} />
              <span className="text-xs text-foreground font-medium truncate flex-1">{m.org_name}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{ROLE_SHORT[m.role] || m.role}</span>
            </div>
          ))}
        </div>
      )}

      {materialLabel && (() => {
        const responsibleRole = isTCMaterialResponsible ? 'Trade Contractor' : 'General Contractor';
        const responsibleOrg = members.find(m => m.role === responsibleRole);
        const dotColor = ROLE_DOTS[responsibleRole] || 'bg-muted-foreground';
        return (
          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Materials:</span>
            <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
            <span className="text-[10px] font-semibold text-foreground truncate">
              {responsibleOrg?.org_name || materialLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">({materialLabel})</span>
          </div>
        );
      })()}
    </div>
  );
}
