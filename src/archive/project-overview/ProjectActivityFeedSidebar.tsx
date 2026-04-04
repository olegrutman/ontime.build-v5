// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { DT } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  actor_name: string | null;
  actor_company: string | null;
  created_at: string;
}

const chipColors: Record<string, string> = {
  INVOICE: 'bg-blue-100 text-blue-700',
  SCOPE: 'bg-purple-100 text-purple-700',
  CONTRACT: 'bg-orange-100 text-orange-700',
  CHANGE_ORDER: 'bg-amber-100 text-amber-700',
  INVITE: 'bg-emerald-100 text-emerald-700',
  STATUS: 'bg-slate-100 text-slate-600',
  FC: 'bg-cyan-100 text-cyan-700',
  DEFAULT: 'bg-muted text-muted-foreground',
};

function getChipClass(type: string) {
  const key = Object.keys(chipColors).find(k => type.startsWith(k));
  return key ? chipColors[key] : chipColors.DEFAULT;
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function ProjectActivityFeedSidebar({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('project_activity')
        .select('id, activity_type, description, actor_name, actor_company, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(8);
      setItems((data as ActivityItem[]) || []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`activity_feed_${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_activity', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setItems(prev => [payload.new as ActivityItem, ...prev].slice(0, 8));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <p className={DT.sectionHeader}>Activity</p>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <p className={DT.sectionHeader}>Activity</p>
        <p className="text-xs text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className={DT.sectionHeader}>Activity</p>
      {items.map((item, i) => (
        <div
          key={item.id}
          className="flex items-start gap-2.5 py-2 border-b border-border last:border-0 animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="font-mono w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground">
            {getInitials(item.actor_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground leading-snug line-clamp-2">{item.description}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getChipClass(item.activity_type)}`}>
                {item.activity_type.replace(/_/g, ' ').toLowerCase()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
