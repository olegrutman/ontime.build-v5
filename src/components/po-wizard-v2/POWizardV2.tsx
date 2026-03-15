import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X } from 'lucide-react';
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
import { ProductPickerContent, ProductPickerHandle } from './ProductPicker';
import { UnmatchedItemPanel } from './UnmatchedItemEditor';
import { StepIndicator } from './StepIndicator';

type Screen = 'header' | 'items' | 'review' | 'picker' | 'unmatched-editor';
type PickerInitialStep = 'source' | 'estimate' | undefined;

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
  workOrderId?: string;
  workOrderTitle?: string;
  onPOCreated?: (poId: string) => Promise<void>;
  editMode?: boolean;
  initialData?: Partial<POWizardV2Data>;
  hidePricing?: boolean;
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
  hidePricing = false,
}: POWizardV2Props) {
  const isMobile = useIsMobile();
  const pickerRef = useRef<ProductPickerHandle>(null);
  const [screen, setScreen] = useState<Screen>('header');
  const [pickerInitialStep, setPickerInitialStep] = useState<PickerInitialStep>(undefined);
  const [editingItem, setEditingItem] = useState<POWizardV2LineItem | null>(null);
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
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select('org_id')
          .eq('project_id', projectId)
          .eq('role', 'Supplier');

        if (teamError) throw teamError;

        const orgIds = (teamData || []).map(t => t.org_id);

        let projectSuppliers: ProjectSupplier[] = [];

        if (orgIds.length > 0) {
          const { data: supplierData, error: supplierError } = await supabase
            .from('suppliers')
            .select('id, name, supplier_code, organization_id')
            .in('organization_id', orgIds);

          if (supplierError) throw supplierError;

          projectSuppliers = (supplierData || []).map(s => ({
            id: s.id,
            name: s.name,
            supplier_code: s.supplier_code,
            organization_id: s.organization_id,
          }));
        }

        if (projectSuppliers.length === 0) {
          const { data: systemSupplier } = await supabase
            .from('suppliers')
            .select('id, name, supplier_code, organization_id')
            .eq('is_system', true)
            .limit(1)
            .maybeSingle();

          if (systemSupplier) {
            projectSuppliers = [{
              id: systemSupplier.id,
              name: systemSupplier.name,
              supplier_code: systemSupplier.supplier_code,
              organization_id: systemSupplier.organization_id,
            }];
          }
        }

        setSuppliers(projectSuppliers);

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
        setHasApprovedEstimate(false);
        setFormData({
          ...INITIAL_PO_WIZARD_V2_DATA,
          project_id: projectId,
          project_name: projectName,
          delivery_address: projectAddress,
          work_order_id: workOrderId,
          work_order_title: workOrderTitle,
        });
        // Auto-advance will be handled after suppliers load
        setScreen('header');
      }
    }
  }, [open, projectId, projectName, projectAddress, workOrderId, workOrderTitle, editMode, initialData]);

  // Auto-advance past header for single supplier (non-edit mode)
  useEffect(() => {
    if (!open || editMode || loadingSuppliers || screen !== 'header') return;
    if (suppliers.length === 1) {
      // Supplier already set in supplier fetch effect, skip to items/picker
      if (formData.line_items.length === 0) {
        setScreen('picker');
      } else {
        setScreen('items');
      }
    }
  }, [open, editMode, loadingSuppliers, suppliers.length]);

  // Check for approved estimate and resolve tax when supplier changes
  useEffect(() => {
    if (!open || !formData.supplier_id) {
      setHasApprovedEstimate(false);
      return;
    }
    checkApprovedEstimate(projectId, formData.supplier_id).then(setHasApprovedEstimate);

    // Resolve tax rate from most recent approved estimate for this supplier
    const resolveTax = async () => {
      try {
        // Get supplier org id
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('organization_id')
          .eq('id', formData.supplier_id!)
          .single();
        if (!supplierData?.organization_id) return;

        const { data: estData } = await supabase
          .from('supplier_estimates')
          .select('sales_tax_percent')
          .eq('project_id', projectId)
          .eq('supplier_org_id', supplierData.organization_id)
          .eq('status', 'APPROVED')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (estData?.sales_tax_percent != null) {
          setFormData(prev => ({ ...prev, sales_tax_percent: estData.sales_tax_percent ?? 0 }));
        }
      } catch (err) {
        console.warn('Failed to resolve tax rate:', err);
      }
    };
    resolveTax();
  }, [open, projectId, formData.supplier_id]);

  const handleChange = useCallback((updates: Partial<POWizardV2Data>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleAddItem = useCallback((item: POWizardV2LineItem) => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, item],
      pack_modified: prev.source_pack_name ? true : prev.pack_modified,
    }));
    setScreen('items');
    setEditingItem(null);
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
    setScreen('items');
    setEditingItem(null);
    toast.success('Item updated');
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
      pack_modified: prev.source_pack_name ? true : prev.pack_modified,
    }));
    setScreen('items');
    setEditingItem(null);
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
    setEditingItem(null);
    onOpenChange(false);
  };

  const canAdvanceFromHeader = !!formData.supplier_id;
  const canAdvanceFromItems = formData.line_items.length > 0;

  const handleAdvanceToItems = useCallback(() => {
    if (formData.line_items.length === 0) {
      setScreen('picker');
    } else {
      setScreen('items');
    }
  }, [formData.line_items.length]);

  const handleOpenPicker = useCallback(() => {
    setEditingItem(null);
    setPickerInitialStep(undefined);
    setScreen('picker');
  }, []);

  const handleExitPicker = useCallback(() => {
    setEditingItem(null);
    setScreen('items');
  }, []);

  const handleBack = useCallback(() => {
    switch (screen) {
      case 'header':
        handleClose();
        break;
      case 'items':
        setScreen('header');
        break;
      case 'review':
        setScreen('items');
        break;
      case 'picker':
        pickerRef.current?.goBack();
        break;
      case 'unmatched-editor':
        setEditingItem(null);
        setScreen('items');
        break;
    }
  }, [screen]);

  // Step indicator state
  const stepIndicatorSteps = useMemo(() => {
    const mainScreenIndex = screen === 'header' ? 0
      : (screen === 'items' || screen === 'picker' || screen === 'unmatched-editor') ? 1
      : 2;

    return [
      { label: 'Delivery', status: mainScreenIndex > 0 ? 'done' as const : 'active' as const },
      { label: 'Items', status: mainScreenIndex > 1 ? 'done' as const : mainScreenIndex === 1 ? 'active' as const : 'upcoming' as const },
      { label: 'Review', status: mainScreenIndex === 2 ? 'active' as const : 'upcoming' as const },
    ];
  }, [screen]);

  // Trail chips
  const trailChips = useMemo(() => {
    const chips: { label: string; filled: boolean }[] = [];
    if (formData.supplier_name) {
      chips.push({ label: formData.supplier_name, filled: true });
    }
    if (formData.source_pack_name) {
      chips.push({ label: formData.source_pack_name, filled: true });
    }
    if (formData.line_items.length > 0) {
      chips.push({ label: `${formData.line_items.length} items`, filled: screen !== 'header' });
    }
    return chips;
  }, [formData.supplier_name, formData.source_pack_name, formData.line_items.length, screen]);

  // Dynamic header title for picker/editor screens
  const getHeaderTitle = useCallback(() => {
    if (screen === 'picker' && pickerRef.current) {
      return pickerRef.current.getTitle();
    }
    if (screen === 'unmatched-editor') {
      return 'Edit Unmatched Item';
    }
    return null; // header/items/review have their own titles
  }, [screen]);

  const showInternalHeader = screen === 'picker' || screen === 'unmatched-editor';

  const content = (
    <div className="flex flex-col h-full">
      {/* Trail + Progress */}
      {trailChips.length > 0 && (
        <div className="wz-trail scrollbar-hide">
          {trailChips.map((chip, i) => (
            <span key={i} className={`wz-trail-chip ${chip.filled ? 'wz-trail-chip--filled' : 'wz-trail-chip--muted'}`}>
              {chip.label}
            </span>
          ))}
        </div>
      )}
      <div className="wz-progress">
        <div className="wz-progress-fill" style={{ width: progressWidth }} />
      </div>

      {/* Internal header for picker/editor screens */}
      {showInternalHeader && (
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold flex-1 truncate">{getHeaderTitle()}</h2>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setScreen('items')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Screen content with entry animation */}
      <div className="flex-1 min-h-0 overflow-y-auto wz-body" key={screen}>
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
            onAddItem={handleOpenPicker}
            onEditItem={(item) => {
              setEditingItem(item);
              if (!item.catalog_item_id) {
                setScreen('unmatched-editor');
              } else {
                setScreen('picker');
              }
            }}
            onRemoveItem={handleRemoveItem}
            onBack={() => {
              if (formData.source_pack_name) {
                handleClearPack();
                setPickerInitialStep('estimate');
                setScreen('picker');
              } else {
                setScreen('header');
              }
            }}
            onNext={() => setScreen('review')}
            canAdvance={canAdvanceFromItems}
            sourcePackName={formData.source_pack_name}
            onClearPack={handleClearPack}
            hidePricing={hidePricing}
          />
        )}
        {screen === 'review' && (
          <ReviewScreen
            data={formData}
            onAddMore={() => {
              setScreen('picker');
            }}
            onEditItems={() => setScreen('items')}
            onBack={() => setScreen('items')}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            hidePricing={hidePricing}
            onTaxChange={(tax) => setFormData(prev => ({ ...prev, sales_tax_percent: tax }))}
          />
        )}
        {screen === 'picker' && (
          <ProductPickerContent
            ref={pickerRef}
            supplierId={formData.supplier_id}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            editingItem={editingItem}
            onClearEdit={() => setEditingItem(null)}
            hasApprovedEstimate={hasApprovedEstimate}
            projectId={projectId}
            onLoadPack={handleLoadPack}
            onAddPSMItem={handleAddItem}
            hidePricing={hidePricing}
            onClose={handleClose}
            onExitPicker={handleExitPicker}
            initialStep={pickerInitialStep}
          />
        )}
        {screen === 'unmatched-editor' && editingItem && (
          <UnmatchedItemPanel
            item={editingItem}
            onUpdate={handleUpdateItem}
            onRemove={handleRemoveItem}
            onBack={() => {
              setEditingItem(null);
              setScreen('items');
            }}
          />
        )}
      </div>
    </div>
  );

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
