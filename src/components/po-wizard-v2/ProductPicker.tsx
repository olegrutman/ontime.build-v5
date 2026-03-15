import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Package, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  POWizardV2LineItem,
  CatalogProduct,
  CategoryCount,
  SecondaryCount,
  VIRTUAL_CATEGORIES,
} from '@/types/poWizardV2';
import { CategoryGrid } from './CategoryGrid';
import { SecondaryCategoryList } from './SecondaryCategoryList';
import { StepByStepFilter, StepByStepFilterHandle } from './StepByStepFilter';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';
import { EstimateSubTabs } from './EstimateSubTabs';

export type PickerStep = 'source' | 'estimate' | 'category' | 'secondary' | 'filter-step' | 'products' | 'quantity';

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

interface EstimatePack {
  name: string;
  items: EstimatePackItem[];
}

export interface ProductPickerHandle {
  goBack: () => void;
  getStep: () => PickerStep;
  getTitle: () => string;
  showBackButton: () => boolean;
}

interface ProductPickerContentProps {
  supplierId: string | null;
  onAddItem: (item: POWizardV2LineItem) => void;
  onUpdateItem?: (item: POWizardV2LineItem) => void;
  editingItem: POWizardV2LineItem | null;
  onClearEdit: () => void;
  hasApprovedEstimate?: boolean;
  projectId?: string;
  onLoadPack?: (items: POWizardV2LineItem[], estimateId: string, packName: string) => void;
  onAddPSMItem?: (item: POWizardV2LineItem) => void;
  hidePricing?: boolean;
  onClose: () => void;
  /** Called when picker wants to fully exit back to items screen */
  onExitPicker: () => void;
}

export const ProductPickerContent = forwardRef<ProductPickerHandle, ProductPickerContentProps>(({
  supplierId,
  onAddItem,
  onUpdateItem,
  editingItem,
  onClearEdit,
  hasApprovedEstimate = false,
  projectId,
  onLoadPack,
  onAddPSMItem,
  hidePricing = false,
  onClose,
  onExitPicker,
}, ref) => {
  const filterRef = useRef<StepByStepFilterHandle>(null);
  const [step, setStep] = useState<PickerStep>('source');
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCount[]>([]);
  const [selectedVirtualCategory, setSelectedVirtualCategory] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(false);

  const initialStep: PickerStep = hasApprovedEstimate ? 'source' : 'category';

  useEffect(() => {
    if (editingItem && supplierId) {
      const fetchEditingProduct = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('catalog_items')
            .select('*')
            .eq('id', editingItem.catalog_item_id)
            .single();
          if (error) throw error;
          if (data) {
            setSelectedProduct(data as CatalogProduct);
            setStep('quantity');
          }
        } catch (error) {
          console.error('Error fetching product for edit:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchEditingProduct();
    } else if (!editingItem) {
      if (step !== 'estimate') {
        setStep(initialStep);
        setSelectedVirtualCategory(null);
        setSelectedSecondary(null);
        setAppliedFilters({});
        setProducts([]);
        setSelectedProduct(null);
      }
      if (supplierId && !hasApprovedEstimate) {
        fetchCategories();
      }
    }
  }, [supplierId, editingItem, hasApprovedEstimate]);

  const fetchCategories = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('category, secondary_category')
        .eq('supplier_id', supplierId);
      if (error) throw error;

      const secondaryCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      data?.forEach(item => {
        const sec = item.secondary_category || 'UNCATEGORIZED';
        const cat = item.category;
        secondaryCounts[sec] = (secondaryCounts[sec] || 0) + 1;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const virtualCounts: CategoryCount[] = [];
      Object.entries(VIRTUAL_CATEGORIES).forEach(([key, virtual]) => {
        let count = 0;
        if (virtual.secondaryCategories.length === 0) {
          count = categoryCounts[virtual.dbCategory] || 0;
        } else {
          virtual.secondaryCategories.forEach(sec => {
            count += secondaryCounts[sec] || 0;
          });
        }
        if (count > 0) {
          virtualCounts.push({ category: key, count, displayName: virtual.displayName, icon: virtual.icon });
        }
      });

      virtualCounts.sort((a, b) => b.count - a.count);
      setCategories(virtualCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecondaryCategories = async (virtualKey: string) => {
    if (!supplierId) return [];
    const virtual = VIRTUAL_CATEGORIES[virtualKey];
    if (!virtual) return [];
    setLoading(true);
    try {
      let query = supabase
        .from('catalog_items')
        .select('secondary_category')
        .eq('supplier_id', supplierId)
        .eq('category', virtual.dbCategory as any)
        .not('secondary_category', 'is', null);
      if (virtual.secondaryCategories.length > 0) {
        query = query.in('secondary_category', virtual.secondaryCategories);
      }
      const { data, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.secondary_category) {
          counts[item.secondary_category] = (counts[item.secondary_category] || 0) + 1;
        }
      });

      const secondaryList: SecondaryCount[] = Object.entries(counts)
        .map(([secondary_category, count]) => ({ secondary_category, count }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);

      setSecondaryCategories(secondaryList);
      return secondaryList;
    } catch (error) {
      console.error('Error fetching secondary categories:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (virtualKey: string, secondary: string | null, specFilters: Record<string, string>) => {
    if (!supplierId) return;
    const virtual = VIRTUAL_CATEGORIES[virtualKey];
    if (!virtual) return;
    setLoading(true);
    try {
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: virtual.dbCategory,
      };
      if (secondary) filterObj.secondary_category = secondary;
      Object.entries(specFilters).forEach(([key, value]) => {
        if (value) filterObj[key] = value;
      });

      let query = supabase.from('catalog_items').select('*').match(filterObj);
      if (!secondary && virtual.secondaryCategories.length > 0) {
        query = query.in('secondary_category', virtual.secondaryCategories);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      setProducts((data || []) as CatalogProduct[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSelect = useCallback((source: 'estimate' | 'catalog') => {
    if (source === 'estimate') {
      setStep('estimate');
    } else {
      if (supplierId) fetchCategories();
      setStep('category');
    }
  }, [supplierId]);

  const handleCategorySelect = useCallback(async (virtualKey: string) => {
    setSelectedVirtualCategory(virtualKey);
    setAppliedFilters({});
    const virtual = VIRTUAL_CATEGORIES[virtualKey];
    if (!virtual) return;
    const secondaries = await fetchSecondaryCategories(virtualKey);
    if (secondaries && secondaries.length > 1) {
      setStep('secondary');
    } else if (secondaries && secondaries.length === 1) {
      setSelectedSecondary(secondaries[0].secondary_category);
      setStep('filter-step');
    } else {
      setStep('filter-step');
    }
  }, [supplierId]);

  const handleSecondarySelect = useCallback((secondary: string) => {
    setSelectedSecondary(secondary);
    setAppliedFilters({});
    setStep('filter-step');
  }, []);

  const handleFilterComplete = useCallback((filters: Record<string, string>) => {
    setAppliedFilters(filters);
    if (selectedVirtualCategory) {
      fetchProducts(selectedVirtualCategory, selectedSecondary, filters);
    }
    setStep('products');
  }, [selectedVirtualCategory, selectedSecondary, supplierId]);

  const handleProductSelect = useCallback((product: CatalogProduct) => {
    setSelectedProduct(product);
    setStep('quantity');
  }, []);

  const handleFilterStepBack = useCallback(() => {
    if (secondaryCategories.length > 1) {
      setStep('secondary');
    } else {
      setStep('category');
      setSelectedVirtualCategory(null);
    }
    setSelectedSecondary(null);
    setAppliedFilters({});
  }, [secondaryCategories.length]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'source':
        // At top of picker, exit back to items
        onExitPicker();
        break;
      case 'estimate':
      case 'category':
        if (hasApprovedEstimate) {
          setStep('source');
          setSelectedVirtualCategory(null);
        } else {
          // No source step, exit back to items
          onExitPicker();
        }
        break;
      case 'secondary':
        setStep('category');
        setSelectedVirtualCategory(null);
        break;
      case 'filter-step':
        filterRef.current?.goBack();
        return;
      case 'products':
        setStep('filter-step');
        break;
      case 'quantity':
        setStep('products');
        setSelectedProduct(null);
        break;
    }
  }, [step, hasApprovedEstimate, onExitPicker]);

  const handleSelectPack = useCallback((pack: EstimatePack, estimateId: string) => {
    if (!onLoadPack) return;
    const lineItems: POWizardV2LineItem[] = pack.items.map((item, idx) => ({
      id: `pack-${idx}-${Date.now()}`,
      catalog_item_id: item.catalog_item_id || '',
      supplier_sku: item.supplier_sku || '',
      name: item.description,
      specs: item.supplier_sku || '',
      quantity: item.quantity,
      unit_mode: 'EACH' as const,
      uom: item.uom,
      item_notes: item.catalog_item_id ? undefined : '⚠ Not in catalog',
      unit_price: item.unit_price,
      line_total: item.unit_price != null ? item.quantity * item.unit_price : null,
      source_estimate_item_id: item.id,
      source_pack_name: item.pack_name,
      price_source: item.unit_price != null ? 'FROM_ESTIMATE' as const : null,
      original_unit_price: item.unit_price,
    }));
    onLoadPack(lineItems, estimateId, pack.name);
    onExitPicker();
  }, [onLoadPack, onExitPicker]);

  const getTitle = useCallback(() => {
    const virtual = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory] : null;
    switch (step) {
      case 'source': return 'Add Materials';
      case 'estimate': return 'Project Estimate';
      case 'category': return 'Select Category';
      case 'secondary': return virtual?.displayName || 'Select Type';
      case 'filter-step': return selectedSecondary || virtual?.displayName || 'Filter Products';
      case 'products': return 'Select Product';
      case 'quantity': return 'Add to PO';
    }
  }, [step, selectedVirtualCategory, selectedSecondary]);

  const showBackButton = useCallback(() => {
    // Always show back button — handleBack will exit picker when at top
    return true;
  }, []);

  useImperativeHandle(ref, () => ({
    goBack: handleBack,
    getStep: () => step,
    getTitle,
    showBackButton,
  }), [handleBack, step, getTitle, showBackButton]);

  const dbCategory = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory]?.dbCategory : null;

  return (
    <>
      {step === 'source' && (
        <div className="p-4 space-y-2">
          <button
            className="wz-ans"
            onClick={() => handleSourceSelect('estimate')}
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">From Project Estimate</p>
              <p className="text-xs text-muted-foreground">Packs & matched materials</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            className="wz-ans"
            onClick={() => handleSourceSelect('catalog')}
          >
            <div className="p-2 rounded-lg bg-secondary">
              <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Browse Full Catalog</p>
              <p className="text-xs text-muted-foreground">All supplier products</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}
      {step === 'estimate' && projectId && (
        <div className="p-4">
          <EstimateSubTabs
            projectId={projectId}
            supplierId={supplierId}
            onSelectPack={handleSelectPack}
            onSwitchToCatalog={() => handleSourceSelect('catalog')}
            onAddPSMItem={onAddPSMItem || onAddItem}
          />
        </div>
      )}
      {step === 'category' && (
        <CategoryGrid categories={categories} loading={loading} onSelect={handleCategorySelect} />
      )}
      {step === 'secondary' && (
        <SecondaryCategoryList categories={secondaryCategories} loading={loading} onSelect={handleSecondarySelect} />
      )}
      {step === 'filter-step' && dbCategory && (
        <StepByStepFilter
          ref={filterRef}
          supplierId={supplierId}
          category={dbCategory}
          secondaryCategory={selectedSecondary}
          onComplete={handleFilterComplete}
          onBack={handleFilterStepBack}
          onClose={onClose}
        />
      )}
      {step === 'products' && (
        <ProductList products={products} loading={loading} onSelect={handleProductSelect} />
      )}
      {step === 'quantity' && selectedProduct && (
        <QuantityPanel
          product={selectedProduct}
          onAdd={onAddItem}
          onUpdate={onUpdateItem}
          onClose={onClose}
          editingItem={editingItem}
          hidePricing={hidePricing}
        />
      )}
    </>
  );
});

ProductPickerContent.displayName = 'ProductPickerContent';
