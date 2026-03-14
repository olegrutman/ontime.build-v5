import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Package, CheckCircle2, Plus, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EstimatePack {
  name: string;
  items: EstimatePackItem[];
}

interface EstimatePackItem {
  id: string;
  supplier_sku: string | null;
  description: string;
  quantity: number;
  uom: string;
  catalog_item_id: string | null;
  pack_name: string | null;
  unit_price: number | null;
}

interface PackSelectorProps {
  projectId: string;
  supplierId: string | null;
  onSelectPack: (pack: EstimatePack, estimateId: string) => void;
  onSwitchToCatalog: () => void;
}

export function PackSelector({
  projectId,
  supplierId,
  onSelectPack,
  onSwitchToCatalog,
}: PackSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState<EstimatePack[]>([]);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [estimateName, setEstimateName] = useState<string>('');

  useEffect(() => {
    fetchApprovedEstimate();
  }, [projectId, supplierId]);

  const fetchApprovedEstimate = async () => {
    setLoading(true);

    // Resolve supplier's organization_id if supplierId is provided
    let supplierOrgId: string | null = null;
    if (supplierId) {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('organization_id')
        .eq('id', supplierId)
        .single();
      supplierOrgId = supplierData?.organization_id ?? null;
    }

    // Find the most recent approved estimate for this project (+ supplier filter)
    let query = supabase
      .from('supplier_estimates')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false })
      .limit(1);

    if (supplierOrgId) {
      query = query.eq('supplier_org_id', supplierOrgId);
    }

    const { data: estimates } = await query;

    if (!estimates || estimates.length === 0) {
      setPacks([]);
      setLoading(false);
      return;
    }

    const estimate = estimates[0];
    setEstimateId(estimate.id);
    setEstimateName(estimate.name);

    // Fetch ALL items for the approved estimate (no pack_name filter)
    const { data: items } = await supabase
      .from('supplier_estimate_items')
      .select('id, supplier_sku, description, quantity, uom, catalog_item_id, pack_name, unit_price')
      .eq('estimate_id', estimate.id)
      .order('created_at');

    if (items) {
      // Group by pack_name
      const packMap = new Map<string, EstimatePackItem[]>();
      for (const item of items) {
        const packName = item.pack_name || 'Ungrouped Items';
        if (!packMap.has(packName)) {
          packMap.set(packName, []);
        }
        packMap.get(packName)!.push(item as EstimatePackItem);
      }

      const packList: EstimatePack[] = [];
      for (const [name, packItems] of packMap) {
        packList.push({ name, items: packItems });
      }
      setPacks(packList);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <div className="p-3 rounded-full bg-muted mb-3">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No approved estimate found</h3>
        <p className="text-xs text-muted-foreground mb-4">
          There are no approved estimates with packs for this project yet.
        </p>
        <Button variant="outline" size="sm" onClick={onSwitchToCatalog}>
          <Plus className="h-4 w-4 mr-1" />
          Order from Full Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Estimate Name */}
      <div className="px-1">
        <p className="text-xs text-muted-foreground">
          From estimate: <span className="font-medium text-foreground">{estimateName}</span>
        </p>
      </div>

      {/* Pack List */}
        <div className="space-y-2 px-1">
          {packs.map((pack) => {
            const matchedCount = pack.items.filter(i => i.catalog_item_id).length;
            const totalCount = pack.items.length;
            const allMatched = matchedCount === totalCount;

            return (
              <Card
                key={pack.name}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => estimateId && onSelectPack(pack, estimateId)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{pack.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {totalCount} item{totalCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {allMatched && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
    </div>
  );
}
