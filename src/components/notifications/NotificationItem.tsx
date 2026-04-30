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
  FileX,
  Undo2,
  Flag,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  MessageSquareReply,
  UserPlus,
  Hand,
  FolderPlus,
  Lock,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // Project / org
  PROJECT_INVITE: FolderOpen,
  PROJECT_ADDED: FolderPlus,
  WORK_ITEM_INVITE: Briefcase,
  WORK_ORDER_ASSIGNED: ClipboardList,
  JOIN_REQUEST: UserPlus,
  NUDGE: Hand,

  // POs
  PO_SENT: FileText,

  // Change orders / work orders
  CHANGE_SUBMITTED: Send,
  CHANGE_APPROVED: CheckCircle,
  CHANGE_REJECTED: XCircle,
  CO_SHARED: Send,
  CO_RECALLED: Undo2,
  CO_CLOSED_FOR_PRICING: Lock,
  CO_COMPLETED: Flag,
  CO_ACKNOWLEDGED: CheckCircle2,
  CO_SCOPE_ADDED: PlusCircle,
  FC_PRICING_SUBMITTED: DollarSign,

  // NTE
  NTE_REQUESTED: DollarSign,
  NTE_APPROVED: CheckCircle2,
  NTE_REJECTED: XCircle,
  NTE_WARNING_80: AlertTriangle,
  NTE_BLOCKED_100: ShieldAlert,

  // Invoices
  INVOICE_SUBMITTED: Receipt,
  INVOICE_APPROVED: FileCheck,
  INVOICE_REJECTED: FileX,

  // RFIs
  RFI_SUBMITTED: HelpCircle,
  RFI_ANSWERED: MessageSquareReply,
};

// Use semantic tokens from the design system. text-warning / text-success /
// text-destructive / text-primary all map through index.css.
const typeColors: Record<string, string> = {
  // Project / org
  PROJECT_INVITE: 'text-primary',
  PROJECT_ADDED: 'text-primary',
  WORK_ITEM_INVITE: 'text-primary',
  WORK_ORDER_ASSIGNED: 'text-warning',
  JOIN_REQUEST: 'text-primary',
  NUDGE: 'text-primary',

  // POs
  PO_SENT: 'text-primary',

  // Change orders / work orders
  CHANGE_SUBMITTED: 'text-warning',
  CHANGE_APPROVED: 'text-success',
  CHANGE_REJECTED: 'text-destructive',
  CO_SHARED: 'text-primary',
  CO_RECALLED: 'text-warning',
  CO_CLOSED_FOR_PRICING: 'text-warning',
  CO_COMPLETED: 'text-success',
  CO_ACKNOWLEDGED: 'text-success',
  CO_SCOPE_ADDED: 'text-primary',
  FC_PRICING_SUBMITTED: 'text-primary',

  // NTE
  NTE_REQUESTED: 'text-warning',
  NTE_APPROVED: 'text-success',
  NTE_REJECTED: 'text-destructive',
  NTE_WARNING_80: 'text-warning',
  NTE_BLOCKED_100: 'text-destructive',

  // Invoices
  INVOICE_SUBMITTED: 'text-primary',
  INVOICE_APPROVED: 'text-success',
  INVOICE_REJECTED: 'text-destructive',

  // RFIs
  RFI_SUBMITTED: 'text-primary',
  RFI_ANSWERED: 'text-success',
};

// Notifications whose action_url should be ignored in favor of the dashboard
// (the entity may no longer exist or has its accept/decline UI on the dashboard).
const DASHBOARD_REDIRECT_TYPES = new Set([
  'PROJECT_INVITE',
  'WORK_ITEM_INVITE',
  'JOIN_REQUEST',
]);

export function NotificationItem({ notification, onMarkRead, onClose }: NotificationItemProps) {
  const navigate = useNavigate();

  const Icon = typeIcons[notification.type] || Circle;
  const iconColor = typeColors[notification.type] || 'text-muted-foreground';

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    onClose();
    const targetUrl = DASHBOARD_REDIRECT_TYPES.has(notification.type)
      ? '/dashboard'
      : (notification.action_url || '/dashboard');
    navigate(targetUrl);
  };

  const isInviteWithDashboardAction = DASHBOARD_REDIRECT_TYPES.has(notification.type);

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

        {isInviteWithDashboardAction && !notification.is_read && (
          <p className="text-xs text-primary/70 font-medium">
            Go to Dashboard to respond
          </p>
        )}
      </div>
    </div>
  );
}
