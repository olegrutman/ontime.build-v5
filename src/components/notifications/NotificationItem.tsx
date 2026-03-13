import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  FolderOpen, 
  Briefcase, 
  FileText, 
  Send, 
  CheckCircle, 
  XCircle,
  Circle,
  ClipboardList,
  Receipt,
  FileCheck,
  FileX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PROJECT_INVITE: FolderOpen,
  WORK_ITEM_INVITE: Briefcase,
  WORK_ORDER_ASSIGNED: ClipboardList,
  PO_SENT: FileText,
  CHANGE_SUBMITTED: Send,
  CHANGE_APPROVED: CheckCircle,
  CHANGE_REJECTED: XCircle,
  INVOICE_SUBMITTED: Receipt,
  INVOICE_APPROVED: FileCheck,
  INVOICE_REJECTED: FileX,
};

const typeColors: Record<string, string> = {
  PROJECT_INVITE: 'text-primary',
  WORK_ITEM_INVITE: 'text-blue-500',
  WORK_ORDER_ASSIGNED: 'text-orange-500',
  PO_SENT: 'text-purple-500',
  CHANGE_SUBMITTED: 'text-amber-500',
  CHANGE_APPROVED: 'text-green-500',
  CHANGE_REJECTED: 'text-red-500',
  INVOICE_SUBMITTED: 'text-blue-600',
  INVOICE_APPROVED: 'text-green-600',
  INVOICE_REJECTED: 'text-red-600',
};

export function NotificationItem({ notification, onMarkRead, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  
  const Icon = typeIcons[notification.type] || Circle;
  const iconColor = typeColors[notification.type] || 'text-muted-foreground';

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    onClose();
    // PROJECT_INVITE links should always go to dashboard where the accept/decline UI lives
    const targetUrl = notification.type === 'PROJECT_INVITE' ? '/dashboard' : notification.action_url;
    navigate(targetUrl);
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

        {/* Guide user to dashboard for project invite actions */}
        {isProjectInvite && !notification.is_read && (
          <p className="text-xs text-primary/70 font-medium">
            Go to Dashboard to respond
          </p>
        )}
      </div>
    </div>
  );
}
