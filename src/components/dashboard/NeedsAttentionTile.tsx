import { useNavigate } from 'react-router-dom';
import { AlertCircle, ClipboardList, FileText, UserPlus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  type: 'change_order' | 'invoice' | 'invite';
  title: string;
  projectName: string;
  projectId: string;
}

export interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedByOrgName: string;
  role: string;
}

interface NeedsAttentionTileProps {
  items: AttentionItem[];
  pendingInvitesCount: number;
}

interface AttentionCategoryProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  onClick: () => void;
}

function AttentionCategory({ icon: Icon, label, count, onClick }: AttentionCategoryProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function NeedsAttentionTile({ items, pendingInvitesCount }: NeedsAttentionTileProps) {
  const navigate = useNavigate();

  const groupedItems = {
    change_orders: items.filter(i => i.type === 'change_order'),
    invoices: items.filter(i => i.type === 'invoice'),
    invites: items.filter(i => i.type === 'invite'),
  };
  
  const totalCount = items.length + pendingInvitesCount;

  const handleWorkOrdersClick = () => {
    if (groupedItems.change_orders.length > 0) {
      const firstItem = groupedItems.change_orders[0];
      navigate(`/change-orders?project=${firstItem.projectId}`);
    } else {
      navigate('/change-orders');
    }
  };

  const handleInvoicesClick = () => {
    if (groupedItems.invoices.length > 0) {
      const firstItem = groupedItems.invoices[0];
      navigate(`/project/${firstItem.projectId}?tab=invoices`);
    }
  };

  const handleInvitesClick = () => {
    // Scroll to pending invites section on dashboard
    const invitesSection = document.getElementById('pending-invites');
    invitesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Card className={cn(totalCount > 0 && "border-amber-500/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <AlertCircle className={cn("h-5 w-5", totalCount > 0 ? "text-amber-600" : "text-muted-foreground")} />
            Needs Attention
          </div>
          {totalCount > 0 && (
            <Badge variant="destructive">{totalCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All caught up! ✨
          </p>
        ) : (
          <div className="space-y-1">
            {groupedItems.change_orders.length > 0 && (
              <AttentionCategory 
                icon={ClipboardList} 
                label="Work Orders" 
                count={groupedItems.change_orders.length}
                onClick={handleWorkOrdersClick}
              />
            )}
            {groupedItems.invoices.length > 0 && (
              <AttentionCategory 
                icon={FileText} 
                label="Invoices" 
                count={groupedItems.invoices.length}
                onClick={handleInvoicesClick}
              />
            )}
            {(groupedItems.invites.length + pendingInvitesCount) > 0 && (
              <AttentionCategory 
                icon={UserPlus} 
                label="Invitations" 
                count={groupedItems.invites.length + pendingInvitesCount}
                onClick={handleInvitesClick}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
