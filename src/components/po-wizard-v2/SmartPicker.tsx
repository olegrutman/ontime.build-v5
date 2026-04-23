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
import { Search, X, Package, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { POWizardV2LineItem, CatalogProduct, SecondaryCount } from '@/types/poWizardV2';
import { CATEGORY_FUNNELS } from '@/lib/categoryFunnels';
import { StepByStepFilter, type StepByStepFilterHandle } from './StepByStepFilter';
import { SecondaryCategoryList } from './SecondaryCategoryList';
import { ProductList } from './ProductList';
import { QuantityPanel } from './QuantityPanel';
import { EstimateSubTabs } from './EstimateSubTabs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PickerStep =
  | 'landing'      // search bar + recent items + category grid + "From Estimate" tab
  | 'estimate'     // estimate picker
  | 'funnel'       // StepByStepFilter for 'structured' categories
  | 'secondary'    // Secondary list for 'hybrid' first step
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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SmartPicker = forwardRef<SmartPickerHandle, SmartPickerProps>(function SmartPicker(
  {
    supplierId, projectId, editingItem, hasApprovedEstimate = false, hidePricing = false,
    onAddItem, onUpdateItem, onLoadPack, onAddPSMItem, onClearEdit, onClose, onExitPicker,
    initialStep, onStateChange,
  },
  ref,
) {
  const filterRef = useRef<StepByStepFilterHandle>(null);

  // Map legacy 'source' alias → 'landing'
  const resolvedInitialStep: PickerStep =
    initialStep === 'estimate' ? 'estimate' : 'landing';

  // Navigation state
  const [step, setStep] = useState<PickerStep>(resolvedInitialStep);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

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
          p_category: (step === 'funnel' || step === 'secondary' || step === 'products')
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
    if (top && (top as any).score >= 1000) {
      setSelectedProduct(top);
      setStep('quantity');
    }
  }, [searchResults]);

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

    if (config.pattern === 'search') {
      // Open terminal list of all items in category, search will refine.
      setProductsLoading(true);
      const { data } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('category', config.dbCategory as never)
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
    setProductsLoading(true);
    let q = supabase
      .from('catalog_items')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('category', config.dbCategory as never);
    if (selectedSecondary) q = q.eq('secondary_category', selectedSecondary);
    Object.entries(filters).forEach(([k, v]) => { if (v) q = q.eq(k as never, v as never); });
    const { data } = await q.limit(100);
    setProducts((data ?? []) as unknown as CatalogProduct[]);
    setProductsLoading(false);
    setStep('products');
  }, [supplierId, selectedCategoryKey, selectedSecondary]);

  const handleProductSelect = useCallback((p: CatalogProduct) => {
    setSelectedProduct(p);
    setStep('quantity');
  }, []);

  // Reset to landing and clear category/secondary state (Bug 5).
  const goToLanding = useCallback(() => {
    setStep('landing');
    setSelectedCategoryKey(null);
    setSelectedSecondary(null);
    setProducts([]);
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
      case 'funnel':
        // Let StepByStepFilter handle internal step-back; if it's at step 0
        // it will call onBack which we wired to land/secondary.
        filterRef.current?.goBack(); break;
      case 'products':
        if (selectedSecondary) {
          setStep('funnel');
          setProducts([]);
        } else if (selectedCategoryKey && CATEGORY_FUNNELS[selectedCategoryKey]?.pattern === 'search') {
          goToLanding();
        } else {
          setStep('funnel');
          setProducts([]);
        }
        break;
      case 'quantity':
        if (editingItem) { onClearEdit(); onExitPicker(); return; }
        setStep('products'); setSelectedProduct(null); break;
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

  const quickAdd = useCallback((product: CatalogProduct) => {
    setSelectedProduct(product);
    setStep('quantity');
  }, []);

  const showSearchBar = step !== 'quantity';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Persistent search bar */}
      {showSearchBar && (
        <div className="px-4 py-2 border-b bg-background sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU, name, or dimensions (e.g. 2x4x8)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {searchActive ? (
          <SearchResultsView
            results={searchResults} loading={searching}
            onSelect={handleProductSelect}
          />
        ) : (
          <>
            {step === 'landing' && (
              <LandingView
                loading={landingLoading}
                recent={recent}
                categories={categoryCards}
                hasApprovedEstimate={hasApprovedEstimate}
                onRecentSelect={quickAdd}
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
                      const price = hidePricing ? null : (itemAny.unit_price ?? null);
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
                loading={landingLoading}
                onSelect={handleSecondary}
              />
            )}

            {step === 'funnel' && dbCategory && (
              <StepByStepFilter
                ref={filterRef}
                supplierId={supplierId}
                category={dbCategory}
                secondaryCategory={selectedSecondary}
                onComplete={handleFunnelComplete}
                onBack={() => setStep(selectedSecondary ? 'secondary' : 'landing')}
                onClose={onClose}
                fixedSequence={funnelFields}
              />
            )}

            {step === 'products' && (
              <ProductList
                products={products}
                loading={productsLoading}
                onSelect={handleProductSelect}
              />
            )}

            {step === 'quantity' && selectedProduct && (
              <QuantityPanel
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
  );
});

// ---------------------------------------------------------------------------
// Landing view
// ---------------------------------------------------------------------------

interface LandingViewProps {
  loading: boolean;
  recent: RecentItem[];
  categories: { key: string; cfg: typeof CATEGORY_FUNNELS[string]; count: number }[];
  hasApprovedEstimate: boolean;
  onRecentSelect: (p: CatalogProduct) => void;
  onCategorySelect: (key: string) => void;
  onOpenEstimate: () => void;
}

function LandingView({
  loading, recent, categories, hasApprovedEstimate,
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

  return (
    <div className="p-4 space-y-6">
      {/* From Estimate shortcut */}
      {hasApprovedEstimate && (
        <button className="wz-ans w-full" onClick={onOpenEstimate}>
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-sm">From Project Estimate</p>
            <p className="text-xs text-muted-foreground">Packs & matched materials</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Recent items */}
      {recent.length > 0 && (
        <section>
          <header className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recently Ordered
            </h3>
          </header>
          <div className="grid gap-2">
            {recent.slice(0, 6).map(item => (
              <button
                key={item.id}
                className="wz-ans text-left"
                onClick={() => onRecentSelect(item as unknown as CatalogProduct)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.name || item.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.supplier_sku} · ordered {item.times_ordered}×
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {item.uom_default}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Category grid */}
      <section>
        <header className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Browse by Category
          </h3>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(({ key, cfg, count }) => (
            <button
              key={key}
              className="flex flex-col items-start gap-1 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left"
              onClick={() => onCategorySelect(key)}
            >
              <span className="text-2xl">{cfg.icon}</span>
              <span className="font-medium text-sm leading-tight">{cfg.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {count} items
                {cfg.pattern === 'search' && ' · search'}
              </span>
            </button>
          ))}
        </div>
      </section>
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
