import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { useDemoProjectData } from '@/hooks/useDemoData';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_INVOICE_LINE_ITEMS, type DemoInvoice } from '@/data/demoData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function DemoInvoicesTab({ projectId }: { projectId: string }) {
  const data = useDemoProjectData();
  const { demoRole } = useDemo();
  const [selectedInv, setSelectedInv] = useState<DemoInvoice | null>(null);

  if (!data) return null;

  const { invoices } = data;
  const isGC = demoRole === 'GC';
  const isTC = demoRole === 'TC';

  const lineItems = selectedInv
    ? DEMO_INVOICE_LINE_ITEMS.filter(li => li.invoice_id === selectedInv.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {isTC && (
          <Button size="sm" onClick={() => toast.info('Create Invoice from SOV coming soon in demo!')}>
            <Plus className="h-4 w-4 mr-1" /> Create Invoice
          </Button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(
          invoices.reduce<Record<string, number>>((acc, inv) => {
            acc[inv.status] = (acc[inv.status] || 0) + 1;
            return acc;
          }, {})
        ).map(([status, count]) => (
          <Badge key={status} variant="outline" className="text-xs">
            {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
          </Badge>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {invoices.map(inv => (
          <Card
            key={inv.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setSelectedInv(inv)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{inv.invoice_number}</CardTitle>
                <Badge className={STATUS_STYLES[inv.status] || 'bg-muted'}>{inv.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {inv.billing_period_start} — {inv.billing_period_end}
              </p>
              <p className="font-medium text-foreground flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
                {inv.total_amount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedInv} onOpenChange={(open) => !open && setSelectedInv(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedInv && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedInv.invoice_number}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={STATUS_STYLES[selectedInv.status] || 'bg-muted'}>
                    {selectedInv.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedInv.billing_period_start} — {selectedInv.billing_period_end}
                  </span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Scheduled</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">This Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map(li => (
                      <TableRow key={li.id}>
                        <TableCell className="font-mono text-sm">{li.sov_code}</TableCell>
                        <TableCell className="text-sm">{li.description}</TableCell>
                        <TableCell className="text-right">${li.scheduled_value.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${li.previous_billed.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">${li.current_billed.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-semibold text-lg">${selectedInv.total_amount.toLocaleString()}</span>
                </div>

                {isGC && selectedInv.status === 'submitted' && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        toast.success('Invoice approved! (Demo mode)');
                        setSelectedInv(null);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        toast.info('Invoice rejected. (Demo mode)');
                        setSelectedInv(null);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
