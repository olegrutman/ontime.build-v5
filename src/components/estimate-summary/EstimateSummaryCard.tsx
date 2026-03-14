import { useMemo, useState, useEffect } from 'react';
import { Package, Receipt, ChevronRight, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import type { SupplierEstimateItem } from '@/types/supplierEstimate';

interface EstimateSummaryCardProps {
  items: SupplierEstimateItem[];
  totalWithTax: number;
  estimateId?: string;
}

interface PackSummary {
  name: string;
  itemCount: number;
  subtotal: number;
  percentOfTotal: number;
}

export function EstimateSummaryCard({ items, totalWithTax }: EstimateSummaryCardProps) {
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());

  const { subtotal, packs, totalItems, packItems } = useMemo(() => {
    let subtotal = 0;
    const packMap = new Map<string, { itemCount: number; subtotal: number }>();
    const packItemsMap = new Map<string, SupplierEstimateItem[]>();

    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      subtotal += lineTotal;
      const packName = item.pack_name || 'Ungrouped';
      const existing = packMap.get(packName) || { itemCount: 0, subtotal: 0 };
      existing.itemCount += 1;
      existing.subtotal += lineTotal;
      packMap.set(packName, existing);

      if (!packItemsMap.has(packName)) packItemsMap.set(packName, []);
      packItemsMap.get(packName)!.push(item);
    }

    const packs: PackSummary[] = Array.from(packMap.entries()).map(([name, data]) => ({
      name,
      itemCount: data.itemCount,
      subtotal: data.subtotal,
      percentOfTotal: subtotal > 0 ? (data.subtotal / subtotal) * 100 : 0,
    }));

    return { subtotal, packs, totalItems: items.length, packItems: packItemsMap };
  }, [items]);

  const taxAmount = totalWithTax > 0 && subtotal > 0 ? totalWithTax - subtotal : 0;
  const taxPercent = subtotal > 0 && taxAmount > 0 ? (taxAmount / subtotal) * 100 : 0;

  const togglePack = (packName: string) => {
    setExpandedPacks(prev => {
      const next = new Set(prev);
      if (next.has(packName)) next.delete(packName);
      else next.add(packName);
      return next;
    });
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card data-sasha-card="Estimate Summary">
      <CardContent className="p-4 space-y-4">
        {/* Financial Totals */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Estimate Summary</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (before tax)</span>
            <span className="font-medium">${fmt(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxPercent.toFixed(2)}%)</span>
            <span className="font-medium">${fmt(taxAmount)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-sm font-semibold">
            <span>Total (incl. tax)</span>
            <span>${fmt(totalWithTax > 0 ? totalWithTax : subtotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Overall Stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{packs.length} pack{packs.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{totalItems} item{totalItems !== 1 ? 's' : ''} total</span>
        </div>

        {/* Pack Breakdown - Expandable */}
        {packs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pack Breakdown</span>
            </div>
            <div className="space-y-1.5">
              {packs.map((pack) => {
                const isOpen = expandedPacks.has(pack.name);
                const items = packItems.get(pack.name) || [];
                return (
                  <Collapsible key={pack.name} open={isOpen} onOpenChange={() => togglePack(pack.name)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                          <span className="font-medium">{pack.name}</span>
                          <Badge variant="outline" className="text-[10px]">{pack.itemCount} items</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-muted-foreground text-xs">{pack.percentOfTotal.toFixed(1)}%</span>
                          <span className="font-medium">${fmt(pack.subtotal)}</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 ml-2 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">SKU</TableHead>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-xs text-right">Qty</TableHead>
                              <TableHead className="text-xs">UOM</TableHead>
                              <TableHead className="text-xs text-right">Unit Price</TableHead>
                              <TableHead className="text-xs text-right">Line Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-mono text-xs py-1.5">{item.supplier_sku || '—'}</TableCell>
                                  <TableCell className="text-xs py-1.5">
                                    <div>
                                      <span>{item.description}</span>
                                      {item.catalog_item_id && (
                                        <Badge variant="outline" className="text-[10px] ml-1.5 bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                                          Matched
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-1.5">{item.quantity}</TableCell>
                                  <TableCell className="text-xs py-1.5">{item.uom}</TableCell>
                                  <TableCell className="text-xs text-right py-1.5">${fmt(item.unit_price || 0)}</TableCell>
                                  <TableCell className="text-xs text-right py-1.5 font-medium">${fmt(lineTotal)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
