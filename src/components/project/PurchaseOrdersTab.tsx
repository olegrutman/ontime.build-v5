import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Plus, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ViewSwitcher, ViewMode } from '@/components/ui/view-switcher';
import { toast } from 'sonner';
import { PurchaseOrder, POStatus, PO_STATUS_LABELS } from '@/types/purchaseOrder';
import { POWizardV2 } from '@/components/po-wizard-v2';
import { POWizardV2Data, POWizardV2LineItem } from '@/types/poWizardV2';
import { POCard, PODetail, POActionBar, POTableView } from '@/components/purchase-orders';

const STATUS_PRIORITY: Record<POStatus, number> = {
  ACTIVE: 0,
  PENDING_APPROVAL: 1,
  SUBMITTED: 2,
  PRICED: 3,
  ORDERED: 4,
  DELIVERED: 5,
};

interface PurchaseOrdersTabProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  projectStatus?: string;
}

export function PurchaseOrdersTab({ projectId, projectName, projectAddress, projectStatus }: PurchaseOrdersTabProps) {
  const { userOrgRoles, currentRole, user, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoicedPOIds, setInvoicedPOIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [estimatePackTotals, setEstimatePackTotals] = useState<Map<string, { total: number; itemCount: number }>>(new Map());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<Partial<POWizardV2Data> | null>(null);
  const [materialResponsibility, setMaterialResponsibility] = useState<string | null>(null);
  const [poRequiresApproval, setPORequiresApproval] = useState<boolean>(true);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const isGC = currentOrgType === 'GC';
  const isTC = currentOrgType === 'TC';
  const canCreatePO = permissions?.canCreatePOs ?? false;
  const poParam = searchParams.get('po');

  // TC cannot see pricing when GC is material-responsible
  const hidePricing = isTC && materialResponsibility === 'GC';

  // Directional tabs: only show for GC and TC
  const showDirectionalTabs = isGC || isTC;

  const updatePOSearchParam = useCallback((poId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'purchase-orders');

    if (poId) {
      nextParams.set('po', poId);
    } else {
      nextParams.delete('po');
    }

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openPO = useCallback((poId: string) => {
    setSelectedPOId(poId);
    updatePOSearchParam(poId);
  }, [updatePOSearchParam]);

  const closePO = useCallback(() => {
    setSelectedPOId(null);
    updatePOSearchParam(null);
  }, [updatePOSearchParam]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [projectId, currentOrgId]);

  useEffect(() => {
    if (poParam && poParam !== selectedPOId) {
      setSelectedPOId(poParam);
      return;
    }

    if (!poParam && selectedPOId) {
      setSelectedPOId(null);
    }
  }, [poParam, selectedPOId]);

  // Fetch material_responsibility and approval settings
  useEffect(() => {
    if (!projectId || !currentOrgId) return;
    const fetchContractInfo = async () => {
      // Get material responsibility
      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility')
        .eq('project_id', projectId)
        .not('material_responsibility', 'is', null)
        .limit(1);
      if (contracts && contracts.length > 0) {
        setMaterialResponsibility(contracts[0].material_responsibility);
      }

      // Get approval requirement from project_relationships
      if (isTC) {
        // First find our participant ID
        const { data: participants } = await supabase
          .from('project_participants')
          .select('id')
          .eq('project_id', projectId)
          .eq('organization_id', currentOrgId)
          .limit(1);
        
        if (participants && participants.length > 0) {
          const { data: rels } = await supabase
            .from('project_relationships')
            .select('po_requires_upstream_approval')
            .eq('project_id', projectId)
            .eq('downstream_participant_id', participants[0].id)
            .limit(1);
          if (rels && rels.length > 0) {
            setPORequiresApproval(rels[0].po_requires_upstream_approval ?? true);
          }
        }
      }
    };
    fetchContractInfo();
  }, [projectId, currentOrgId, isTC]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code, contact_info, organization_id),
        line_items:po_line_items(id, unit_price, line_total, quantity, source_estimate_item_id, source_pack_name, original_unit_price, price_adjusted_by_supplier)
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
        query = query.neq('status', 'ACTIVE');
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
      const pos = (data || []) as unknown as PurchaseOrder[];
      setPurchaseOrders(pos);

      // Fetch estimate pack totals for POs that came from estimates
      const packKeys = new Set<string>();
      const estimateIds = new Set<string>();
      for (const po of pos) {
        if (po.source_estimate_id && po.source_pack_name) {
          packKeys.add(`${po.source_estimate_id}|${po.source_pack_name}`);
          estimateIds.add(po.source_estimate_id);
        }
      }

      if (estimateIds.size > 0) {
        const { data: estItems } = await supabase
          .from('supplier_estimate_items')
          .select('estimate_id, pack_name, unit_price, quantity')
          .in('estimate_id', Array.from(estimateIds));

        const totalsMap = new Map<string, { total: number; itemCount: number }>();
        for (const item of estItems || []) {
          const key = `${item.estimate_id}|${item.pack_name || ''}`;
          if (!packKeys.has(key)) continue;
          const existing = totalsMap.get(key) || { total: 0, itemCount: 0 };
          existing.total += (item.unit_price || 0) * (item.quantity || 0);
          existing.itemCount += 1;
          totalsMap.set(key, existing);
        }

        for (const po of pos) {
          if (po.source_estimate_id && po.source_pack_name) {
            const key = `${po.source_estimate_id}|${po.source_pack_name}`;
            const entry = totalsMap.get(key);
            if (entry && !((entry as any)._taxApplied)) {
              const taxMult = 1 + ((po.sales_tax_percent || 0) / 100);
              entry.total *= taxMult;
              (entry as any)._taxApplied = true;
            }
          }
        }

        setEstimatePackTotals(totalsMap);
      } else {
        setEstimatePackTotals(new Map());
      }

      // Fetch which POs have been invoiced
      const poIds = pos.map(p => p.id);
      if (poIds.length > 0) {
        const { data: invoicedData } = await supabase
          .from('invoices')
          .select('po_id')
          .eq('project_id', projectId)
          .in('po_id', poIds)
          .not('po_id', 'is', null);
        
        setInvoicedPOIds(new Set((invoicedData || []).map((inv: any) => inv.po_id)));
      }
    }
    setLoading(false);
  };
...
  if (selectedPOId) {
    return (
      <PODetail
        poId={selectedPOId}
        projectId={projectId}
        onBack={closePO}
        onUpdate={fetchPurchaseOrders}
        hidePricingOverride={hidePricing}
      />
    );
  }
...
        {showDirectionalTabs ? (
          <Tabs defaultValue="my" className="w-full">
            <TabsList>
              <TabsTrigger value="my">
                My POs ({myPOs.length})
              </TabsTrigger>
              <TabsTrigger value="received">
                {receivedTabLabel} ({receivedPOs.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="my">
              {renderPOList(myPOs)}
            </TabsContent>
            <TabsContent value="received">
              {renderPOList(receivedPOs)}
            </TabsContent>
          </Tabs>
        ) : (
          renderPOList(purchaseOrders)
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
        onCreateAndSend={handleCreateAndSend}
        isSubmitting={isSubmitting}
        isSending={isSending}
        hidePricing={hidePricing}
      />

      {/* PO Edit Wizard */}
      {editInitialData && (
        <POWizardV2
          open={editWizardOpen}
          onOpenChange={(open) => {
            setEditWizardOpen(open);
            if (!open) { setEditingPO(null); setEditInitialData(null); }
          }}
          projectId={projectId}
          projectName={projectName || 'Project'}
          projectAddress={projectAddress || ''}
          onComplete={handleEditComplete}
          isSubmitting={isSubmitting}
          editMode
          initialData={editInitialData}
          hidePricing={hidePricing}
        />
      )}
    </>
  );
}
