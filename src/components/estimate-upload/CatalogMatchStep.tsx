import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle2, AlertCircle, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ParsedPack } from '@/lib/parseEstimateCSV';

export interface MatchedItem {
  supplier_sku: string;
  description: string;
  quantity: number;
  uom: string;
  catalog_item_id: string | null;
  match_status: 'EXACT' | 'NONE';
  catalog_description?: string;
}

export interface MatchedPack {
  name: string;
  items: MatchedItem[];
}

interface CatalogMatchStepProps {
  packs: ParsedPack[];
  supplierId: string;
  onConfirm: (matchedPacks: MatchedPack[]) => void;
  onBack: () => void;
}

export function CatalogMatchStep({
  packs,
  supplierId,
  onConfirm,
  onBack,
}: CatalogMatchStepProps) {
  const [matchedPacks, setMatchedPacks] = useState<MatchedPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchStats, setMatchStats] = useState({ matched: 0, unmatched: 0 });

  useEffect(() => {
    runMatching();
  }, [packs, supplierId]);

  const runMatching = async () => {
    setLoading(true);

    // Collect all unique SKUs
    const allSkus = new Set<string>();
    for (const pack of packs) {
      for (const item of pack.items) {
        allSkus.add(item.supplier_sku.toUpperCase().trim());
      }
    }

    // Batch query catalog for all SKUs at once
    const skuArray = Array.from(allSkus);
    const catalogMap = new Map<string, { id: string; description: string }>();

    // Query in batches of 100
    for (let i = 0; i < skuArray.length; i += 100) {
      const batch = skuArray.slice(i, i + 100);
      const { data } = await supabase
        .from('catalog_items')
        .select('id, supplier_sku, description')
        .eq('supplier_id', supplierId)
        .in('supplier_sku', batch);

      if (data) {
        for (const item of data) {
          catalogMap.set(item.supplier_sku.toUpperCase().trim(), {
            id: item.id,
            description: item.description,
          });
        }
      }
    }

    // Build matched packs
    let matched = 0;
    let unmatched = 0;

    const result: MatchedPack[] = packs.map((pack) => ({
      name: pack.name,
      items: pack.items.map((item) => {
        const normalizedSku = item.supplier_sku.toUpperCase().trim();
        const catalogMatch = catalogMap.get(normalizedSku);

        if (catalogMatch) {
          matched++;
          return {
            ...item,
            catalog_item_id: catalogMatch.id,
            match_status: 'EXACT' as const,
            catalog_description: catalogMatch.description,
          };
        } else {
          unmatched++;
          return {
            ...item,
            catalog_item_id: null,
            match_status: 'NONE' as const,
          };
        }
      }),
    }));

    setMatchedPacks(result);
    setMatchStats({ matched, unmatched });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Matching items to catalog...</p>
      </div>
    );
  }

  const total = matchStats.matched + matchStats.unmatched;
  const matchPercent = total > 0 ? Math.round((matchStats.matched / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Match Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className="bg-green-600 text-white px-3 py-1">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          {matchStats.matched} Matched
        </Badge>
        {matchStats.unmatched > 0 && (
          <Badge variant="outline" className="border-amber-500 text-amber-600 px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            {matchStats.unmatched} Unmatched
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {matchPercent}% match rate
        </span>
      </div>

      {/* Matched Packs */}
      <ScrollArea className="h-[50vh]">
        <Accordion type="multiple" className="space-y-2">
          {matchedPacks.map((pack) => {
            const packMatched = pack.items.filter(i => i.match_status === 'EXACT').length;
            const packTotal = pack.items.length;

            return (
              <AccordionItem key={pack.name} value={pack.name} className="border rounded-lg px-1">
                <AccordionTrigger className="hover:no-underline px-3">
                  <div className="flex items-center justify-between w-full mr-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{pack.name}</span>
                    </div>
                    <Badge
                      variant={packMatched === packTotal ? 'default' : 'outline'}
                      className={packMatched === packTotal ? 'bg-green-600' : 'border-amber-500 text-amber-600'}
                    >
                      {packMatched}/{packTotal} matched
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  <div className="space-y-1.5">
                    {pack.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                          item.match_status === 'EXACT'
                            ? 'bg-green-50 dark:bg-green-950/20'
                            : 'bg-amber-50 dark:bg-amber-950/20'
                        }`}
                      >
                        {item.match_status === 'EXACT' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{item.supplier_sku}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </span>
                          </div>
                          {item.catalog_description && (
                            <p className="text-xs text-green-700 dark:text-green-400 truncate">
                              → {item.catalog_description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium shrink-0">
                          {item.quantity} {item.uom}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => onConfirm(matchedPacks)}>
          Confirm & Save Estimate
        </Button>
      </div>
    </div>
  );
}
