import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PurchaseOrder, POStatus, PO_STATUS_LABELS } from '@/types/purchaseOrder';
import { POWizardV2 } from '@/components/po-wizard-v2';
import { POWizardV2Data } from '@/types/poWizardV2';
import { POCard, PODetail } from '@/components/purchase-orders';
import { Package } from 'lucide-react';

interface PurchaseOrdersTabProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
}

export function PurchaseOrdersTab({ projectId, projectName, projectAddress }: PurchaseOrdersTabProps) {
  const { userOrgRoles, currentRole, user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const canCreatePO = currentRole === 'GC_PM' || currentRole === 'TC_PM';

  useEffect(() => {
    fetchPurchaseOrders();
  }, [projectId, currentOrgId]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, contact_info),
        work_item:work_items(id, title),
        line_items:po_line_items(id)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Suppliers only see POs sent to them
    if (isSupplier) {
      const { data: supplierLinks } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrgId);
      
      if (supplierLinks && supplierLinks.length > 0) {
        const supplierIds = supplierLinks.map(s => s.id);
        query = query.in('supplier_id', supplierIds);
      } else {
        setPurchaseOrders([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POs:', error);
    } else {
      setPurchaseOrders((data || []) as unknown as PurchaseOrder[]);
    }
    setLoading(false);
  };

  const handleCreatePO = async (data: POWizardV2Data) => {
    if (!currentOrgId) return;
    
    setIsSubmitting(true);
    try {
      // Determine pricing owner based on material_responsibility from project contracts
      let pricingOwnerOrgId: string | null = null;
      
      // Query the project's contracts to find material_responsibility setting
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility, from_org_id, to_org_id')
        .eq('project_id', data.project_id)
        .not('material_responsibility', 'is', null);
      
      if (contracts && contracts.length > 0) {
        // Find the contract where material_responsibility is set
        const contractWithMR = contracts.find(c => c.material_responsibility);
        if (contractWithMR) {
          // If GC is responsible, to_org_id is the GC (payer)
          // If TC is responsible, from_org_id is the TC (contractor)
          pricingOwnerOrgId = contractWithMR.material_responsibility === 'GC' 
            ? contractWithMR.to_org_id 
            : contractWithMR.from_org_id;
        }
      }
      
      // Fallback: if no material_responsibility set, current org is pricing owner
      if (!pricingOwnerOrgId) {
        pricingOwnerOrgId = currentOrgId;
      }
      
      const { data: poNumber } = await supabase.rpc('generate_po_number', {
        org_id: currentOrgId,
      });

      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: currentOrgId,
          po_number: poNumber,
          po_name: `PO for ${data.project_name || 'Materials'}`,
          supplier_id: data.supplier_id,
          project_id: data.project_id,
          notes: data.notes || null,
          status: 'ACTIVE',
          created_by_org_id: currentOrgId,
          pricing_owner_org_id: pricingOwnerOrgId,
          source_estimate_id: data.source_estimate_id || null,
          source_pack_name: data.source_pack_name || null,
          pack_modified: data.pack_modified || false,
        })
        .select()
        .single();

      if (poError) throw poError;

      if (data.line_items.length > 0) {
        const lineItems = data.line_items.map((item, idx) => ({
          po_id: newPO.id,
          line_number: idx + 1,
          supplier_sku: item.supplier_sku,
          description: item.name,
          quantity: item.quantity,
          uom: item.uom,
          pieces: item.unit_mode === 'BUNDLE' ? item.bundle_count : null,
          length_ft: item.length_ft || null,
          computed_lf: item.computed_lf || null,
          notes: item.item_notes || null,
        }));

        const { error: lineError } = await supabase.from('po_line_items').insert(lineItems);
        if (lineError) throw lineError;
      }

      toast.success(`PO ${poNumber} created`);
      setWizardOpen(false);
      fetchPurchaseOrders();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating PO:', error);
      toast.error('Failed to create PO: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitToSupplier = async (po: PurchaseOrder) => {
    // This will be handled by the detail view
    setSelectedPOId(po.id);
  };

  const handleDownload = (po: PurchaseOrder) => {
    if (!po.download_token) {
      toast.error('Download not available');
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/po-download?token=${po.download_token}&format=pdf`;
    window.open(url, '_blank');
  };

  const filteredPOs = statusFilter === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(po => po.status === statusFilter);

  const stats = {
    total: purchaseOrders.length,
    active: purchaseOrders.filter(po => po.status === 'ACTIVE').length,
    submitted: purchaseOrders.filter(po => po.status === 'SUBMITTED').length,
    priced: purchaseOrders.filter(po => po.status === 'PRICED').length,
    ordered: purchaseOrders.filter(po => po.status === 'ORDERED').length,
    delivered: purchaseOrders.filter(po => po.status === 'DELIVERED').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show detail view if a PO is selected
  if (selectedPOId) {
    return (
      <PODetail
        poId={selectedPOId}
        projectId={projectId}
        onBack={() => setSelectedPOId(null)}
        onUpdate={fetchPurchaseOrders}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Purchase Orders</h2>
            <p className="text-sm text-muted-foreground">
              {stats.total} PO{stats.total !== 1 ? 's' : ''} • {stats.active} Active • {stats.submitted} Submitted • {stats.delivered} Delivered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PRICED">Priced</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
            {canCreatePO && (
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create PO
              </Button>
            )}
          </div>
        </div>

        {/* PO Grid */}
        {filteredPOs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Purchase Orders</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isSupplier
                  ? 'No purchase orders have been sent to you for this project yet.'
                  : 'Create a purchase order to request materials from suppliers.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPOs.map((po) => (
              <POCard
                key={po.id}
                po={po}
                onClick={() => setSelectedPOId(po.id)}
                onEdit={() => setSelectedPOId(po.id)}
                onDownload={handleDownload}
                onSubmit={handleSubmitToSupplier}
                canEdit={canCreatePO}
                canSubmit={canCreatePO}
                isSupplier={isSupplier}
              />
            ))}
          </div>
        )}
      </div>

      {/* PO Creation Wizard v2 */}
      <POWizardV2
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        projectName={projectName || 'Project'}
        projectAddress={projectAddress || ''}
        onComplete={handleCreatePO}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
