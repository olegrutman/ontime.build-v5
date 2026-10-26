/**
 * SmartPicker.tsx
 *
 * Drop-in replacement for po-wizard-v2/ProductPicker.tsx.
 *
 * Same public contract (onAddItem / onUpdateItem / onLoadPack / onExitPicker,
 * emits POWizardV2LineItem), new internals:
 *
 *   - Persistent search bar at the top (search_catalog_v3 RPC)
 *   - Recent items strip on the landing screen
 *   - Category-aware routing via CATEGORY_FUNNELS
 *   - Merged source+category screen (eliminates a tap when no estimate exists)
 *   - Exact-SKU short-circuit: matches a known SKU -> jump to quantity
 */

import {
  useState, useEffect, useCallback, useRef,
  useImperativeHandle, forwardRef, useMemo,
} from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, Package, Clock, ChevronRight, Wrench, Layers, House, Ruler, Columns3, PanelsTopLeft, ClipboardList, CirclePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { POWizardV2LineItem, CatalogProduct, SecondaryCount } from '@/types/poWizardV2';
import { CATEGORY_FUNNELS } from '@/lib/categoryFunnels';
import { isExactHardwareModel } from '@/lib/hardwareFunnel';
import { HardwarePicker, type HardwarePickerHandle } from './HardwarePicker';
import { StepByStepFilter, type StepByStepFilterHandle } from './StepByStepFilter';
import { SecondaryCategoryList } from './SecondaryCategoryList';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';
import { EstimateSubTabs } from './EstimateSubTabs';
import { SelectionRail, WorkspaceProducts, SpecificationChips } from './GuidedWorkspace';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PickerStep =
  | 'landing'      // search bar + recent items + category grid + "From Estimate" tab
  | 'estimate'     // estimate picker
  | 'funnel'       // StepByStepFilter for 'structured' categories
  | 'secondary'    // Secondary list for 'hybrid' first step
  | 'hardware'     // Guided family / application / size / model
  | 'products'     // Terminal product list
  | 'quantity';    // QuantityPanel

interface RecentItem {
  id: string;
  supplier_sku: string;
  name: string | null;
  description: string;
  category: string;
  secondary_category: string | null;
  dimension: string | null;
  length: string | null;
  uom_default: string;
  times_ordered: number;
}

interface CategoryFacet {
  category: string;
  n: number;
}

interface SecondaryFacet {
  category: string;
  secondary_category: string;
  n: number;
}

export interface SmartPickerHandle {
  goBack: () => void;
  getStep: () => PickerStep;
  getTitle: () => string;
  showBackButton: () => boolean;
}

interface SmartPickerProps {
  supplierId: string | null;
  projectId?: string;
  editingItem: POWizardV2LineItem | null;
  hasApprovedEstimate?: boolean;
  hidePricing?: boolean;
  onAddItem: (item: POWizardV2LineItem) => void;
  onUpdateItem?: (item: POWizardV2LineItem) => void;
  onLoadPack?: (items: POWizardV2LineItem[], estimateId: string, packName: string) => void;
  onAddPSMItem?: (item: POWizardV2LineItem) => void;
  onClearEdit: () => void;
  onClose: () => void;
  onExitPicker: () => void;
  /** Optional initial step (e.g. 'estimate' to open straight on packs) */
  initialStep?: 'source' | 'estimate' | 'landing';
  /**
   * Notifies the parent of the current internal step + computed header title.
   * Use this to keep an outer header in sync (Bug 2 fix).
   */
  onStateChange?: (step: PickerStep, title: string) => void;
  libraryMode?: boolean;
  workspaceMode?: boolean;
  supplierControl?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SmartPicker = forwardRef<SmartPickerHandle, SmartPickerProps>(function SmartPicker(
  {
    supplierId, projectId, editingItem, hasApprovedEstimate = false, hidePricing = false,
    onAddItem, onUpdateItem, onLoadPack, onAddPSMItem, onClearEdit, onClose, onExitPicker,
    initialStep, onStateChange, libraryMode = false, workspaceMode = false, supplierControl,
  },
  ref,
) {
  const filterRef = useRef<StepByStepFilterHandle>(null);
  const hardwareRef = useRef<HardwarePickerHandle>(null);

  // Map legacy 'source' alias → 'landing'
  const resolvedInitialStep: PickerStep =
    initialStep === 'estimate' ? 'estimate' : 'landing';

  // Navigation state
  const [step, setStep] = useState<PickerStep>(resolvedInitialStep);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [workspaceFilters, setWorkspaceFilters] = useState<Record<string, string>>({});
  const [workspaceField, setWorkspaceField] = useState<string | undefined>();
  const styledPicker = libraryMode || workspaceMode;
  const trackSelections = useCallback((filters: Record<string, string>, field?: string) => {
    setWorkspaceFilters(filters);
    setWorkspaceField(field);
  }, []);

  // Landing-screen data
  const [facets, setFacets] = useState<CategoryFacet[]>([]);
  const [secondaries, setSecondaries] = useState<SecondaryFacet[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [landingLoading, setLandingLoading] = useState(false);

  // Search state (lives at the shell so it's available everywhere)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchActive = searchQuery.trim().length >= 2;

  // Terminal product list state
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Edit-mode: skip straight to quantity
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!editingItem || !supplierId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('id', editingItem.catalog_item_id)
        .single();
      if (cancelled || !data) return;
      setSelectedProduct(data as unknown as CatalogProduct);
      setStep('quantity');
    })();
    return () => { cancelled = true; };
  }, [editingItem, supplierId]);

  // -------------------------------------------------------------------------
  // Landing screen: fetch facets + recent items independently (Promise.allSettled
  // so a slow/failed facets call doesn't kill the recent strip — Bug 7).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!supplierId || editingItem || step !== 'landing') return;
    setLandingLoading(true);
    Promise.allSettled([
      supabase.rpc('catalog_facets', { p_supplier_id: supplierId }),
      supabase.rpc('recent_catalog_items', {
        p_supplier_id: supplierId,
        p_project_id: projectId ?? null,
        p_days: 90,
        p_limit: 12,
      }),
    ])
      .then(([facetsRes, recentRes]) => {
        if (facetsRes.status === 'fulfilled') {
          const fdata = facetsRes.value.data as
            | { categories?: CategoryFacet[]; secondaries?: SecondaryFacet[] }
            | null;
          if (fdata?.categories) setFacets(fdata.categories);
          if (fdata?.secondaries) setSecondaries(fdata.secondaries);
        } else {
          console.error('catalog_facets failed:', facetsRes.reason);
        }
        if (recentRes.status === 'fulfilled') {
          if (recentRes.value.data) setRecent(recentRes.value.data as RecentItem[]);
        } else {
          console.error('recent_catalog_items failed:', recentRes.reason);
        }
      })
      .finally(() => setLandingLoading(false));
  }, [supplierId, projectId, editingItem, step]);

  // -------------------------------------------------------------------------
  // Global search: debounced, scoped to current category context (Bug 4).
  // No mid-typing short-circuit (Bug 3) — exact-match jump only fires on Enter.
  // -------------------------------------------------------------------------
  const dbCategoryForSearch =
    selectedCategoryKey ? CATEGORY_FUNNELS[selectedCategoryKey]?.dbCategory ?? null : null;
  const secondaryForSearch =
    step === 'funnel' || step === 'secondary' || step === 'products'
      ? selectedSecondary
      : null;

  useEffect(() => {
    if (!searchActive || !supplierId) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.rpc('search_catalog_v3', {
          p_query: searchQuery,
          p_supplier_id: supplierId,
          p_category: (step === 'funnel' || step === 'secondary' || step === 'products' || step === 'hardware')
            ? dbCategoryForSearch
            : null,
          p_secondary: secondaryForSearch,
          p_limit: 50,
        });
        const results = (data ?? []) as unknown as (CatalogProduct & { score: number })[];
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, searchActive, supplierId, step, dbCategoryForSearch, secondaryForSearch]);

  // Pressing Enter on a single exact-SKU match jumps to quantity.
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const top = searchResults[0] as (CatalogProduct & { score?: number }) | undefined;
    const exactModels = searchResults.filter(p => isExactHardwareModel(p, searchQuery));
    const exact = top && (top as any).score >= 1000 ? top : exactModels.length === 1 ? exactModels[0] : undefined;
    if (exact) {
      setSelectedProduct(exact);
      setSearchQuery('');
      setStep('quantity');
    }
  }, [searchResults, searchQuery]);

  // -------------------------------------------------------------------------
  // Helper: hydrate a partial recent-item row into a full CatalogProduct
  // before opening the QuantityPanel (Bug 1: bundle_type/qty must be present).
  // -------------------------------------------------------------------------
  const openQuantityForId = useCallback(async (catalogItemId: string) => {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('id', catalogItemId)
      .single();
    if (error || !data) {
      console.error('Failed to hydrate catalog item:', error);
      return;
    }
    setSelectedProduct(data as unknown as CatalogProduct);
    setStep('quantity');
  }, []);

  // -------------------------------------------------------------------------
  // Navigation handlers
  // -------------------------------------------------------------------------
  const enterCategory = useCallback(async (categoryKey: string) => {
    const config = CATEGORY_FUNNELS[categoryKey];
    if (!config || !supplierId) return;
    setSelectedCategoryKey(categoryKey);
    setSelectedSecondary(null);
    setSelectedProduct(null);
    setWorkspaceFilters({});
    setWorkspaceField(undefined);

    if (categoryKey === 'HARDWARE') {
      setStep('hardware');
    } else if (config.pattern === 'search') {
      // Open terminal list of all items in category, search will refine.
      setProductsLoading(true);
      const { data } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('category', config.dbCategory as never)
        .eq('is_active', true)
        .order('name', { nullsFirst: false })
        .limit(200);
      setProducts((data ?? []) as unknown as CatalogProduct[]);
      setProductsLoading(false);
      setStep('products');
    } else if (config.pattern === 'hybrid') {
      setStep('secondary');
    } else {
      setStep('funnel');
    }
  }, [supplierId]);

  const handleSecondary = useCallback((secondary: string) => {
    setSelectedSecondary(secondary);
    setStep('funnel');
  }, []);

  const handleFunnelComplete = useCallback(async (filters: Record<string, string>) => {
    if (!supplierId || !selectedCategoryKey) return;
    const config = CATEGORY_FUNNELS[selectedCategoryKey];
    if (!config) return;
    setWorkspaceFilters(filters);
    setWorkspaceField(undefined);
    setProductsLoading(true);
    let q = supabase
      .from('catalog_items')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('category', config.dbCategory as never)
      .eq('is_active', true);
    if (selectedSecondary) q = q.eq('secondary_category', selectedSecondary);
    Object.entries(filters).forEach(([k, v]) => { if (v) q = q.eq(k as never, v as never); });
    const { data } = await q.limit(100);
    setProducts((data ?? []) as unknown as CatalogProduct[]);
    setProductsLoading(false);
    setStep('products');
  }, [supplierId, selectedCategoryKey, selectedSecondary]);

  const handleProductSelect = useCallback((p: CatalogProduct) => {
    setSelectedProduct(p);
    setSearchQuery(''); // leave search mode so the quantity step can render
    setStep('quantity');
  }, []);

  // Reset to landing and clear category/secondary state (Bug 5).
  const goToLanding = useCallback(() => {
    setStep('landing');
    setSelectedCategoryKey(null);
    setSelectedSecondary(null);
    setProducts([]);
    setSelectedProduct(null);
    setWorkspaceFilters({});
    setWorkspaceField(undefined);
  }, []);

  const handleBack = useCallback(() => {
    // If search is active, clear it first rather than navigating.
    if (searchActive) { setSearchQuery(''); return; }
    switch (step) {
      case 'landing':
        onExitPicker(); break;
      case 'estimate':
        setStep('landing'); break;
      case 'secondary':
        goToLanding(); break;
      case 'hardware':
        hardwareRef.current?.goBack(); break;
      case 'funnel':
        // Let StepByStepFilter handle internal step-back; if it's at step 0
        // it will call onBack which we wired to land/secondary.
        filterRef.current?.goBack(); break;
      case 'products':
        if (selectedSecondary) {
          setStep('funnel');
          setProducts([]);
          // The filter stayed mounted with its state; step back once so the
          // user lands on their last real choice, skipping auto-applied steps.
          setTimeout(() => filterRef.current?.goBack(), 0);
        } else if (selectedCategoryKey && CATEGORY_FUNNELS[selectedCategoryKey]?.pattern === 'search') {
          goToLanding();
        } else {
          setStep('funnel');
          setProducts([]);
          setTimeout(() => filterRef.current?.goBack(), 0);
        }
        break;
      case 'quantity':
        if (editingItem) { onClearEdit(); onExitPicker(); return; }
        setStep(selectedCategoryKey === 'HARDWARE' ? 'hardware' : 'products'); setSelectedProduct(null); break;
    }
  }, [searchActive, step, selectedSecondary, selectedCategoryKey, editingItem, onExitPicker, onClearEdit, goToLanding]);

  const getTitle = useCallback(() => {
    if (searchActive) return `Search "${searchQuery}"`;
    const config = selectedCategoryKey ? CATEGORY_FUNNELS[selectedCategoryKey] : null;
    switch (step) {
      case 'landing':  return 'Add Materials';
      case 'estimate': return 'From Estimate';
      case 'secondary':return config?.displayName ?? 'Select Type';
      case 'funnel':   return selectedSecondary ?? config?.displayName ?? 'Filter';
      case 'hardware': return 'Select Hardware';
      case 'products': return selectedSecondary ?? config?.displayName ?? 'Products';
      case 'quantity': return editingItem ? 'Edit Item' : 'Add to PO';
    }
  }, [step, searchActive, searchQuery, selectedCategoryKey, selectedSecondary, editingItem]);

  // Notify parent of step/title changes so the outer header re-renders (Bug 2).
  useEffect(() => {
    onStateChange?.(step, getTitle());
  }, [step, getTitle, onStateChange]);

  useImperativeHandle(ref, () => ({
    goBack: handleBack,
    getStep: () => step,
    getTitle,
    showBackButton: () => true,
  }), [handleBack, step, getTitle]);

  // -------------------------------------------------------------------------
  // Derived: category cards sorted by item count (only categories that
  // exist for this supplier AND are configured in CATEGORY_FUNNELS).
  // -------------------------------------------------------------------------
  const categoryCards = useMemo(() => {
    const byDb = new Map(facets.map(f => [f.category, f.n]));
    return Object.entries(CATEGORY_FUNNELS)
      .map(([key, cfg]) => ({ key, cfg, count: byDb.get(cfg.dbCategory) ?? 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [facets]);

  // Secondary categories for the currently-selected hybrid category.
  const secondaryList: SecondaryCount[] = useMemo(() => {
    if (!selectedCategoryKey) return [];
    const dbCat = CATEGORY_FUNNELS[selectedCategoryKey]?.dbCategory;
    if (!dbCat) return [];
    return secondaries
      .filter(s => s.category === dbCat)
      .map(s => ({ secondary_category: s.secondary_category, count: s.n }));
  }, [secondaries, selectedCategoryKey]);

  const dbCategory = selectedCategoryKey ? CATEGORY_FUNNELS[selectedCategoryKey]?.dbCategory : null;
  const funnelFields = selectedCategoryKey
    ? CATEGORY_FUNNELS[selectedCategoryKey]?.funnelFields
    : undefined;

  // Recent items: hydrate full row before opening QuantityPanel (Bug 1).
  const handleRecentSelect = useCallback((item: RecentItem) => {
    void openQuantityForId(item.id);
  }, [openQuantityForId]);

  const showSearchBar = workspaceMode || step !== 'quantity';
  const showWorkspace = workspaceMode && !searchActive && !['landing', 'estimate'].includes(step);
  const showWorkspaceProducts = showWorkspace && selectedCategoryKey !== 'HARDWARE' && (step === 'products' || step === 'quantity');
  const displayFilters = step === 'quantity' && selectedProduct && Object.keys(workspaceFilters).length === 0
    ? Object.fromEntries(['secondary_category', 'dimension', 'length', 'wood_species'].flatMap(field => {
        const value = selectedProduct[field as keyof CatalogProduct];
        return typeof value === 'string' && value ? [[field, value]] : [];
      })) : workspaceFilters;
  const editWorkspaceField = (field: string) => {
    if (!selectedCategoryKey) return;
    if (selectedCategoryKey === 'HARDWARE') {
      setStep('hardware'); setSelectedProduct(null);
      hardwareRef.current?.editField(field);
      return;
    }
    setStep('funnel');
    setSelectedProduct(null);
    setTimeout(() => filterRef.current?.editField(field), 0);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Persistent search bar */}
      {showSearchBar && (
        <div className={styledPicker ? "px-4 sm:px-6 py-4 border-b bg-card sticky top-0 z-10 flex flex-col sm:flex-row gap-3 sm:items-center" : "px-4 py-2 border-b bg-background sticky top-0 z-10"}>
          {styledPicker && supplierControl}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={styledPicker ? "Search product, SKU or dimensions" : "Search SKU, name, or dimensions (e.g. 2x4x8)"}
              aria-label="Search catalog"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-10 h-10"
            />
            {searchQuery && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {styledPicker && hasApprovedEstimate && (
            <Button variant="outline" className="shrink-0" onClick={() => { setSearchQuery(''); setStep('estimate'); }}><Package />From estimate</Button>
          )}
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 min-h-0 ${showWorkspace ? 'flex flex-col md:flex-row overflow-y-auto md:overflow-hidden' : 'overflow-y-auto'} ${libraryMode && step !== 'landing' ? '[&>div]:max-w-2xl [&>div]:mx-auto [&>div]:w-full' : ''}`}>
        {showWorkspace && <SelectionRail
          category={selectedCategoryKey ? CATEGORY_FUNNELS[selectedCategoryKey]?.displayName ?? 'Materials' : selectedProduct?.category ?? 'Materials'}
          fields={selectedCategoryKey === 'HARDWARE' ? ['family', 'application', 'size'] : funnelFields ?? Object.keys(displayFilters)} filters={displayFilters}
          currentField={step === 'funnel' || step === 'hardware' ? workspaceField : undefined} secondary={selectedSecondary}
          product={selectedProduct} onEdit={editWorkspaceField} onCategories={goToLanding}
        />}
        <div className={showWorkspace ? 'flex-1 min-w-0 md:overflow-y-auto md:min-h-0' : 'contents'}>
        {selectedCategoryKey === 'HARDWARE' && (
          <div className={step === 'hardware' && !searchActive ? 'contents' : 'hidden'}>
            <HardwarePicker ref={hardwareRef} supplierId={supplierId} onSelect={handleProductSelect} onBack={goToLanding} onSelectionChange={workspaceMode ? trackSelections : undefined} />
          </div>
        )}
        {searchActive ? (
          <SearchResultsView
            results={searchResults} loading={searching}
            onSelect={handleProductSelect}
          />
        ) : (
          <>
            {step === 'landing' && (
              <LandingView
                libraryMode={styledPicker}
                loading={landingLoading}
                recent={recent}
                categories={categoryCards}
                hasApprovedEstimate={hasApprovedEstimate}
                onRecentSelect={handleRecentSelect}
                onCategorySelect={enterCategory}
                onOpenEstimate={() => setStep('estimate')}
              />
            )}

            {step === 'estimate' && projectId && (
              <div className="p-4">
                <EstimateSubTabs
                  projectId={projectId}
                  supplierId={supplierId}
                  onSelectPack={(pack, estimateId) => {
                    if (!onLoadPack) return;
                    const lineItems: POWizardV2LineItem[] = pack.items.map((item, idx) => {
                      const itemAny = item as typeof item & { unit_price?: number | null };
                      // Pricing may be hidden in the UI, but must still be persisted
                      const price = itemAny.unit_price ?? null;
                      return {
                        id: `pack-${idx}-${Date.now()}`,
                        catalog_item_id: item.catalog_item_id || '',
                        supplier_sku: item.supplier_sku || '',
                        name: item.description,
                        specs: item.supplier_sku || '',
                        quantity: item.quantity,
                        unit_mode: 'EACH' as const,
                        uom: item.uom,
                        item_notes: item.catalog_item_id ? undefined : '⚠ Not in catalog',
                        unit_price: price,
                        line_total: price != null ? item.quantity * price : null,
                        source_estimate_item_id: item.id,
                        source_pack_name: item.pack_name,
                        price_source: price != null ? ('FROM_ESTIMATE' as const) : null,
                        original_unit_price: price,
                      };
                    });
                    onLoadPack(lineItems, estimateId, pack.name);
                    onExitPicker();
                  }}
                  onSwitchToCatalog={() => setStep('landing')}
                  onAddPSMItem={onAddPSMItem ?? onAddItem}
                  hidePricing={hidePricing}
                />
              </div>
            )}

            {step === 'secondary' && selectedCategoryKey && (
              <SecondaryCategoryList
                categories={secondaryList}
                loading={false}
                onSelect={handleSecondary}
              />
            )}

            {(step === 'funnel' || step === 'products' || (workspaceMode && step === 'quantity')) && dbCategory && selectedCategoryKey !== 'HARDWARE' && (
              // Keep the filter mounted while products show so Back returns
              // to the user's last real choice instead of restarting the funnel.
              <div className={step !== 'funnel' ? 'hidden' : 'contents'}>
                <StepByStepFilter
                  ref={filterRef}
                  supplierId={supplierId}
                  category={dbCategory}
                  secondaryCategory={selectedSecondary}
                  onComplete={handleFunnelComplete}
                  onBack={() => setStep(selectedSecondary ? 'secondary' : 'landing')}
                  onClose={onClose}
                  fixedSequence={funnelFields}
                  onSelectionChange={workspaceMode ? trackSelections : undefined}
                />
              </div>
            )}

            {step === 'products' && !showWorkspaceProducts && (
              <ProductList
                products={products}
                loading={productsLoading}
                onSelect={handleProductSelect}
              />
            )}

            {showWorkspaceProducts && (
              <section className="px-4 py-5 sm:px-6 space-y-4">
                <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div><h3 className="font-heading text-xl font-semibold uppercase">Choose your product</h3><p className="text-xs text-muted-foreground mt-1">{products.length || (selectedProduct ? 1 : 0)} matching products</p></div>
                  <div className="lg:max-w-[55%]"><p className="text-[11px] text-muted-foreground mb-1.5">Selected specifications</p><SpecificationChips filters={displayFilters} /></div>
                </header>
                {productsLoading ? <Skeleton className="h-48 w-full" /> : <WorkspaceProducts products={products.length ? products : selectedProduct ? [selectedProduct] : []} selected={selectedProduct} onSelect={handleProductSelect} />}
                {step === 'quantity' && selectedProduct && <QuantityPanel key={selectedProduct.id} workspaceMode product={selectedProduct} onAdd={onAddItem} onUpdate={onUpdateItem} onClose={onExitPicker} editingItem={editingItem} hidePricing={hidePricing} />}
                {!productsLoading && products.length === 0 && !selectedProduct && <p className="text-sm text-muted-foreground py-8">No products found.</p>}
              </section>
            )}
            {step === 'quantity' && selectedProduct && !showWorkspaceProducts && (
              <QuantityPanel
                workspaceMode={false}
                product={selectedProduct}
                onAdd={onAddItem}
                onUpdate={onUpdateItem}
                onClose={onExitPicker}
                editingItem={editingItem}
                hidePricing={hidePricing}
              />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Landing view
// ---------------------------------------------------------------------------

interface LandingViewProps {
  loading: boolean;
  libraryMode?: boolean;
  recent: RecentItem[];
  categories: { key: string; cfg: typeof CATEGORY_FUNNELS[string]; count: number }[];
  hasApprovedEstimate: boolean;
  onRecentSelect: (item: RecentItem) => void;
  onCategorySelect: (key: string) => void;
  onOpenEstimate: () => void;
}

function LandingView({
  loading, recent, categories, hasApprovedEstimate, libraryMode = false,
  onRecentSelect, onCategorySelect, onOpenEstimate,
}: LandingViewProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const icons: Record<string, typeof Package> = {
    HARDWARE: Wrench, FRAMING_LUMBER: Layers, FINISH_LUMBER: Layers,
    EXTERIOR: House, DECKING: PanelsTopLeft, ENGINEERED: Ruler,
    STRUCTURAL: Columns3, SHEATHING: Layers, DRYWALL: ClipboardList,
  };
  const categorySection = (
    <section aria-label="Material categories">
      <h3 className="font-heading text-lg font-semibold uppercase mb-3">{libraryMode ? 'Material categories' : 'Browse by Category'}</h3>
      <div className={libraryMode ? "grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 gap-3" : "grid grid-cols-2 gap-2"}>
        {categories.map(({ key, cfg, count }) => {
          const Icon = icons[key] ?? Package;
          return (
            <Button key={key} variant="outline" onClick={() => onCategorySelect(key)}
              className={libraryMode ? "h-auto min-h-[80px] justify-start gap-3 rounded-2xl bg-card px-4 py-3 text-left sm:whitespace-normal" : "h-auto flex-col items-start gap-1 p-3 rounded-xl text-left sm:whitespace-normal"}>
              {libraryMode ? <Icon className="!size-6 text-foreground shrink-0" /> : <span className="text-2xl">{cfg.icon}</span>}
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm leading-snug break-words">{cfg.displayName}</span>
                <span className="block text-xs text-muted-foreground mt-1 font-normal">{count.toLocaleString()} items</span>
              </span>
              {libraryMode && <ChevronRight className="text-muted-foreground" />}
            </Button>
          );
        })}
      </div>
    </section>
  );
  const recentSection = recent.length > 0 && (
    <section aria-label="Recently ordered products">
      <header className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-muted-foreground" /><h3 className="font-heading text-lg font-semibold uppercase">Recently ordered</h3></header>
      {libraryMode && <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_140px_60px_32px] gap-3 px-3 py-2 bg-muted/40 text-[11px] uppercase text-muted-foreground"><span>Product</span><span>SKU</span><span>Unit</span><span /></div>}
      <div className={libraryMode ? "divide-y divide-border" : "grid gap-2"}>
        {recent.slice(0, libraryMode ? 3 : 6).map(item => (
          <Button key={item.id} variant={libraryMode ? 'ghost' : 'outline'} onClick={() => onRecentSelect(item)}
            className={libraryMode ? "w-full h-auto min-h-[64px] grid grid-cols-[minmax(0,1fr)_32px] sm:grid-cols-[minmax(0,1fr)_140px_60px_32px] gap-3 px-3 py-3 text-left rounded-none sm:whitespace-normal" : "w-full h-auto py-3 justify-start text-left"}>
            <span className="min-w-0"><span className="block font-medium text-sm break-words">{item.name || item.description}</span><span className="block sm:hidden text-xs text-muted-foreground mt-1 break-all">{item.supplier_sku} · {item.uom_default}</span></span>
            <span className="hidden sm:block font-mono text-xs text-muted-foreground break-all">{item.supplier_sku}</span>
            <span className="hidden sm:block font-mono text-xs text-muted-foreground">{item.uom_default}</span>
            <CirclePlus className="text-secondary justify-self-end" />
          </Button>
        ))}
      </div>
    </section>
  );
  return (
    <div className={libraryMode ? "px-4 sm:px-6 py-5 space-y-7" : "p-4 space-y-6"}>
      {!libraryMode && hasApprovedEstimate && <Button variant="outline" className="w-full justify-start h-auto p-3" onClick={onOpenEstimate}><Package /><span className="flex-1 text-left">From Project Estimate<span className="block text-xs text-muted-foreground">Packs & matched materials</span></span><ChevronRight /></Button>}
      {libraryMode ? <>{categorySection}{recentSection}</> : <>{recentSection}{categorySection}</>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search results view
// ---------------------------------------------------------------------------

function SearchResultsView({
  results, loading, onSelect,
}: {
  results: CatalogProduct[];
  loading: boolean;
  onSelect: (p: CatalogProduct) => void;
}) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No results. Try a different term or SKU.</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''}</p>
      {results.map(p => (
        <button key={p.id} className="wz-ans" onClick={() => onSelect(p)}>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-sm truncate">{p.name || p.description}</p>
            <p className="text-xs text-muted-foreground truncate">
              {p.supplier_sku}
              {p.dimension && ` · ${p.dimension}`}
              {p.length && ` · ${p.length}`}
              {p.color && ` · ${p.color}`}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
