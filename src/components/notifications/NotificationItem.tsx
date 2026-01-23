import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  FolderOpen, 
  Briefcase, 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Notification } from '@/hooks/useNotifications';
import { useProjectInvite } from '@/hooks/useProjectInvite';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PROJECT_INVITE: FolderOpen,
  WORK_ITEM_INVITE: Briefcase,
  PO_SENT: FileText,
  CHANGE_SUBMITTED: Send,
  CHANGE_APPROVED: CheckCircle,
  CHANGE_REJECTED: XCircle,
};

const typeColors: Record<string, string> = {
  PROJECT_INVITE: 'text-primary',
  WORK_ITEM_INVITE: 'text-blue-500',
  PO_SENT: 'text-purple-500',
  CHANGE_SUBMITTED: 'text-amber-500',
  CHANGE_APPROVED: 'text-green-500',
  CHANGE_REJECTED: 'text-red-500',
};

export function NotificationItem({ notification, onMarkRead, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const { acceptInvite, declineInvite, loading: inviteLoading } = useProjectInvite();
  
  const Icon = typeIcons[notification.type] || Circle;
  const iconColor = typeColors[notification.type] || 'text-muted-foreground';

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    onClose();
    navigate(notification.action_url);
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await acceptInvite(notification.entity_id);
    if (success) {
      onMarkRead(notification.id);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await declineInvite(notification.entity_id);
    onMarkRead(notification.id);
  };

  const isProjectInvite = notification.type === 'PROJECT_INVITE';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      {/* Unread indicator */}
      <div className="flex items-start pt-1">
        {!notification.is_read ? (
          <div className="w-2 h-2 rounded-full bg-primary" />
        ) : (
          <div className="w-2 h-2" />
        )}
      </div>

      {/* Icon */}
      <div className={cn('shrink-0 mt-0.5', iconColor)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn(
          'text-sm leading-tight',
          !notification.is_read && 'font-medium'
        )}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>

        {/* Project invite actions */}
        {isProjectInvite && !notification.is_read && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={inviteLoading}
              className="h-7 text-xs"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              disabled={inviteLoading}
              className="h-7 text-xs"
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
