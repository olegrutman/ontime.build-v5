import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PresenceUser {
  user_id: string;
  role: string;
  initials: string;
  activeTab?: string;
}

const ROLE_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
};

const TAB_ACTIVITY: Record<string, string> = {
  pricing: 'entering pricing',
  'line-items': 'reviewing scope',
  activity: 'viewing activity',
  details: 'viewing details',
};

interface COWhosHereProps {
  coId: string;
  role: string;
  activeTab: string;
}

export function COWhosHere({ coId, role, activeTab }: COWhosHereProps) {
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!coId || !user) return;

    const channel = supabase.channel(`co-presence-${coId}`, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const presences of Object.values(state)) {
          if (presences && presences.length > 0) {
            users.push(presences[0] as unknown as PresenceUser);
          }
        }
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const email = user.email ?? '';
          const initials = email.split('@')[0].slice(0, 2).toUpperCase();
          await channel.track({ user_id: user.id, role, initials, activeTab });
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [coId, user?.id]);

  // Update tracked tab when it changes
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !user) return;
    const email = user.email ?? '';
    const initials = email.split('@')[0].slice(0, 2).toUpperCase();
    ch.track({ user_id: user.id, role, initials, activeTab }).catch(() => {});
  }, [activeTab, role, user?.id]);

  const otherUsers = presenceUsers.filter(u => u.user_id !== user?.id);

  if (otherUsers.length === 0) return null;

  const activityUser = otherUsers[0];
  const activityText = activityUser?.activeTab ? TAB_ACTIVITY[activityUser.activeTab] : null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border text-xs">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <div className="flex -space-x-1.5">
        {otherUsers.map(u => (
          <span key={u.user_id} className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ring-1 ring-card',
            ROLE_COLORS[u.role] ?? 'bg-muted',
          )}>
            {u.initials || u.role.charAt(0)}
          </span>
        ))}
      </div>
      <span className="text-muted-foreground">
        {otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} viewing
      </span>
      {activityText && (
        <span className="ml-auto text-muted-foreground/70 italic truncate">
          {activityUser.role} is {activityText}…
        </span>
      )}
    </div>
  );
}
