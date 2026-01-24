import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, ClipboardList, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AttentionItem {
  id: string;
  type: 'change_order' | 'invoice' | 'invite';
  title: string;
  projectName: string;
  projectId: string;
}

interface NeedsAttentionPanelProps {
  items: AttentionItem[];
}

const ITEM_ICONS = {
  change_order: ClipboardList,
  invoice: FileText,
  invite: UserPlus,
};

const ITEM_LABELS = {
  change_order: 'Change Order',
  invoice: 'Invoice',
  invite: 'Team Invite',
};

export function NeedsAttentionPanel({ items }: NeedsAttentionPanelProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  const handleItemClick = (item: AttentionItem) => {
    switch (item.type) {
      case 'change_order':
        navigate(`/change-orders?project=${item.projectId}`);
        break;
      case 'invoice':
        navigate(`/project/${item.projectId}?tab=invoices`);
        break;
      case 'invite':
        navigate(`/project/${item.projectId}?tab=team`);
        break;
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 5).map((item) => {
          const Icon = ITEM_ICONS[item.type];
          return (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-3"
              onClick={() => handleItemClick(item)}
            >
              <Icon className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ITEM_LABELS[item.type]} • {item.projectName}
                </p>
              </div>
            </Button>
          );
        })}
        {items.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{items.length - 5} more items
          </p>
        )}
      </CardContent>
    </Card>
  );
}
