import { useState, useEffect } from 'react';
import { Activity, UserPlus, CheckCircle, FileEdit, ClipboardCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  actor_name: string | null;
  actor_company: string | null;
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
  PROJECT_CREATED: Activity,
};

const activityColors: Record<string, string> = {
  INVITE_SENT: 'text-blue-500',
  INVITE_ACCEPTED: 'text-green-500',
  SCOPE_UPDATED: 'text-purple-500',
  CONTRACT_UPDATED: 'text-orange-500',
  CHANGE_ORDER_APPROVED: 'text-green-500',
  CHANGE_ORDER_SUBMITTED: 'text-amber-500',
  PROJECT_CREATED: 'text-primary',
};

export function ProjectActivitySection({ projectId }: ProjectActivitySectionProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
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
          setActivities((prev) => [payload.new as ActivityItem, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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
