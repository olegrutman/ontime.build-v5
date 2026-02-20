import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  POWizardV2Data,
  POWizardV2LineItem,
  ProjectSupplier,
  INITIAL_PO_WIZARD_V2_DATA,
} from '@/types/poWizardV2';
import { HeaderScreen } from './HeaderScreen';
import { ItemsScreen } from './ItemsScreen';
import { ReviewScreen } from './ReviewScreen';
import { ProductPicker } from './ProductPicker';
import { UnmatchedItemEditor } from './UnmatchedItemEditor';

type Screen = 'header' | 'items' | 'review';

/** Check if an approved estimate exists for this project + supplier combo */
async function checkApprovedEstimate(projectId: string, supplierId: string | null): Promise<boolean> {
  let supplierOrgId: string | null = null;
  if (supplierId) {
    const { data } = await supabase
      .from('suppliers')
      .select('organization_id')
      .eq('id', supplierId)
      .single();
    supplierOrgId = data?.organization_id ?? null;
  }

  let query = supabase
    .from('supplier_estimates')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'APPROVED');

  if (supplierOrgId) {
    query = query.eq('supplier_org_id', supplierOrgId);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

interface POWizardV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectAddress: string;
  onComplete: (data: POWizardV2Data) => Promise<void>;
  isSubmitting?: boolean;
  // Work Order context (optional)
  workOrderId?: string;
  workOrderTitle?: string;
  onPOCreated?: (poId: string) => Promise<void>;
  // Edit mode
  editMode?: boolean;
  initialData?: Partial<POWizardV2Data>;
}

export function POWizardV2({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectAddress,
  onComplete,
  isSubmitting = false,
  workOrderId,
  workOrderTitle,
  onPOCreated,
  editMode = false,
  initialData,
}: POWizardV2Props) {
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState<Screen>('header');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<POWizardV2LineItem | null>(null);
  const [unmatchedEditorOpen, setUnmatchedEditorOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [hasApprovedEstimate, setHasApprovedEstimate] = useState(false);
  const [formData, setFormData] = useState<POWizardV2Data>(() => ({
    ...INITIAL_PO_WIZARD_V2_DATA,
    project_id: projectId,
    project_name: projectName,
    delivery_address: projectAddress,
  }));

  // Fetch project suppliers
  useEffect(() => {
    if (!open || !projectId) return;
    
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        // Get supplier org IDs from project team
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select('org_id')
          .eq('project_id', projectId)
          .eq('role', 'Supplier');

        if (teamError) throw teamError;

        if (!teamData || teamData.length === 0) {
          setSuppliers([]);
          setLoadingSuppliers(false);
          return;
        }

        const orgIds = teamData.map(t => t.org_id);

        // Get supplier records for these orgs
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id, name, supplier_code, organization_id')
          .in('organization_id', orgIds);

        if (supplierError) throw supplierError;

        const projectSuppliers: ProjectSupplier[] = (supplierData || []).map(s => ({
          id: s.id,
          name: s.name,
          supplier_code: s.supplier_code,
          organization_id: s.organization_id,
        }));

        setSuppliers(projectSuppliers);

        // Auto-select if single supplier
        if (projectSuppliers.length === 1) {
          setFormData(prev => ({
            ...prev,
            supplier_id: projectSuppliers[0].id,
            supplier_name: projectSuppliers[0].name,
          }));
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error('Failed to load project suppliers');
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [open, projectId]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      if (editMode && initialData) {
        setScreen('items');
        setFormData({
          ...INITIAL_PO_WIZARD_V2_DATA,
          project_id: projectId,
          project_name: projectName,
          delivery_address: projectAddress,
          ...initialData,
        });
      } else {
        setScreen('header');
        setHasApprovedEstimate(false);
        setFormData({
          ...INITIAL_PO_WIZARD_V2_DATA,
          project_id: projectId,
          project_name: projectName,
          delivery_address: projectAddress,
          work_order_id: workOrderId,
          work_order_title: workOrderTitle,
        });
      }
    }
  }, [open, projectId, projectName, projectAddress, workOrderId, workOrderTitle, editMode, initialData]);

  // Check for approved estimate when supplier changes
  useEffect(() => {
    if (!open || !formData.supplier_id) {
      setHasApprovedEstimate(false);
      return;
    }
    checkApprovedEstimate(projectId, formData.supplier_id).then(setHasApprovedEstimate);
  }, [open, projectId, formData.supplier_id]);

  const handleChange = useCallback((updates: Partial<POWizardV2Data>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleAddItem = useCallback((item: POWizardV2LineItem) => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, item],
      // If we had a pack loaded, mark as modified
      pack_modified: prev.source_pack_name ? true : prev.pack_modified,
    }));
    setPickerOpen(false);
    toast.success('Item added');
  }, []);

  const handleUpdateItem = useCallback((updatedItem: POWizardV2LineItem) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ),
      pack_modified: prev.source_pack_name ? true : prev.pack_modified,
    }));
    setPickerOpen(false);
    setEditingItem(null);
    toast.success('Item updated');
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
      pack_modified: prev.source_pack_name ? true : prev.pack_modified,
    }));
    toast.success('Item removed');
  }, []);

  const handleClearPack = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      line_items: [],
      source_estimate_id: null,
      source_pack_name: null,
      pack_modified: false,
    }));
  }, []);

  const handleLoadPack = useCallback((items: POWizardV2LineItem[], estimateId: string, packName: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: items,
      source_estimate_id: estimateId,
      source_pack_name: packName,
      pack_modified: false,
    }));
    toast.success(`Pack "${packName}" loaded with ${items.length} items`);
  }, []);

  const handleSubmit = async () => {
    await onComplete(formData);
    onOpenChange(false);
  };

  const handleClose = () => {
    setScreen('header');
    onOpenChange(false);
  };

  const canAdvanceFromHeader = !!formData.supplier_id;

  const canAdvanceFromItems = formData.line_items.length > 0;

  // Fix 1: Auto-open picker when arriving at items screen with no items
  const handleAdvanceToItems = useCallback(() => {
    setScreen('items');
    if (formData.line_items.length === 0) {
      setPickerOpen(true);
    }
  }, [formData.line_items.length]);

  const content = (
    <div className="flex flex-col h-full">
      {screen === 'header' && (
        <HeaderScreen
          data={formData}
          suppliers={suppliers}
          loadingSuppliers={loadingSuppliers}
          onChange={handleChange}
          onNext={handleAdvanceToItems}
          canAdvance={canAdvanceFromHeader}
          workOrderTitle={workOrderTitle}
        />
      )}
      {screen === 'items' && (
        <ItemsScreen
          items={formData.line_items}
          onAddItem={() => setPickerOpen(true)}
          onEditItem={(item) => {
            const isUnmatched = !item.catalog_item_id;
            setEditingItem(item);
            if (isUnmatched) {
              setUnmatchedEditorOpen(true);
            } else {
              setPickerOpen(true);
            }
          }}
          onRemoveItem={handleRemoveItem}
          onBack={() => setScreen('header')}
          onNext={() => setScreen('review')}
          canAdvance={canAdvanceFromItems}
          sourcePackName={formData.source_pack_name}
          onClearPack={handleClearPack}
        />
      )}
      {screen === 'review' && (
        <ReviewScreen
          data={formData}
          onAddMore={() => {
            setScreen('items');
            setPickerOpen(true);
          }}
          onEditItems={() => setScreen('items')}
          onBack={() => setScreen('items')}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Product Picker Modal */}
      <ProductPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        supplierId={formData.supplier_id}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        editingItem={editingItem}
        onClearEdit={() => setEditingItem(null)}
        hasApprovedEstimate={hasApprovedEstimate}
        projectId={projectId}
        onLoadPack={handleLoadPack}
        onAddPSMItem={handleAddItem}
      />

      {/* Unmatched Item Editor */}
      {editingItem && !editingItem.catalog_item_id && (
        <UnmatchedItemEditor
          open={unmatchedEditorOpen}
          onOpenChange={(open) => {
            setUnmatchedEditorOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          onUpdate={handleUpdateItem}
          onRemove={handleRemoveItem}
        />
      )}
    </div>
  );

  // Use Sheet on mobile for better UX
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-2xl">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col h-[90vh] min-h-0 max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
