import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, Trash2, CheckCheck, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useProjectInvitations } from '@/hooks/useProjectInvitations';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  onClose: () => void;
}

export default function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { pendingInvitations, acceptInvitation, declineInvitation, loading: inviteLoading } = useProjectInvitations();
  
  // Track which notifications are being processed to prevent double-clicks
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (notification: Notification) => {
    // Prevent double-clicks
    if (processingIds.has(notification.id)) return;
    
    setProcessingIds(prev => new Set(prev).add(notification.id));
    try {
      // Find the matching invitation by project_id
      const invitation = pendingInvitations.find(inv => inv.project_id === notification.project_id);
      if (invitation) {
        await acceptInvitation(invitation.id);
      }
      await deleteNotification(notification.id);
      onClose();
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleDecline = async (notification: Notification) => {
    // Prevent double-clicks
    if (processingIds.has(notification.id)) return;
    
    setProcessingIds(prev => new Set(prev).add(notification.id));
    try {
      const invitation = pendingInvitations.find(inv => inv.project_id === notification.project_id);
      if (invitation) {
        await declineInvitation(invitation.id);
      }
      await deleteNotification(notification.id);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {notifications.some((n) => !n.read_at) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs h-7"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[400px]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                  !notification.read_at && 'bg-accent/10'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-2 shrink-0',
                      notification.read_at ? 'bg-muted' : 'bg-primary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {notification.body && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>

                    {notification.type === 'project_invitation' && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(notification);
                          }}
                          disabled={inviteLoading || processingIds.has(notification.id)}
                          className="h-7 text-xs"
                        >
                          {processingIds.has(notification.id) ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecline(notification);
                          }}
                          disabled={inviteLoading || processingIds.has(notification.id)}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}