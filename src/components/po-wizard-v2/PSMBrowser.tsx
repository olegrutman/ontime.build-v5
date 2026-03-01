import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Plus, AlertTriangle, Package } from 'lucide-react';
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
import { StepByStepFilter } from './StepByStepFilter';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';
import { PSMUnmatchedList } from './PSMUnmatchedList';

const UNMATCHED_KEY = '__UNMATCHED__';

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  supplier_sku: string | null;
  catalog_item_id: string | null;
  pack_name: string | null;
  unit_price: number | null;
}

type PSMStep = 'category' | 'secondary' | 'filter-step' | 'products' | 'quantity' | 'unmatched-list';

interface PSMBrowserProps {
  projectId: string;
  supplierId: string | null;
  onAddItem: (item: POWizardV2LineItem) => void;
  onSwitchToCatalog: () => void;
}

export function PSMBrowser({
  projectId,
  supplierId,
  onAddItem,
  onSwitchToCatalog,
}: PSMBrowserProps) {
  const [step, setStep] = useState<PSMStep>('category');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCount[]>([]);
  const [selectedVirtualCategory, setSelectedVirtualCategory] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Estimate-scoped data
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [estimateCatalogIds, setEstimateCatalogIds] = useState<string[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<EstimateItem[]>([]);

  // Load estimate items and build categories on mount
  useEffect(() => {
    loadEstimateData();
  }, [projectId, supplierId]);

  const loadEstimateData = async () => {
    setLoading(true);
    try {
      // Resolve supplier org
      let supplierOrgId: string | null = null;
      if (supplierId) {
        const { data } = await supabase
          .from('suppliers')
          .select('organization_id')
          .eq('id', supplierId)
          .single();
        supplierOrgId = data?.organization_id ?? null;
      }

      // Find approved estimate
      let estQuery = supabase
        .from('supplier_estimates')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'APPROVED')
        .order('approved_at', { ascending: false })
        .limit(1);

      if (supplierOrgId) {
        estQuery = estQuery.eq('supplier_org_id', supplierOrgId);
      }

      const { data: estimates } = await estQuery;
      if (!estimates || estimates.length === 0) {
        setCategories([]);
        setLoading(false);
        return;
      }

      const estId = estimates[0].id;
      setEstimateId(estId);

      // Fetch all estimate items
      const { data: items } = await supabase
        .from('supplier_estimate_items')
        .select('id, description, quantity, uom, supplier_sku, catalog_item_id, pack_name, unit_price')
        .eq('estimate_id', estId);

      if (!items || items.length === 0) {
        setCategories([]);
        setLoading(false);
        return;
      }

      // Separate matched vs unmatched
      const matched: EstimateItem[] = [];
      const unmatched: EstimateItem[] = [];
      const catalogIds: string[] = [];

      for (const item of items) {
        if (item.catalog_item_id) {
          matched.push(item as EstimateItem);
          catalogIds.push(item.catalog_item_id);
        } else {
          unmatched.push(item as EstimateItem);
        }
      }

      setEstimateCatalogIds(catalogIds);
      setUnmatchedItems(unmatched);

      // Build categories from matched catalog items
      if (catalogIds.length > 0) {
        const { data: catalogData } = await supabase
          .from('catalog_items')
          .select('id, category, secondary_category')
          .in('id', catalogIds);

        if (catalogData) {
          // Count by secondary_category and category
          const secondaryCounts: Record<string, number> = {};
          const categoryCounts: Record<string, number> = {};

          catalogData.forEach(ci => {
            const sec = ci.secondary_category || 'UNCATEGORIZED';
            const cat = ci.category;
            secondaryCounts[sec] = (secondaryCounts[sec] || 0) + 1;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });

          // Build virtual category counts
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
              virtualCounts.push({
                category: key,
                count,
                displayName: virtual.displayName,
                icon: virtual.icon,
              });
            }
          });

          virtualCounts.sort((a, b) => b.count - a.count);

          // Add unmatched category if any
          if (unmatched.length > 0) {
            virtualCounts.push({
              category: UNMATCHED_KEY,
              count: unmatched.length,
              displayName: 'UNMATCHED ITEMS',
              icon: '⚠️',
            });
          }

          setCategories(virtualCounts);
        }
      } else if (unmatched.length > 0) {
        // Only unmatched items
        setCategories([{
          category: UNMATCHED_KEY,
          count: unmatched.length,
          displayName: 'UNMATCHED ITEMS',
          icon: '⚠️',
        }]);
      }
    } catch (error) {
      console.error('Error loading PSM data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch secondary categories scoped to estimate catalog items
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
        .in('id', estimateCatalogIds)
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
      console.error('Error fetching PSM secondary categories:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch products scoped to estimate catalog items
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

      if (secondary) {
        filterObj.secondary_category = secondary;
      }

      Object.entries(specFilters).forEach(([key, value]) => {
        if (value) filterObj[key] = value;
      });

      let query = supabase
        .from('catalog_items')
        .select('*')
        .match(filterObj)
        .in('id', estimateCatalogIds);

      if (!secondary && virtual.secondaryCategories.length > 0) {
        query = query.in('secondary_category', virtual.secondaryCategories);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      setProducts((data || []) as CatalogProduct[]);
    } catch (error) {
      console.error('Error fetching PSM products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = useCallback(async (virtualKey: string) => {
    if (virtualKey === UNMATCHED_KEY) {
      setStep('unmatched-list');
      return;
    }

    setSelectedVirtualCategory(virtualKey);
    setAppliedFilters({});

    const secondaries = await fetchSecondaryCategories(virtualKey);

    if (secondaries && secondaries.length > 1) {
      setStep('secondary');
    } else if (secondaries && secondaries.length === 1) {
      setSelectedSecondary(secondaries[0].secondary_category);
      setStep('filter-step');
    } else {
      setStep('filter-step');
    }
  }, [supplierId, estimateCatalogIds]);

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
  }, [selectedVirtualCategory, selectedSecondary, supplierId, estimateCatalogIds]);

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
        setStep('filter-step');
        break;
      case 'quantity':
        setStep('products');
        setSelectedProduct(null);
        break;
      case 'unmatched-list':
        setStep('category');
        break;
    }
  }, [step, secondaryCategories.length]);

  const handleAddPSMItem = useCallback((item: POWizardV2LineItem) => {
    onAddItem(item);
    // Go back to category after adding
    setStep('category');
    setSelectedProduct(null);
    setSelectedVirtualCategory(null);
    setSelectedSecondary(null);
    setAppliedFilters({});
  }, [onAddItem]);

  const handleAddUnmatchedItem = useCallback((estimateItem: EstimateItem, quantity: number) => {
    const unitPrice = estimateItem.unit_price;
    const lineItem: POWizardV2LineItem = {
      id: `psm-unmatched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      catalog_item_id: '',
      supplier_sku: estimateItem.supplier_sku || '',
      name: estimateItem.description,
      specs: estimateItem.supplier_sku || '',
      quantity,
      unit_mode: 'EACH',
      uom: estimateItem.uom,
      item_notes: '⚠ Not in catalog',
      unit_price: unitPrice,
      line_total: unitPrice != null ? quantity * unitPrice : null,
      source_estimate_item_id: estimateItem.id,
      source_pack_name: estimateItem.pack_name,
      price_source: unitPrice != null ? 'FROM_ESTIMATE' : null,
      original_unit_price: unitPrice,
    };
    onAddItem(lineItem);
  }, [onAddItem]);

  const handleCloseNoop = useCallback(() => {
    // No-op close for StepByStepFilter — we manage navigation via handleBack
  }, []);

  const dbCategory = selectedVirtualCategory ? VIRTUAL_CATEGORIES[selectedVirtualCategory]?.dbCategory : null;

  // Show back button for drill-down steps
  const showBack = step !== 'category';

  if (loading && step === 'category') {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (categories.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <div className="p-3 rounded-full bg-muted mb-3">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No estimate materials found</h3>
        <p className="text-xs text-muted-foreground mb-4">
          There are no items in the approved estimate for this project.
        </p>
        <Button variant="outline" size="sm" onClick={onSwitchToCatalog}>
          <Plus className="h-4 w-4 mr-1" />
          Order from Full Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Back button for drill-down */}
      {showBack && (
        <div className="px-1 pb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      )}

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
          onClose={handleCloseNoop}
          estimateCatalogIds={estimateCatalogIds}
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
          onAdd={handleAddPSMItem}
          onClose={() => setStep('products')}
        />
      )}

      {step === 'unmatched-list' && (
        <PSMUnmatchedList
          items={unmatchedItems}
          onAddItem={handleAddUnmatchedItem}
        />
      )}
    </div>
  );
}
