import { useEffect, useState } from 'react';
import { ClipboardList, Receipt, Package, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricStripProps {
  projectId: string;
  onNavigate: (tab: string) => void;
  isSupplier?: boolean;
  supplierOrgId?: string | null;
}

interface MetricCell {
  icon: React.ReactNode;
  label: string;
  tab: string;
  segments: { count: number; label: string; color: string }[];
}

export function MetricStrip({ projectId, onNavigate, isSupplier, supplierOrgId }: MetricStripProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cells, setCells] = useState<MetricCell[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) { setLoading(false); return; }

      try {
        if (isSupplier && supplierOrgId) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('id')
            .eq('organization_id', supplierOrgId)
            .maybeSingle();

          const supplierId = supplierData?.id;
          if (!supplierId) { setLoading(false); return; }

          const posRes = await (supabase.from('purchase_orders').select('status').eq('project_id', projectId).eq('supplier_id', supplierId) as unknown as Promise<{data: {status: string}[] | null}>);
          const invRes = await (supabase.from('invoices').select('status').eq('project_id', projectId) as unknown as Promise<{data: {status: string}[] | null}>);
          const estQuery = supabase.from('supplier_estimates' as any).select('id');
          const estRes = await estQuery.eq('project_id', projectId).eq('supplier_id', supplierId);

          const pos = posRes.data || [];
          const invoices = invRes.data || [];

          setCells([
            {
              icon: <Package className="h-5 w-5" />,
              label: 'Purchase Orders',
              tab: 'purchase-orders',
              segments: [
                { count: pos.filter(p => p.status === 'SUBMITTED').length, label: 'Need Pricing', color: 'text-amber-600' },
                { count: pos.filter(p => p.status === 'PRICED').length, label: 'Priced', color: 'text-blue-600' },
                { count: pos.filter(p => ['FINALIZED', 'DELIVERED'].includes(p.status)).length, label: 'Finalized', color: 'text-green-600' },
              ],
            },
            {
              icon: <Receipt className="h-5 w-5" />,
              label: 'Invoices',
              tab: 'invoices',
              segments: [
                { count: invoices.filter(i => i.status === 'SUBMITTED').length, label: 'Pending', color: 'text-amber-600' },
                { count: invoices.filter(i => ['APPROVED', 'PAID'].includes(i.status)).length, label: 'Approved', color: 'text-green-600' },
                { count: invoices.filter(i => i.status === 'DRAFT').length, label: 'Draft', color: 'text-muted-foreground' },
              ],
            },
            {
              icon: <FileText className="h-5 w-5" />,
              label: 'Estimates',
              tab: 'estimates',
              segments: [
                { count: (estRes.data || []).length, label: 'Total', color: 'text-foreground' },
              ],
            },
          ]);
        } else {
          const woRes = await supabase.from('change_order_projects').select('status').eq('project_id', projectId);
          const invRes = await supabase.from('invoices').select('status').eq('project_id', projectId);
          const poRes = await supabase.from('purchase_orders').select('status').eq('project_id', projectId);

          const workOrders = woRes.data || [];
          const invoices = invRes.data || [];
          const pos = poRes.data || [];

          setCells([
            {
              icon: <ClipboardList className="h-5 w-5" />,
              label: 'Work Orders',
              tab: 'work-orders',
              segments: [
                { count: workOrders.filter(w => ['approved', 'contracted'].includes(w.status)).length, label: 'Approved', color: 'text-green-600' },
                { count: workOrders.filter(w => !['draft', 'approved', 'contracted'].includes(w.status)).length, label: 'Pending', color: 'text-amber-600' },
                { count: workOrders.length, label: 'Total', color: 'text-muted-foreground' },
              ],
            },
            {
              icon: <Receipt className="h-5 w-5" />,
              label: 'Invoices',
              tab: 'invoices',
              segments: [
                { count: invoices.filter(i => ['APPROVED', 'PAID'].includes(i.status)).length, label: 'Approved', color: 'text-green-600' },
                { count: invoices.filter(i => i.status === 'SUBMITTED').length, label: 'Pending', color: 'text-amber-600' },
                { count: invoices.length, label: 'Total', color: 'text-muted-foreground' },
              ],
            },
            {
              icon: <Package className="h-5 w-5" />,
              label: 'Purchase Orders',
              tab: 'purchase-orders',
              segments: [
                { count: pos.filter(p => p.status === 'SUBMITTED').length, label: 'Awaiting', color: 'text-amber-600' },
                { count: pos.filter(p => ['ORDERED', 'READY_FOR_DELIVERY'].includes(p.status)).length, label: 'In Transit', color: 'text-blue-600' },
                { count: pos.filter(p => p.status === 'DELIVERED').length, label: 'Delivered', color: 'text-green-600' },
              ],
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }

      setLoading(false);
    };

    fetchMetrics();
  }, [projectId, user, isSupplier, supplierOrgId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
      {cells.map((cell) => (
        <button
          key={cell.tab}
          onClick={() => onNavigate(cell.tab)}
          className={cn(
            "rounded-xl border bg-card p-3 md:p-4 min-h-[100px] md:min-h-[112px]",
            "hover:bg-accent/50 hover:border-primary/30 transition-all",
            "cursor-pointer text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            {cell.icon}
            <span className="text-sm font-medium">{cell.label}</span>
          </div>
          <div className="flex items-baseline gap-2 md:gap-4 overflow-hidden">
            {cell.segments.map((seg, i) => (
              <div key={i} className="min-w-0">
                <p className={cn("text-xl sm:text-2xl font-bold tabular-nums", seg.color)}>{seg.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{seg.label}</p>
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
