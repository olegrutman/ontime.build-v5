import { useState, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ArrowUpDown, Eye, Edit, Send, Loader2 } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POStatusBadge } from './POStatusBadge';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type SortKey = 'po_number' | 'supplier' | 'items' | 'status' | 'total' | 'created_at' | 'age';
type SortDir = 'asc' | 'desc';

const STATUS_PRIORITY: Record<POStatus, number> = {
  ACTIVE: 0,
  PENDING_APPROVAL: 1,
  SUBMITTED: 2,
  PRICED: 3,
  ORDERED: 4,
  DELIVERED: 5,
};

interface POTableViewProps {
  purchaseOrders: PurchaseOrder[];
  onView: (po: PurchaseOrder) => void;
  onEdit?: (po: PurchaseOrder) => void;
  onSubmit?: (po: PurchaseOrder) => Promise<void>;
  canCreatePO: boolean;
  canViewPricing: (po: PurchaseOrder) => boolean;
  isInvoiced: (poId: string) => boolean;
}

function getAgeDays(po: PurchaseOrder): number | null {
  if (po.status === 'ACTIVE' || po.status === 'DELIVERED') return null;
  const ref = po.submitted_at || po.created_at;
  return differenceInDays(new Date(), new Date(ref));
}

function AgeBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  const variant = days <= 7 ? 'green' : days <= 21 ? 'amber' : 'red';
  const colors = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <Badge className={cn('font-mono text-xs', colors[variant])}>
      {days}d
    </Badge>
  );
}

export function POTableView({
  purchaseOrders, onView, onEdit, onSubmit, canCreatePO, canViewPricing, isInvoiced,
}: POTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    const arr = [...purchaseOrders];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'po_number': return dir * a.po_number.localeCompare(b.po_number);
        case 'supplier': return dir * ((a.supplier?.name || '').localeCompare(b.supplier?.name || ''));
        case 'items': return dir * ((a.line_items?.length || 0) - (b.line_items?.length || 0));
        case 'status': return dir * (STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
        case 'total': return dir * ((a.po_total || 0) - (b.po_total || 0));
        case 'created_at': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'age': return dir * ((getAgeDays(a) ?? -1) - (getAgeDays(b) ?? -1));
        default: return 0;
      }
    });
    return arr;
  }, [purchaseOrders, sortKey, sortDir]);

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(sortKeyVal)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const handleAction = async (po: PurchaseOrder, action: (p: PurchaseOrder) => Promise<void>) => {
    setLoadingId(po.id);
    try { await action(po); } finally { setLoadingId(null); }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead><SortHeader label="PO #" sortKeyVal="po_number" /></TableHead>
            <TableHead><SortHeader label="Supplier" sortKeyVal="supplier" /></TableHead>
            <TableHead className="text-center"><SortHeader label="Items" sortKeyVal="items" /></TableHead>
            <TableHead><SortHeader label="Status" sortKeyVal="status" /></TableHead>
            <TableHead className="text-right"><SortHeader label="Total" sortKeyVal="total" /></TableHead>
            <TableHead><SortHeader label="Date" sortKeyVal="created_at" /></TableHead>
            <TableHead className="text-center"><SortHeader label="Age" sortKeyVal="age" /></TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No purchase orders found
              </TableCell>
            </TableRow>
          ) : sorted.map((po) => {
            const age = getAgeDays(po);
            const isLoading = loadingId === po.id;
            const showPricing = canViewPricing(po);
            const invoiced = isInvoiced(po.id);

            return (
              <TableRow
                key={po.id}
                className="cursor-pointer"
                onClick={() => onView(po)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {po.po_number}
                    {invoiced && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5">
                        Invoiced
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[180px]">
                  {po.supplier?.name || '—'}
                </TableCell>
                <TableCell className="text-center">
                  {po.line_items?.length || 0}
                </TableCell>
                <TableCell>
                  <POStatusBadge status={po.status} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {showPricing && po.po_total ? formatCurrency(po.po_total) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(po.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-center">
                  <AgeBadge days={age} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(po)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canCreatePO && po.status === 'ACTIVE' && onEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(po)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canCreatePO && po.status === 'ACTIVE' && onSubmit && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-blue-600"
                        disabled={isLoading}
                        onClick={() => handleAction(po, onSubmit)}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
