import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SpecValue, FILTERABLE_FIELDS, FILTER_PRIORITY, FIELD_LABELS, SECONDARY_DISPLAY_NAMES } from '@/types/poWizardV2';

interface StepByStepFilterProps {
  supplierId: string | null;
  category: string | null;
  secondaryCategory: string | null;
  onComplete: (filters: Record<string, string>) => void;
  onBack: () => void;
  onClose: () => void;
  estimateCatalogIds?: string[];
  /**
   * Optional pre-baked field sequence. When provided, skips the
   * client-side discovery scan and uses these fields directly.
   * Used by SmartPicker via CATEGORY_FUNNELS.funnelFields.
   */
  fixedSequence?: string[];
  onSelectionChange?: (filters: Record<string, string>, currentField?: string) => void;
}

async function discoverFilterSequence(
  supplierId: string,
  category: string,
  secondaryCategory: string | null,
  estimateCatalogIds?: string[]
): Promise<string[]> {
  const matchObj: Record<string, string> = {
    supplier_id: supplierId,
    category: category,
  };
  if (secondaryCategory) {
    matchObj.secondary_category = secondaryCategory;
  }

  const selectFields = FILTERABLE_FIELDS.join(',');
  let query = supabase
    .from('catalog_items')
    .select(selectFields)
    .eq('is_active', true)
    .match(matchObj);

  if (estimateCatalogIds && estimateCatalogIds.length > 0) {
    query = query.in('id', estimateCatalogIds);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  const fieldCounts: Record<string, Set<string>> = {};
  FILTERABLE_FIELDS.forEach(field => {
    fieldCounts[field] = new Set();
  });

  data.forEach(item => {
    FILTERABLE_FIELDS.forEach(field => {
      const value = item[field as keyof typeof item];
      if (value && typeof value === 'string') {
        fieldCounts[field].add(value);
      }
    });
  });

  return [...FILTERABLE_FIELDS]
    .filter(field => fieldCounts[field].size >= 1)
    .sort((a, b) => (FILTER_PRIORITY[b] || 0) - (FILTER_PRIORITY[a] || 0));
}

export interface StepByStepFilterHandle {
  goBack: () => void;
  editField: (field: string) => void;
}

/**
 * Find the step Back should land on, skipping steps that were auto-applied
 * (single-option or empty steps the user never chose). Returns 0 when every
 * prior step was auto-applied — the caller then treats index 0 as the first
 * real choice, or exits via onBack when already at 0.
 */
export function computeBackStep(
  sequence: string[],
  autoApplied: ReadonlySet<string>,
  currentIndex: number
): number {
  let idx = currentIndex - 1;
  while (idx > 0 && autoApplied.has(sequence[idx])) {
    idx--;
  }
  return Math.max(idx, 0);
}

export const StepByStepFilter = forwardRef<StepByStepFilterHandle, StepByStepFilterProps>(function StepByStepFilter({
  supplierId,
  category,
  secondaryCategory,
  onComplete,
  onBack,
  onClose,
  estimateCatalogIds,
  fixedSequence,
  onSelectionChange,
}, ref) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [availableValues, setAvailableValues] = useState<SpecValue[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterSequence, setFilterSequence] = useState<string[]>([]);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  // Fields whose step was auto-applied (single option) or auto-skipped (empty),
  // so Back can skip over them instead of re-asking a question with no choice.
  const autoAppliedRef = useRef<Set<string>>(new Set());
  // Set once onComplete fires so a re-render can't complete the funnel twice.
  const completedRef = useRef(false);

  const currentField = filterSequence[currentStepIndex];
  const totalSteps = filterSequence.length;

  useEffect(() => {
    onSelectionChange?.(appliedFilters, currentField);
  }, [appliedFilters, currentField, onSelectionChange]);

  useEffect(() => {
    if (!supplierId || !category) return;

    setDiscoveryComplete(false);
    setCurrentStepIndex(0);
    setAppliedFilters({});
    setFilterSequence([]);
    autoAppliedRef.current = new Set();
    completedRef.current = false;
    setLoading(true);

    // Fast path: caller supplied a fixed sequence (e.g. from CATEGORY_FUNNELS).
    if (fixedSequence && fixedSequence.length > 0) {
      setFilterSequence(fixedSequence);
      setDiscoveryComplete(true);

      // Preload total category product count for the "Skip — View All N" footer
      // (Bug 9: without this, count reflects only the first filter step).
      const matchObj: Record<string, string> = {
        supplier_id: supplierId,
        category: category,
      };
      if (secondaryCategory) matchObj.secondary_category = secondaryCategory;
      let countQuery = supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .match(matchObj);
      if (estimateCatalogIds && estimateCatalogIds.length > 0) {
        countQuery = countQuery.in('id', estimateCatalogIds);
      }
      countQuery.then(({ count }) => {
        if (typeof count === 'number') setProductCount(count);
      });
      return;
    }

    discoverFilterSequence(supplierId, category, secondaryCategory, estimateCatalogIds)
      .then(sequence => {
        if (sequence.length === 0) {
          onComplete({});
        } else {
          setFilterSequence(sequence);
          setDiscoveryComplete(true);
        }
      })
      .catch(() => {
        onComplete({});
      });
  }, [supplierId, category, secondaryCategory, onComplete, estimateCatalogIds, fixedSequence]);

  const fetchFilterValues = useCallback(async () => {
    if (!discoveryComplete || !supplierId || !category || !currentField || completedRef.current) return;

    setLoading(true);
    try {
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: category,
      };

      if (secondaryCategory) {
        filterObj.secondary_category = secondaryCategory;
      }

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) filterObj[key] = value;
      });

      let query = supabase
        .from('catalog_items')
        .select(currentField)
        .eq('is_active', true)
        .match(filterObj);

      if (estimateCatalogIds && estimateCatalogIds.length > 0) {
        query = query.in('id', estimateCatalogIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (completedRef.current) return;

      const counts: Record<string, number> = {};
      let totalProducts = 0;
      data?.forEach(item => {
        totalProducts++;
        const value = (item as any)[currentField];
        if (value) counts[value] = (counts[value] || 0) + 1;
      });

      setProductCount(totalProducts);

      const values: SpecValue[] = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .filter(v => v.count > 0)
        .sort((a, b) => b.count - a.count);

      setAvailableValues(values);

      if (values.length === 0) {
        // No options for this field — auto-skip and remember it so Back
        // doesn't land here again.
        autoAppliedRef.current.add(currentField);
        if (currentStepIndex >= totalSteps - 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete(appliedFilters);
          }
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
        return;
      }

      if (values.length === 1) {
        // Only one possible choice (e.g. siding with a single length) —
        // apply it and move on without asking.
        if (currentStepIndex >= totalSteps - 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            autoAppliedRef.current.add(currentField);
            onComplete({ ...appliedFilters, [currentField]: values[0].value });
          }
          return;
        }
        autoAppliedRef.current.add(currentField);
        setAppliedFilters({ ...appliedFilters, [currentField]: values[0].value });
        setCurrentStepIndex(prev => prev + 1);
        return;
      }
    } catch (error) {
      console.error('Error fetching filter values:', error);
    } finally {
      setLoading(false);
    }
  }, [discoveryComplete, supplierId, category, secondaryCategory, currentField, appliedFilters, estimateCatalogIds]);

  useEffect(() => {
    if (discoveryComplete && currentField) {
      fetchFilterValues();
    }
  }, [discoveryComplete, currentField, fetchFilterValues]);

  const handleSelectValue = useCallback((value: string) => {
    const newFilters = { ...appliedFilters, [currentField]: value };
    setAppliedFilters(newFilters);

    if (currentStepIndex >= totalSteps - 1) {
      completedRef.current = true;
      onComplete(newFilters);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentField, currentStepIndex, totalSteps, appliedFilters, onComplete]);

  const handleSkip = useCallback(() => {
    completedRef.current = true;
    onComplete(appliedFilters);
  }, [appliedFilters, onComplete]);

  const handleBackStep = useCallback(() => {
    if (currentStepIndex === 0) {
      onBack();
      return;
    }
    // Walk back past any auto-applied steps so Back returns to the last
    // step where the user actually made a choice.
    const target = computeBackStep(filterSequence, autoAppliedRef.current, currentStepIndex);
    if (target === 0 && autoAppliedRef.current.has(filterSequence[0])) {
      onBack();
      return;
    }
    const newFilters = { ...appliedFilters };
    for (let i = target; i < filterSequence.length; i++) {
      const field = filterSequence[i];
      delete newFilters[field];
      autoAppliedRef.current.delete(field);
    }
    completedRef.current = false; // allow completing again after re-choosing
    setAppliedFilters(newFilters);
    setCurrentStepIndex(target);
  }, [currentStepIndex, filterSequence, appliedFilters, onBack]);

  useImperativeHandle(ref, () => ({
    goBack: handleBackStep,
    editField: (field: string) => {
      const target = filterSequence.indexOf(field);
      if (target < 0) return;
      const nextFilters = { ...appliedFilters };
      filterSequence.slice(target).forEach(key => {
        delete nextFilters[key];
        autoAppliedRef.current.delete(key);
      });
      completedRef.current = false;
      setAppliedFilters(nextFilters);
      setCurrentStepIndex(target);
    },
  }), [handleBackStep, filterSequence, appliedFilters]);

  const buildBreadcrumb = () => {
    const parts: string[] = [];
    if (category) parts.push(category);
    if (secondaryCategory) parts.push(secondaryCategory);
    filterSequence.slice(0, currentStepIndex).forEach(field => {
      if (appliedFilters[field]) parts.push(displayValue(field, appliedFilters[field]));
    });
    return parts.join(' › ');
  };

  const displayValue = (field: string, value: string) => {
    if (field !== 'secondary_category') return value;
    if (value === 'Framing Lumber') return 'Dimensional Lumber & Studs';
    if (value === 'Posts & Timbers') return 'Structural Timbers & Posts';
    return SECONDARY_DISPLAY_NAMES[value] ?? value;
  };

  if (loading || !discoveryComplete) {
    return (
      <div className="flex flex-col h-full">
        <div className="wz-q-header">
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Determine if values are short enough for pills (< 12 chars on average)
  const avgLen = availableValues.reduce((sum, v) => sum + v.value.length, 0) / Math.max(availableValues.length, 1);
  const usePills = avgLen < 12 && availableValues.length <= 8;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Q-Header */}
      <div className="wz-q-header">
        <span className="wz-q-label">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <h2 className="wz-q-title">
          Select {FIELD_LABELS[currentField] || currentField}
        </h2>
        <p className="wz-q-sub truncate">{buildBreadcrumb()}</p>
      </div>

      {/* Filter options */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {availableValues.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No options available.
          </p>
        ) : usePills ? (
          <div className="flex flex-wrap gap-2">
            {availableValues.map(spec => (
              <Button variant="outline"
                key={spec.value}
                className="wz-pill wz-pill--inactive h-auto sm:whitespace-normal"
                onClick={() => handleSelectValue(spec.value)}
              >
                {displayValue(currentField, spec.value)}
                <span className="ml-1.5 text-xs opacity-60">{spec.count}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {availableValues.map(spec => (
              <Button variant="outline"
                key={spec.value}
                className="wz-ans h-auto w-full justify-start whitespace-normal sm:whitespace-normal"
                onClick={() => handleSelectValue(spec.value)}
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm break-words">{displayValue(currentField, spec.value)}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                  {spec.count}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Skip footer */}
      <div className="wz-footer">
        <Button
          variant="secondary"
          className="w-full h-11 text-sm"
          onClick={handleSkip}
        >
          Skip — View All {productCount} Products
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});
