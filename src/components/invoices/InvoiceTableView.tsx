import { useState, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ArrowUpDown, Eye, Edit, Send, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusColumn, INVOICE_STATUS_OPTIONS } from '@/components/ui/status-column';
import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type SortKey = 'invoice_number' | 'created_at' | 'total_amount' | 'status' | 'age';
type SortDir = 'asc' | 'desc';

interface InvoiceTableViewProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onSubmit?: (invoice: Invoice) => Promise<void>;
  onApprove?: (invoice: Invoice) => Promise<void>;
  onDelete?: (invoice: Invoice) => Promise<void>;
  getPermissions: (invoice: Invoice) => { canSubmit: boolean; canApprove: boolean };
}

function getAgeDays(invoice: Invoice): number | null {
  if (invoice.status === 'DRAFT' || invoice.status === 'PAID') return null;
  const ref = invoice.status === 'APPROVED'
    ? (invoice.approved_at || invoice.submitted_at || invoice.created_at)
    : (invoice.submitted_at || invoice.created_at);
  return differenceInDays(new Date(), new Date(ref));
}

function AgeBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  const variant = days <= 14 ? 'green' : days <= 30 ? 'amber' : 'red';
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

export function InvoiceTableView({
  invoices, onView, onEdit, onSubmit, onApprove, onDelete, getPermissions,
}: InvoiceTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    const arr = [...invoices];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'invoice_number': return dir * a.invoice_number.localeCompare(b.invoice_number);
        case 'created_at': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'total_amount': return dir * (a.total_amount - b.total_amount);
        case 'status': return dir * a.status.localeCompare(b.status);
        case 'age': return dir * ((getAgeDays(a) ?? -1) - (getAgeDays(b) ?? -1));
        default: return 0;
      }
    });
    return arr;
  }, [invoices, sortKey, sortDir]);

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(sortKeyVal)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const handleAction = async (invoice: Invoice, action: (inv: Invoice) => Promise<void>) => {
    setLoadingId(invoice.id);
    try { await action(invoice); } finally { setLoadingId(null); }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead><SortHeader label="Invoice #" sortKeyVal="invoice_number" /></TableHead>
            <TableHead><SortHeader label="Date" sortKeyVal="created_at" /></TableHead>
            <TableHead>Billing Period</TableHead>
            <TableHead className="text-right"><SortHeader label="Amount" sortKeyVal="total_amount" /></TableHead>
            <TableHead><SortHeader label="Status" sortKeyVal="status" /></TableHead>
            <TableHead className="text-center"><SortHeader label="Age" sortKeyVal="age" /></TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No invoices found
              </TableCell>
            </TableRow>
          ) : sorted.map((invoice) => {
            const { canSubmit, canApprove } = getPermissions(invoice);
            const age = getAgeDays(invoice);
            const isLoading = loadingId === invoice.id;

            return (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => onView(invoice)}
              >
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(invoice.billing_period_start), 'MMM d')} –{' '}
                  {format(new Date(invoice.billing_period_end), 'MMM d')}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(invoice.total_amount)}
                </TableCell>
                <TableCell>
                  <StatusColumn
                    value={invoice.status}
                    options={INVOICE_STATUS_OPTIONS}
                    size="sm"
                    disabled
                  />
                </TableCell>
                <TableCell className="text-center">
                  <AgeBadge days={age} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(invoice)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canSubmit && invoice.status === 'DRAFT' && onEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canSubmit && invoice.status === 'DRAFT' && onSubmit && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-blue-600"
                        disabled={isLoading}
                        onClick={() => handleAction(invoice, onSubmit)}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    )}
                    {canApprove && invoice.status === 'SUBMITTED' && onApprove && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-emerald-600"
                        disabled={isLoading}
                        onClick={() => handleAction(invoice, onApprove)}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    )}
                    {canSubmit && ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(invoice.status) && onDelete && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        disabled={isLoading}
                        onClick={() => handleAction(invoice, onDelete)}
                      >
                        <Trash2 className="h-4 w-4" />
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
