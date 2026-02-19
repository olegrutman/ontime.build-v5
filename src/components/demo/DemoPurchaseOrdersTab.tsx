import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Package, DollarSign } from 'lucide-react';
import { useDemoProjectData } from '@/hooks/useDemoData';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_PO_LINE_ITEMS, type DemoPurchaseOrder } from '@/data/demoData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  priced: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function DemoPurchaseOrdersTab({ projectId }: { projectId: string }) {
  const data = useDemoProjectData();
  const { demoRole } = useDemo();
  const [selectedPO, setSelectedPO] = useState<DemoPurchaseOrder | null>(null);

  if (!data) return null;

  const { purchaseOrders } = data;
  const canCreate = demoRole === 'GC' || demoRole === 'TC';
  const isSupplier = demoRole === 'SUPPLIER';

  const lineItems = selectedPO
    ? DEMO_PO_LINE_ITEMS.filter(li => li.po_id === selectedPO.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Purchase Orders</h2>
        {canCreate && (
          <Button size="sm" onClick={() => toast.info('PO Wizard coming soon in demo mode!')}>
            <Plus className="h-4 w-4 mr-1" /> Create PO
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {purchaseOrders.map(po => (
          <Card
            key={po.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setSelectedPO(po)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{po.po_number}</CardTitle>
                <Badge className={STATUS_STYLES[po.status] || 'bg-muted'}>{po.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {po.supplier_name}
              </p>
              <div className="flex justify-between pt-1">
                <span>{po.items_count} items</span>
                <span className="font-medium text-foreground flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  {po.total_amount.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedPO && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedPO.po_number}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={STATUS_STYLES[selectedPO.status] || 'bg-muted'}>
                    {selectedPO.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{selectedPO.supplier_name}</span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">
                        {isSupplier ? 'Your Price' : 'Unit Price'}
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map(li => (
                      <TableRow key={li.id}>
                        <TableCell className="text-sm">{li.description}</TableCell>
                        <TableCell className="text-right">{li.quantity}</TableCell>
                        <TableCell>{li.uom}</TableCell>
                        <TableCell className="text-right">
                          {isSupplier ? (
                            <Input
                              type="number"
                              defaultValue={li.unit_price}
                              className="h-7 w-20 text-right text-sm"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            `$${li.unit_price.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(li.quantity * li.unit_price).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg">
                    ${selectedPO.total_amount.toLocaleString()}
                  </span>
                </div>

                {isSupplier && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      toast.success('Pricing submitted! (Demo mode)');
                      setSelectedPO(null);
                    }}
                  >
                    Submit Pricing
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
