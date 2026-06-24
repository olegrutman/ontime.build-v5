import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_NOTIFICATIONS } from '@/data/demoOperationalData';

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
  const { isDemoMode } = useDemo();
  const [notifications, setNotifications] = useState<Notification[]>(isDemoMode ? DEMO_NOTIFICATIONS : []);
  const [unreadCount, setUnreadCount] = useState(isDemoMode ? DEMO_NOTIFICATIONS.length : 0);
  const [loading, setLoading] = useState(!isDemoMode);

  const fetchNotifications = useCallback(async () => {
    if (isDemoMode) return;
    if (!user) return;
    
    // Type assertion needed until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_my_notifications', {
      _limit: 50,
      _offset: 0
    });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(((data as Notification[]) || []).filter(n => !n.is_read));
    }
    setLoading(false);
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (isDemoMode) return;
    if (!user) return;
    
    // Type assertion needed until types are regenerated
    const { data, error } = await (supabase.rpc as any)('get_unread_count');
    
    if (error) {
      console.error('Error fetching unread count:', error);
    } else {
      setUnreadCount((data as number) || 0);
    }
  }, [user, isDemoMode]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (isDemoMode) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('mark_notification_read', {
      _notification_id: notificationId
    });

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [isDemoMode]);

  const markAllAsRead = useCallback(async () => {
    if (isDemoMode) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    // Type assertion needed until types are regenerated
    const { error } = await (supabase.rpc as any)('mark_all_notifications_read');

    if (error) {
      console.error('Error marking all notifications as read:', error);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isDemoMode]);

  // Initial fetch
  useEffect(() => {
    if (isDemoMode) return;
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications, fetchUnreadCount, isDemoMode]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (isDemoMode) return;
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          // Mark-as-read on another tab/device should refresh badge + list
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
