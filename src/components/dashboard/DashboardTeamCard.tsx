import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users } from 'lucide-react';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  role: string;
  isAdmin: boolean;
}

export function DashboardTeamCard() {
  const { userOrgRoles } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const orgId = userOrgRoles[0]?.organization?.id;

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const { data } = await supabase
        .from('user_org_roles')
        .select('id, role, is_admin, job_title, profiles!user_org_roles_user_id_fkey(first_name, last_name)')
        .eq('organization_id', orgId)
        .limit(6);
      if (data) {
        setMembers(
          data.map((d: any) => ({
            id: d.id,
            firstName: d.profiles?.first_name || '',
            lastName: d.profiles?.last_name || '',
            jobTitle: d.job_title,
            role: d.role,
            isAdmin: d.is_admin,
          }))
        );
      }
    })();
  }, [orgId]);

  if (!orgId) return null;

  function getInitials(first: string, last: string) {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
  }

  const shown = members.slice(0, 5);
  const hasMore = members.length > 5;

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-heading text-[1rem] font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          My Team
        </h3>
        <button
          onClick={() => navigate('/org/team')}
          className="text-[0.68rem] text-primary hover:underline font-medium"
        >
          View all →
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="px-4 pb-4 text-center">
          <p className="text-[0.82rem] text-muted-foreground">No team members yet</p>
        </div>
      ) : (
        <div className="px-4 pb-3 space-y-2">
          {shown.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground">
                  {getInitials(m.firstName, m.lastName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-medium text-foreground truncate">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-[0.65rem] text-muted-foreground truncate">
                  {m.jobTitle || m.role.replace(/_/g, ' ')}
                  {m.isAdmin && ' · Admin'}
                </p>
              </div>
            </div>
          ))}
          {hasMore && (
            <p className="text-[0.65rem] text-muted-foreground text-center pt-1">
              +{members.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
