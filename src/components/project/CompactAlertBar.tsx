import { useEffect, useState } from 'react';
import { Receipt, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface CompactAlertBarProps {
  projectId: string;
  onNavigate: (tab: string) => void;
  financials: ProjectFinancials;
  projectStatus: string;
  isSupplier?: boolean;
  supplierOrgId?: string | null;
}

interface AlertChip {
  label: string;
  tab?: string;
  variant: 'amber' | 'red';
}

export function CompactAlertBar({ projectId, onNavigate, financials, projectStatus, isSupplier, supplierOrgId }: CompactAlertBarProps) {
  const { user } = useAuth();
  const [chips, setChips] = useState<AlertChip[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!user) return;
      const result: AlertChip[] = [];

      try {
        if (isSupplier && supplierOrgId) {
          const { data: supplierData } = await supabase
            .from('suppliers').select('id').eq('organization_id', supplierOrgId).maybeSingle();
          if (supplierData?.id) {
            const { data: pos } = await supabase
              .from('purchase_orders').select('status').eq('project_id', projectId).eq('supplier_id', supplierData.id).eq('status', 'SUBMITTED');
            if (pos && pos.length > 0) {
              result.push({ label: `${pos.length} PO${pos.length > 1 ? 's' : ''} need pricing`, tab: 'purchase-orders', variant: 'amber' });
            }
          }
        } else {
          const [invRes, poRes] = await Promise.all([
            supabase.from('invoices').select('status').eq('project_id', projectId).eq('status', 'SUBMITTED'),
            supabase.from('purchase_orders').select('status').eq('project_id', projectId).eq('status', 'SUBMITTED'),
          ]);
          const pendingInvoices = (invRes.data || []).length;
          const pendingPOs = (poRes.data || []).length;
          if (pendingInvoices > 0) result.push({ label: `${pendingInvoices} Invoice${pendingInvoices > 1 ? 's' : ''} to review`, tab: 'invoices', variant: 'amber' });
          if (pendingPOs > 0) result.push({ label: `${pendingPOs} PO${pendingPOs > 1 ? 's' : ''} awaiting pricing`, tab: 'purchase-orders', variant: 'amber' });
        }
      } catch (e) {
        console.error('Error fetching alert items:', e);
      }

      // Health-based chips
      if (projectStatus === 'active') {
        const { isGCMaterialResponsible, isTCMaterialResponsible, materialEstimateTotal, materialOrdered, outstanding, billedToDate, materialOrderedPending } = financials;
        const showMaterials = isGCMaterialResponsible || isTCMaterialResponsible;
        if (showMaterials && materialEstimateTotal && materialOrdered > materialEstimateTotal) {
          const pct = Math.round(((materialOrdered - materialEstimateTotal) / materialEstimateTotal) * 100);
          result.push({ label: `Material ${pct}% over estimate`, variant: 'red' });
        }
        if (outstanding > 0 && billedToDate > 0 && (outstanding / billedToDate) * 100 > 50) {
          result.push({ label: 'High outstanding balance', variant: 'red' });
        }
        if (materialOrderedPending > 0) {
          result.push({ label: 'Unconfirmed delivery', variant: 'amber' });
        }
      }

      setChips(result);
    };
    fetchItems();
  }, [projectId, user, isSupplier, supplierOrgId, financials, projectStatus]);

  if (chips.length === 0) return null;

  const hasRed = chips.some(c => c.variant === 'red');
  const barBg = hasRed
    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40';

  return (
    <div className={cn('rounded-xl border px-3 py-2 flex items-center gap-2 flex-wrap', barBg)}>
      <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', hasRed ? 'text-red-500' : 'text-amber-500')} />
      {chips.map((chip, i) => {
        const chipColor = chip.variant === 'red'
          ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200';
        const Tag = chip.tab ? 'button' : 'span';
        return (
          <Tag
            key={i}
            onClick={chip.tab ? () => onNavigate(chip.tab!) : undefined}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium whitespace-nowrap',
              chipColor,
              chip.tab && 'cursor-pointer hover:opacity-80 transition-opacity'
            )}
          >
            {chip.label}
          </Tag>
        );
      })}
    </div>
  );
}
