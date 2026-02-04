import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, X, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  POWizardV2LineItem,
  CatalogProduct,
  CategoryCount,
  SecondaryCount,
  VIRTUAL_CATEGORIES,
  VirtualCategory,
  getFilterSequence,
} from '@/types/poWizardV2';
import { CategoryGrid } from './CategoryGrid';
import { SecondaryCategoryList } from './SecondaryCategoryList';
import { StepByStepFilter } from './StepByStepFilter';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';

type PickerStep = 'category' | 'secondary' | 'filter-step' | 'products' | 'quantity';

interface RestrictToEstimate {
  projectId: string;
  estimateId: string;
  estimateName?: string;
}

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  onAddItem: (item: POWizardV2LineItem) => void;
  onUpdateItem?: (item: POWizardV2LineItem) => void;
  editingItem: POWizardV2LineItem | null;
  onClearEdit: () => void;
  // New: Restrict product selection to estimate-approved items
  restrictToEstimate?: RestrictToEstimate;
}

export function ProductPicker({
  open,
  onOpenChange,
  supplierId,
  onAddItem,
  onUpdateItem,
  editingItem,
  onClearEdit,
  restrictToEstimate,
}: ProductPickerProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<PickerStep>('category');
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCount[]>([]);
  const [selectedVirtualCategory, setSelectedVirtualCategory] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Restricted mode: allowed catalog item IDs from estimate
  const [allowedCatalogIds, setAllowedCatalogIds] = useState<Set<string> | null>(null);
  
  // Fetch allowed catalog IDs when in restricted mode
  useEffect(() => {
    if (!restrictToEstimate) {
      setAllowedCatalogIds(null);
      return;
    }
    
    const fetchAllowedIds = async () => {
      const { data, error } = await supabase
        .from('estimate_catalog_mapping')
        .select('catalog_item_id')
        .eq('estimate_id', restrictToEstimate.estimateId)
        .eq('project_id', restrictToEstimate.projectId);
      
      if (error) {
        console.error('Error fetching allowed catalog items:', error);
        setAllowedCatalogIds(new Set());
      } else {
        setAllowedCatalogIds(new Set(data?.map(d => d.catalog_item_id) || []));
      }
    };
    
    fetchAllowedIds();
  }, [restrictToEstimate]);

  // Get the actual DB category for queries
  const getDbCategory = useCallback(() => {
    if (!selectedVirtualCategory) return null;
    return VIRTUAL_CATEGORIES[selectedVirtualCategory]?.dbCategory || null;
  }, [selectedVirtualCategory]);

  // Handle editing - load the product and go to quantity screen
  useEffect(() => {
    if (open && editingItem && supplierId) {
      // Fetch the product for the editing item
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
    } else if (open && !editingItem) {
      // Normal open - reset state
      setStep(restrictToEstimate ? 'products' : 'category');
      setSelectedVirtualCategory(null);
      setSelectedSecondary(null);
      setAppliedFilters({});
      setProducts([]);
      setSelectedProduct(null);
      
      if (restrictToEstimate) {
        // In restricted mode, fetch all estimate products directly
        fetchEstimateProducts();
      } else if (supplierId) {
        fetchCategories();
      }
    }
  }, [open, supplierId, editingItem, restrictToEstimate]);

  // Fetch products restricted to estimate catalog mapping
  const fetchEstimateProducts = async () => {
    if (!restrictToEstimate) return;
    
    setLoading(true);
    try {
      // First get allowed catalog item IDs
      const { data: mappings, error: mappingError } = await supabase
        .from('estimate_catalog_mapping')
        .select('catalog_item_id')
        .eq('estimate_id', restrictToEstimate.estimateId)
        .eq('project_id', restrictToEstimate.projectId);
      
      if (mappingError) throw mappingError;
      
      if (!mappings || mappings.length === 0) {
        setProducts([]);
        return;
      }
      
      const catalogIds = mappings.map(m => m.catalog_item_id);
      
      // Fetch all catalog items that are in the estimate
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .in('id', catalogIds);
      
      if (error) throw error;
      
      setProducts((data || []) as CatalogProduct[]);
    } catch (error) {
      console.error('Error fetching estimate products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      // Fetch all items with category and secondary_category
      const { data, error } = await supabase
        .from('catalog_items')
        .select('category, secondary_category')
        .eq('supplier_id', supplierId);

      if (error) throw error;

      // Count by secondary_category and category
      const secondaryCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      
      data?.forEach(item => {
        const sec = item.secondary_category || 'UNCATEGORIZED';
        const cat = item.category;
        secondaryCounts[sec] = (secondaryCounts[sec] || 0) + 1;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      // Build virtual category counts
      const virtualCounts: CategoryCount[] = [];
      
      Object.entries(VIRTUAL_CATEGORIES).forEach(([key, virtual]) => {
        let count = 0;
        
        if (virtual.secondaryCategories.length === 0) {
          // Include all from that DB category
          count = categoryCounts[virtual.dbCategory] || 0;
        } else {
          // Sum counts from specified secondary categories
          virtual.secondaryCategories.forEach(sec => {
            count += secondaryCounts[sec] || 0;
          });
        }
        
        if (count > 0) {
          virtualCounts.push({
            category: key, // Virtual key
            count,
            displayName: virtual.displayName,
            icon: virtual.icon,
          });
        }
      });

      // Sort by count descending
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

      // If virtual category has specific secondaries, filter to those
      if (virtual.secondaryCategories.length > 0) {
        query = query.in('secondary_category', virtual.secondaryCategories);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Count by secondary category
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
      // Build filter object for .match()
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: virtual.dbCategory,
      };

      // Filter by secondary category if selected
      if (secondary) {
        filterObj.secondary_category = secondary;
      }

      // Apply spec filters
      Object.entries(specFilters).forEach(([key, value]) => {
        if (value) {
          filterObj[key] = value;
        }
      });

      let query = supabase
        .from('catalog_items')
        .select('*')
        .match(filterObj);

      // If no secondary selected but virtual has specific ones, filter to those
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

  const handleCategorySelect = useCallback(async (virtualKey: string) => {
    setSelectedVirtualCategory(virtualKey);
    setAppliedFilters({});
    
    const virtual = VIRTUAL_CATEGORIES[virtualKey];
    if (!virtual) return;
    
    // Fetch secondary categories for this virtual category
    const secondaries = await fetchSecondaryCategories(virtualKey);
    
    if (secondaries && secondaries.length > 1) {
      // Multiple sub-categories - show selection
      setStep('secondary');
    } else if (secondaries && secondaries.length === 1) {
      // Auto-select single secondary
      const secondary = secondaries[0].secondary_category;
      setSelectedSecondary(secondary);
      
      // Check if we need filter steps
      const filterSeq = getFilterSequence(virtual.dbCategory, secondary);
      if (filterSeq.length > 0) {
        setStep('filter-step');
      } else {
        // No filters needed - go directly to products
        fetchProducts(virtualKey, secondary, {});
        setStep('products');
      }
    } else {
      // No secondary categories (or empty array for "all of category")
      const filterSeq = getFilterSequence(virtual.dbCategory, null);
      if (filterSeq.length > 0) {
        setStep('filter-step');
      } else {
        fetchProducts(virtualKey, null, {});
        setStep('products');
      }
    }
  }, [supplierId]);

  const handleSecondarySelect = useCallback((secondary: string) => {
    setSelectedSecondary(secondary);
    setAppliedFilters({});
    
    const virtual = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory] : null;
    if (!virtual) return;
    
    // Check if we need filter steps
    const filterSeq = getFilterSequence(virtual.dbCategory, secondary);
    if (filterSeq.length > 0) {
      setStep('filter-step');
    } else {
      // No filters needed - go directly to products
      if (selectedVirtualCategory) {
        fetchProducts(selectedVirtualCategory, secondary, {});
      }
      setStep('products');
    }
  }, [selectedVirtualCategory, supplierId]);

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
    const virtual = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory] : null;
    
    switch (step) {
      case 'secondary':
        setStep('category');
        setSelectedVirtualCategory(null);
        break;
      case 'filter-step':
        if (secondaryCategories.length > 1) {
          setStep('secondary');
        } else {
          setStep('category');
          setSelectedVirtualCategory(null);
        }
        setSelectedSecondary(null);
        setAppliedFilters({});
        break;
      case 'products':
        // Go back to filter-step if there are filters, otherwise to secondary/category
        const filterSeq = getFilterSequence(virtual?.dbCategory || '', selectedSecondary);
        if (filterSeq.length > 0) {
          setStep('filter-step');
        } else if (secondaryCategories.length > 1) {
          setStep('secondary');
        } else {
          setStep('category');
          setSelectedVirtualCategory(null);
        }
        break;
      case 'quantity':
        setStep('products');
        setSelectedProduct(null);
        break;
    }
  }, [step, secondaryCategories.length, selectedVirtualCategory, selectedSecondary]);

  const handleClose = () => {
    onClearEdit();
    onOpenChange(false);
  };

  const getTitle = () => {
  const getTitle = () => {
    // In restricted mode, show a different title
    if (restrictToEstimate) {
      if (step === 'products') return 'Select from Estimate';
      if (step === 'quantity') return 'Add to PO';
      return 'Select Product';
    }
    
    const virtual = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory] : null;
    
    switch (step) {
      case 'category':
        return 'Select Category';
      case 'secondary':
        return virtual?.displayName || 'Select Type';
      case 'filter-step':
        return selectedSecondary || virtual?.displayName || 'Filter Products';
      case 'products':
        return 'Select Product';
      case 'quantity':
        return 'Add to PO';
    }
  };

  // Get db category for StepByStepFilter
  const dbCategory = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory]?.dbCategory : null;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        {step !== 'category' && !restrictToEstimate && (
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {restrictToEstimate && step === 'quantity' && (
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setStep('products')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{getTitle()}</h2>
          {restrictToEstimate && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Estimate-approved products only</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'category' && (
          <CategoryGrid
            categories={categories}
            loading={loading}
            onSelect={handleCategorySelect}
          />
        )}
        {step === 'secondary' && (
          <SecondaryCategoryList
            categories={secondaryCategories}
            loading={loading}
            onSelect={handleSecondarySelect}
          />
        )}
        {step === 'filter-step' && dbCategory && (
          <StepByStepFilter
            supplierId={supplierId}
            category={dbCategory}
            secondaryCategory={selectedSecondary}
            onComplete={handleFilterComplete}
            onBack={handleFilterStepBack}
            onClose={handleClose}
          />
        )}
        {step === 'products' && (
          <ProductList
            products={products}
            loading={loading}
            onSelect={handleProductSelect}
          />
        )}
        {step === 'quantity' && selectedProduct && (
          <QuantityPanel
            product={selectedProduct}
            onAdd={onAddItem}
            onUpdate={onUpdateItem}
            onClose={handleClose}
            editingItem={editingItem}
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh]">
        {content}
      </DialogContent>
    </Dialog>
  );
}
