import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Trash2 } from 'lucide-react';
import { ParsedPack } from '@/lib/parseEstimateCSV';

interface PackReviewStepProps {
  packs: ParsedPack[];
  totalItems: number;
  discardedRows: number;
  onConfirm: () => void;
  onCancel: () => void;
  onRemovePack: (packName: string) => void;
}

export function PackReviewStep({
  packs,
  totalItems,
  discardedRows,
  onConfirm,
  onCancel,
  onRemovePack,
}: PackReviewStepProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {packs.length} Packs
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {totalItems} Items
        </Badge>
        {discardedRows > 0 && (
          <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
            {discardedRows} noise rows removed
          </Badge>
        )}
      </div>

      {/* Pack Accordion */}
      <ScrollArea className="h-[50vh]">
        {packs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No valid packs found in the file</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {packs.map((pack) => (
              <AccordionItem key={pack.name} value={pack.name} className="border rounded-lg px-1">
                <AccordionTrigger className="hover:no-underline px-3">
                  <div className="flex items-center justify-between w-full mr-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{pack.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{pack.items.length} items</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePack(pack.name);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs">UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pack.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs py-1.5">
                            {item.supplier_sku}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">{item.description}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right">{item.quantity}</TableCell>
                          <TableCell className="text-xs py-1.5">{item.uom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} disabled={packs.length === 0}>
          Continue to Catalog Match
        </Button>
      </div>
    </div>
  );
}
