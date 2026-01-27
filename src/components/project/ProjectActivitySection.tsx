import { useState, useEffect } from 'react';
import { Activity, UserPlus, CheckCircle, FileEdit, ClipboardCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  actor_name: string | null;
  actor_company: string | null;
  actor_user_id: string | null;
  created_at: string;
  metadata: any;
}

interface ProjectActivitySectionProps {
  projectId: string;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INVITE_SENT: UserPlus,
  INVITE_ACCEPTED: CheckCircle,
  SCOPE_UPDATED: FileEdit,
  CONTRACT_UPDATED: FileEdit,
  CHANGE_ORDER_APPROVED: ClipboardCheck,
  CHANGE_ORDER_SUBMITTED: ClipboardCheck,
  FC_HOURS_SUBMITTED: ClipboardCheck,
  FC_HOURS_UPDATED: FileEdit,
  PROJECT_CREATED: Activity,
};

const activityColors: Record<string, string> = {
  INVITE_SENT: 'text-blue-500',
  INVITE_ACCEPTED: 'text-green-500',
  SCOPE_UPDATED: 'text-purple-500',
  CONTRACT_UPDATED: 'text-orange-500',
  CHANGE_ORDER_APPROVED: 'text-green-500',
  CHANGE_ORDER_SUBMITTED: 'text-amber-500',
  FC_HOURS_SUBMITTED: 'text-blue-500',
  FC_HOURS_UPDATED: 'text-purple-500',
  PROJECT_CREATED: 'text-primary',
};

// Activity types relevant to each role
const roleActivityTypes: Record<string, string[]> = {
  'Field Crew': [
    'INVITE_SENT',
    'INVITE_ACCEPTED',
    'FC_HOURS_SUBMITTED',
    'FC_HOURS_UPDATED',
    'CHANGE_ORDER_APPROVED',
  ],
  'Trade Contractor': [
    'INVITE_SENT',
    'INVITE_ACCEPTED',
    'SCOPE_UPDATED',
    'CONTRACT_UPDATED',
    'CHANGE_ORDER_APPROVED',
    'CHANGE_ORDER_SUBMITTED',
    'FC_HOURS_SUBMITTED',
    'FC_HOURS_UPDATED',
    'PROJECT_CREATED',
  ],
  'General Contractor': [
    'INVITE_SENT',
    'INVITE_ACCEPTED',
    'SCOPE_UPDATED',
    'CONTRACT_UPDATED',
    'CHANGE_ORDER_APPROVED',
    'CHANGE_ORDER_SUBMITTED',
    'PROJECT_CREATED',
  ],
};

export function ProjectActivitySection({ projectId }: ProjectActivitySectionProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerRole, setViewerRole] = useState<string>('Trade Contractor');
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Determine viewer role and org
      const { data: memberships } = await supabase
        .from('user_org_roles')
        .select('organization_id')
        .eq('user_id', user.id);
      
      const userOrgIds = (memberships || []).map(m => m.organization_id);
      let currentRole = 'Trade Contractor';
      let currentOrgId: string | null = null;
      
      if (userOrgIds.length > 0) {
        const { data: teamMembers } = await supabase
          .from('project_team')
          .select('role, org_id')
          .eq('project_id', projectId)
          .in('org_id', userOrgIds);
        
        if (teamMembers && teamMembers.length > 0) {
          currentRole = teamMembers[0].role;
          currentOrgId = teamMembers[0].org_id;
        }
      }

      setViewerRole(currentRole);
      setUserOrgId(currentOrgId);

      // Get relevant activity types for the role
      const relevantTypes = roleActivityTypes[currentRole] || roleActivityTypes['Trade Contractor'];

      // Fetch activities filtered by type
      const { data, error } = await supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .in('activity_type', relevantTypes)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        // For FC, also filter to only show activities from their org or related to them
        let filteredData = data || [];
        
        if (currentRole === 'Field Crew' && currentOrgId) {
          filteredData = filteredData.filter(activity => {
            // Show activities where FC's company is mentioned or actor
            const isOwnActivity = activity.actor_user_id === user.id;
            const metadata = activity.metadata as Record<string, unknown> | null;
            const mentionsOwnCompany = metadata?.organization_id === currentOrgId;
            const isInviteToSelf = activity.activity_type === 'INVITE_SENT' && 
              metadata?.invited_org_id === currentOrgId;
            const isAcceptedByOrg = activity.activity_type === 'INVITE_ACCEPTED' && 
              metadata?.organization_id === currentOrgId;
            const isFCHoursActivity = ['FC_HOURS_SUBMITTED', 'FC_HOURS_UPDATED'].includes(activity.activity_type);
            const isApproval = activity.activity_type === 'CHANGE_ORDER_APPROVED';
            
            return isOwnActivity || mentionsOwnCompany || isInviteToSelf || isAcceptedByOrg || isFCHoursActivity || isApproval;
          });
        }
        
        setActivities(filteredData);
      }
      setLoading(false);
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`project_activity_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_activity',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newActivity = payload.new as ActivityItem;
          const relevantTypes = roleActivityTypes[viewerRole] || roleActivityTypes['Trade Contractor'];
          
          // Only add if relevant to this role
          if (relevantTypes.includes(newActivity.activity_type)) {
            setActivities((prev) => [newActivity, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear here as the project progresses
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || Activity;
            const iconColor = activityColors[activity.activity_type] || 'text-muted-foreground';

            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(activity.actor_name || activity.actor_company) && (
                      <span className="text-xs text-muted-foreground">
                        {activity.actor_name}
                        {activity.actor_company && ` • ${activity.actor_company}`}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
