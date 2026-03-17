import { useEffect, useState } from 'react';
import { AlertTriangle, Receipt, Package, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AttentionBannerProps {
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

export function AttentionBanner({ projectId, onNavigate, isSupplier, supplierOrgId }: AttentionBannerProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<AttentionItem[]>([]);

  useEffect(() => {
    const fetchAttentionItems = async () => {
      if (!user) return;

      const attentionItems: AttentionItem[] = [];

      try {
        if (isSupplier && supplierOrgId) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('id')
            .eq('organization_id', supplierOrgId)
            .maybeSingle();

          if (supplierData?.id) {
            const { data: pos } = await supabase
              .from('purchase_orders')
              .select('status')
              .eq('project_id', projectId)
              .eq('supplier_id', supplierData.id)
              .eq('status', 'SUBMITTED');

            if (pos && pos.length > 0) {
              attentionItems.push({
                icon: <Package className="h-4 w-4" />,
                label: `${pos.length} PO${pos.length > 1 ? 's' : ''} need pricing`,
                count: pos.length,
                tab: 'purchase-orders',
              });
            }
          }
        } else {
          const [invRes, poRes] = await Promise.all([
            supabase
              .from('invoices')
              .select('status')
              .eq('project_id', projectId)
              .eq('status', 'SUBMITTED'),
            supabase
              .from('purchase_orders')
              .select('status')
              .eq('project_id', projectId)
              .eq('status', 'SUBMITTED'),
          ]);

          const pendingInvoices = (invRes.data || []).length;
          const pendingPOs = (poRes.data || []).length;

          if (pendingInvoices > 0) {
            attentionItems.push({
              icon: <Receipt className="h-4 w-4" />,
              label: `${pendingInvoices} Invoice${pendingInvoices > 1 ? 's' : ''} to review`,
              count: pendingInvoices,
              tab: 'invoices',
            });
          }

          if (pendingPOs > 0) {
            attentionItems.push({
              icon: <Package className="h-4 w-4" />,
              label: `${pendingPOs} PO${pendingPOs > 1 ? 's' : ''} awaiting pricing`,
              count: pendingPOs,
              tab: 'purchase-orders',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching attention items:', error);
      }

      setItems(attentionItems);
    };

    fetchAttentionItems();
  }, [projectId, user, isSupplier, supplierOrgId]);

  if (items.length === 0) return null;

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4" data-sasha-card="Attention Banner">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
          {totalCount} item{totalCount > 1 ? 's' : ''} need{totalCount === 1 ? 's' : ''} your attention
        </h3>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(item.tab)}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg",
              "bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60",
              "text-amber-800 dark:text-amber-200 text-sm font-medium",
              "transition-colors cursor-pointer min-h-[44px]"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
}
