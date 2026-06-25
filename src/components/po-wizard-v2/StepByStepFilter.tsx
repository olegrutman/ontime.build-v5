import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SpecValue, FILTERABLE_FIELDS, FILTER_PRIORITY, FIELD_LABELS } from '@/types/poWizardV2';

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
}, ref) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [availableValues, setAvailableValues] = useState<SpecValue[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterSequence, setFilterSequence] = useState<string[]>([]);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  
  const currentField = filterSequence[currentStepIndex];
  const totalSteps = filterSequence.length;

  useEffect(() => {
    if (!supplierId || !category) return;

    setDiscoveryComplete(false);
    setCurrentStepIndex(0);
    setAppliedFilters({});
    setFilterSequence([]);
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
    if (!discoveryComplete || !supplierId || !category || !currentField) return;

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
        .match(filterObj);

      if (estimateCatalogIds && estimateCatalogIds.length > 0) {
        query = query.in('id', estimateCatalogIds);
      }

      const { data, error } = await query;
      if (error) throw error;

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
        if (currentStepIndex >= totalSteps - 1) {
          onComplete(appliedFilters);
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
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
      onComplete(newFilters);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentField, currentStepIndex, totalSteps, appliedFilters, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete(appliedFilters);
  }, [appliedFilters, onComplete]);

  const handleBackStep = useCallback(() => {
    if (currentStepIndex === 0) {
      onBack();
    } else {
      const prevField = filterSequence[currentStepIndex - 1];
      const newFilters = { ...appliedFilters };
      delete newFilters[prevField];
      setAppliedFilters(newFilters);
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex, filterSequence, appliedFilters, onBack]);

  useImperativeHandle(ref, () => ({
    goBack: handleBackStep,
  }), [handleBackStep]);

  const buildBreadcrumb = () => {
    const parts: string[] = [];
    if (category) parts.push(category);
    if (secondaryCategory) parts.push(secondaryCategory);
    filterSequence.slice(0, currentStepIndex).forEach(field => {
      if (appliedFilters[field]) parts.push(appliedFilters[field]);
    });
    return parts.join(' › ');
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
              <button
                key={spec.value}
                className="wz-pill wz-pill--inactive"
                onClick={() => handleSelectValue(spec.value)}
              >
                {spec.value}
                <span className="ml-1.5 text-xs opacity-60">{spec.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {availableValues.map(spec => (
              <button
                key={spec.value}
                className="wz-ans"
                onClick={() => handleSelectValue(spec.value)}
              >
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">{spec.value}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                  {spec.count}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
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
