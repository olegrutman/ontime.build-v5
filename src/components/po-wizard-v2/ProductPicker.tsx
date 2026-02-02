import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  POWizardV2LineItem,
  CatalogProduct,
  CategoryCount,
  SecondaryCount,
  CATEGORY_DISPLAY,
  getFilterSequence,
  FIELD_LABELS,
} from '@/types/poWizardV2';
import { CategoryGrid } from './CategoryGrid';
import { SecondaryCategoryList } from './SecondaryCategoryList';
import { StepByStepFilter } from './StepByStepFilter';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';

type PickerStep = 'category' | 'secondary' | 'filter-step' | 'products' | 'quantity';

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  onAddItem: (item: POWizardV2LineItem) => void;
  editingItem: POWizardV2LineItem | null;
  onClearEdit: () => void;
}

export function ProductPicker({
  open,
  onOpenChange,
  supplierId,
  onAddItem,
  editingItem,
  onClearEdit,
}: ProductPickerProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<PickerStep>('category');
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setStep('category');
      setSelectedCategory(null);
      setSelectedSecondary(null);
      setAppliedFilters({});
      setProducts([]);
      setSelectedProduct(null);
      if (supplierId) {
        fetchCategories();
      }
    }
  }, [open, supplierId]);

  const fetchCategories = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('category')
        .eq('supplier_id', supplierId);

      if (error) throw error;

      // Count by category
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });

      const categoryList: CategoryCount[] = Object.entries(counts)
        .map(([category, count]) => ({
          category,
          count,
          displayName: CATEGORY_DISPLAY[category]?.name || category,
          icon: CATEGORY_DISPLAY[category]?.icon || '📦',
        }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);

      setCategories(categoryList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecondaryCategories = async (category: string) => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('secondary_category')
        .eq('supplier_id', supplierId)
        .eq('category', category as any)
        .not('secondary_category', 'is', null);

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

  const fetchProducts = async (categoryValue: string, secondary: string | null, specFilters: Record<string, string>) => {
    if (!supplierId) return;
    setLoading(true);
    try {
      // Build filter object for RPC or manual filtering
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: categoryValue,
      };
      
      if (secondary) {
        filterObj.secondary_category = secondary;
      }
      
      // Apply spec filters
      Object.entries(specFilters).forEach(([key, value]) => {
        if (value) {
          filterObj[key] = value;
        }
      });

      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .match(filterObj)
        .limit(100);

      if (error) throw error;

      setProducts((data || []) as CatalogProduct[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = useCallback(async (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    setAppliedFilters({});
    
    // Check for secondary categories
    const secondaries = await fetchSecondaryCategories(categoryValue);
    
    if (secondaries && secondaries.length > 1) {
      setStep('secondary');
    } else if (secondaries && secondaries.length === 1) {
      // Auto-select single secondary
      setSelectedSecondary(secondaries[0].secondary_category);
      // Check if we need filter steps
      const filterSeq = getFilterSequence(categoryValue, secondaries[0].secondary_category);
      if (filterSeq.length > 0) {
        setStep('filter-step');
      } else {
        // No filters needed - go directly to products
        fetchProducts(categoryValue, secondaries[0].secondary_category, {});
        setStep('products');
      }
    } else {
      // No secondary categories
      const filterSeq = getFilterSequence(categoryValue, null);
      if (filterSeq.length > 0) {
        setStep('filter-step');
      } else {
        fetchProducts(categoryValue, null, {});
        setStep('products');
      }
    }
  }, [supplierId]);

  const handleSecondarySelect = useCallback((secondary: string) => {
    setSelectedSecondary(secondary);
    setAppliedFilters({});
    
    // Check if we need filter steps
    const filterSeq = getFilterSequence(selectedCategory || '', secondary);
    if (filterSeq.length > 0) {
      setStep('filter-step');
    } else {
      // No filters needed - go directly to products
      if (selectedCategory) {
        fetchProducts(selectedCategory, secondary, {});
      }
      setStep('products');
    }
  }, [selectedCategory, supplierId]);

  const handleFilterComplete = useCallback((filters: Record<string, string>) => {
    setAppliedFilters(filters);
    if (selectedCategory) {
      fetchProducts(selectedCategory, selectedSecondary, filters);
    }
    setStep('products');
  }, [selectedCategory, selectedSecondary, supplierId]);

  const handleProductSelect = useCallback((product: CatalogProduct) => {
    setSelectedProduct(product);
    setStep('quantity');
  }, []);

  const handleFilterStepBack = useCallback(() => {
    if (secondaryCategories.length > 1) {
      setStep('secondary');
    } else {
      setStep('category');
      setSelectedCategory(null);
    }
    setSelectedSecondary(null);
    setAppliedFilters({});
  }, [secondaryCategories.length]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'secondary':
        setStep('category');
        setSelectedCategory(null);
        break;
      case 'filter-step':
        if (secondaryCategories.length > 1) {
          setStep('secondary');
        } else {
          setStep('category');
          setSelectedCategory(null);
        }
        setSelectedSecondary(null);
        setAppliedFilters({});
        break;
      case 'products':
        // Go back to filter-step if there are filters, otherwise to secondary/category
        const filterSeq = getFilterSequence(selectedCategory || '', selectedSecondary);
        if (filterSeq.length > 0) {
          setStep('filter-step');
        } else if (secondaryCategories.length > 1) {
          setStep('secondary');
        } else {
          setStep('category');
          setSelectedCategory(null);
        }
        break;
      case 'quantity':
        setStep('products');
        setSelectedProduct(null);
        break;
    }
  }, [step, secondaryCategories.length, selectedCategory, selectedSecondary]);

  const handleClose = () => {
    onClearEdit();
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (step) {
      case 'category':
        return 'Select Category';
      case 'secondary':
        return selectedCategory ? CATEGORY_DISPLAY[selectedCategory]?.name || selectedCategory : 'Select Type';
      case 'filter-step':
        return selectedSecondary || CATEGORY_DISPLAY[selectedCategory || '']?.name || 'Filter Products';
      case 'products':
        return 'Select Product';
      case 'quantity':
        return 'Add to PO';
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        {step !== 'category' && (
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold flex-1">{getTitle()}</h2>
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
        {step === 'filter-step' && (
          <StepByStepFilter
            supplierId={supplierId}
            category={selectedCategory}
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
            onClose={handleClose}
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
