import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string;
  entity_id: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    // Type assertion needed until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_my_notifications', {
      _limit: 50,
      _offset: 0
    });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications((data as Notification[]) || []);
    }
    setLoading(false);
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    // Type assertion needed until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_unread_count');
    
    if (error) {
      console.error('Error fetching unread count:', error);
    } else {
      setUnreadCount((data as number) || 0);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('mark_notification_read', {
      _notification_id: notificationId
    });

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('mark_all_notifications_read');

    if (error) {
      console.error('Error marking all notifications as read:', error);
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Refetch when new notifications arrive
          fetchNotifications();
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: () => {
      fetchNotifications();
      fetchUnreadCount();
    }
  };
}
