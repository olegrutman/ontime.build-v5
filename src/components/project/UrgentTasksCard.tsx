import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Receipt, Package, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface UrgentTasksCardProps {
  projectId: string;
  onNavigate: (tab: string) => void;
  isSupplier?: boolean;
  supplierOrgId?: string | null;
}

interface AttentionItem {
  icon: React.ReactNode;
  label: string;
  count: number;
  tab: string;
}

export function UrgentTasksCard({ projectId, onNavigate, isSupplier, supplierOrgId }: UrgentTasksCardProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<AttentionItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!user) return;
      const attentionItems: AttentionItem[] = [];

      try {
        if (isSupplier && supplierOrgId) {
          const { data: supplierData } = await supabase
            .from('suppliers').select('id').eq('organization_id', supplierOrgId).maybeSingle();
          if (supplierData?.id) {
            const { data: pos } = await supabase
              .from('purchase_orders').select('status').eq('project_id', projectId).eq('supplier_id', supplierData.id).eq('status', 'SUBMITTED');
            if (pos && pos.length > 0) {
              attentionItems.push({ icon: <Package className="h-4 w-4" />, label: `${pos.length} PO${pos.length > 1 ? 's' : ''} need pricing`, count: pos.length, tab: 'purchase-orders' });
            }
          }
        } else {
          const [woRes, invRes, poRes] = await Promise.all([
            supabase.from('change_order_projects').select('status').eq('project_id', projectId).not('status', 'in', '("draft","approved","contracted")'),
            supabase.from('invoices').select('status').eq('project_id', projectId).eq('status', 'SUBMITTED'),
            supabase.from('purchase_orders').select('status').eq('project_id', projectId).eq('status', 'SUBMITTED'),
          ]);
          const pendingWOs = (woRes.data || []).length;
          const pendingInvoices = (invRes.data || []).length;
          const pendingPOs = (poRes.data || []).length;
          if (pendingWOs > 0) attentionItems.push({ icon: <ClipboardList className="h-4 w-4" />, label: `${pendingWOs} WO${pendingWOs > 1 ? 's' : ''} need approval`, count: pendingWOs, tab: 'work-orders' });
          if (pendingInvoices > 0) attentionItems.push({ icon: <Receipt className="h-4 w-4" />, label: `${pendingInvoices} Invoice${pendingInvoices > 1 ? 's' : ''} to review`, count: pendingInvoices, tab: 'invoices' });
          if (pendingPOs > 0) attentionItems.push({ icon: <Package className="h-4 w-4" />, label: `${pendingPOs} PO${pendingPOs > 1 ? 's' : ''} awaiting pricing`, count: pendingPOs, tab: 'purchase-orders' });
        }
      } catch (error) {
        console.error('Error fetching urgent tasks:', error);
      }
      setItems(attentionItems);
    };
    fetchItems();
  }, [projectId, user, isSupplier, supplierOrgId]);

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Urgent Tasks</p>
        <p className="text-sm text-muted-foreground">No items need attention</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Urgent Tasks</p>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(item.tab)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl",
              "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40",
              "text-amber-800 dark:text-amber-200 text-sm font-medium",
              "transition-colors text-left"
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
