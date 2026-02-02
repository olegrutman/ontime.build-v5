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

type Screen = 'header' | 'items' | 'review';

interface POWizardV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  projectAddress: string;
  onComplete: (data: POWizardV2Data) => Promise<void>;
  isSubmitting?: boolean;
}

export function POWizardV2({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectAddress,
  onComplete,
  isSubmitting = false,
}: POWizardV2Props) {
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState<Screen>('header');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<POWizardV2LineItem | null>(null);
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  
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
      setScreen('header');
      setFormData({
        ...INITIAL_PO_WIZARD_V2_DATA,
        project_id: projectId,
        project_name: projectName,
        delivery_address: projectAddress,
      });
    }
  }, [open, projectId, projectName, projectAddress]);

  const handleChange = useCallback((updates: Partial<POWizardV2Data>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleAddItem = useCallback((item: POWizardV2LineItem) => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, item],
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
    }));
    setPickerOpen(false);
    setEditingItem(null);
    toast.success('Item updated');
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== itemId),
    }));
    toast.success('Item removed');
  }, []);

  const handleSubmit = async () => {
    await onComplete(formData);
    onOpenChange(false);
  };

  const handleClose = () => {
    setScreen('header');
    onOpenChange(false);
  };

  const canAdvanceFromHeader = 
    !!formData.supplier_id && 
    !!formData.requested_delivery_date;

  const canAdvanceFromItems = formData.line_items.length > 0;

  const content = (
    <div className="flex flex-col h-full">
      {screen === 'header' && (
        <HeaderScreen
          data={formData}
          suppliers={suppliers}
          loadingSuppliers={loadingSuppliers}
          onChange={handleChange}
          onNext={() => setScreen('items')}
          canAdvance={canAdvanceFromHeader}
        />
      )}
      {screen === 'items' && (
        <ItemsScreen
          items={formData.line_items}
          onAddItem={() => setPickerOpen(true)}
          onEditItem={(item) => {
            setEditingItem(item);
            setPickerOpen(true);
          }}
          onRemoveItem={handleRemoveItem}
          onBack={() => setScreen('header')}
          onNext={() => setScreen('review')}
          canAdvance={canAdvanceFromItems}
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
      />
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
        {content}
      </DialogContent>
    </Dialog>
  );
}
