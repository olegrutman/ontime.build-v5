import { Card, CardContent } from '@/components/ui/card';
import { FileText, ChevronRight, Package, ExternalLink } from 'lucide-react';
import { POStatusBadge } from '@/components/purchase-orders/POStatusBadge';
import { POStatus } from '@/types/purchaseOrder';
import { useNavigate } from 'react-router-dom';

interface LinkedPOCardProps {
  poId: string;
  poNumber: string;
  status: string;
  subtotal?: number;
  itemCount?: number;
  canViewPricing: boolean;
  projectId?: string;
}

export function LinkedPOCard({
  poId,
  poNumber,
  status,
  subtotal,
  itemCount,
  canViewPricing,
  projectId,
}: LinkedPOCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to project PO tab with the PO selected
    if (projectId) {
      navigate(`/projects/${projectId}?tab=pos&po=${poId}`);
    }
  };

  return (
    <Card 
      data-sasha-card="Linked PO"
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{poNumber}</span>
                <POStatusBadge status={status as POStatus} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>{itemCount || 0} items</span>
                {canViewPricing && subtotal !== undefined && (
                  <>
                    <span>•</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
