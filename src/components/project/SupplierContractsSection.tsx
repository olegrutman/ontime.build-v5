import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { POStatusBadge } from '@/components/purchase-orders/POStatusBadge';
import { POStatus } from '@/types/purchaseOrder';

interface SupplierContractsSectionProps {
  projectId: string;
  supplierOrgId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SupplierContractsSection({ projectId, supplierOrgId }: SupplierContractsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // First get the supplier_id from the org_id
  const { data: supplier } = useQuery({
    queryKey: ['supplier-by-org', supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', supplierOrgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!supplierOrgId,
  });

  const { data: pos, isLoading } = useQuery({
    queryKey: ['supplier-contracts', projectId, supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id, 
          po_number, 
          po_name, 
          status,
          line_items:po_line_items(line_total)
        `)
        .eq('project_id', projectId)
        .eq('supplier_id', supplier!.id)
        .in('status', ['FINALIZED', 'DELIVERED'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!supplier?.id,
  });

  const totalContractValue = pos?.reduce((sum, po) => {
    const poTotal = po.line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
    return sum + poTotal;
  }, 0) || 0;

  if (isLoading || !supplier) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-3 px-4">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-muted/30 py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                My Orders (Contracts)
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pos?.length || 0} finalized • {formatCurrency(totalContractValue)}
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 space-y-2">
            {pos && pos.length > 0 ? (
              pos.map((po) => {
                const poTotal = po.line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
                return (
                  <div
                    key={po.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{po.po_number}</p>
                        <POStatusBadge status={po.status as POStatus} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{po.po_name}</p>
                    </div>
                    <span className="font-mono text-sm ml-2">{formatCurrency(poTotal)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No finalized orders yet
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
