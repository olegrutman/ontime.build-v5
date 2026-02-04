import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}

// Dynamically discover which fields have filterable values
async function discoverFilterSequence(
  supplierId: string,
  category: string,
  secondaryCategory: string | null
): Promise<string[]> {
  // Build match object
  const matchObj: Record<string, string> = {
    supplier_id: supplierId,
    category: category,
  };
  if (secondaryCategory) {
    matchObj.secondary_category = secondaryCategory;
  }

  // Query all filterable fields
  const selectFields = FILTERABLE_FIELDS.join(',');
  const { data, error } = await supabase
    .from('catalog_items')
    .select(selectFields)
    .match(matchObj);

  if (error || !data || data.length === 0) return [];

  // Count distinct non-null values per field
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

  // Include ALL fields with any data (no skipping), sort by priority
  return [...FILTERABLE_FIELDS]
    .filter(field => fieldCounts[field].size >= 1)
    .sort((a, b) => (FILTER_PRIORITY[b] || 0) - (FILTER_PRIORITY[a] || 0));
}

export function StepByStepFilter({
  supplierId,
  category,
  secondaryCategory,
  onComplete,
  onBack,
  onClose,
}: StepByStepFilterProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [availableValues, setAvailableValues] = useState<SpecValue[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Dynamic filter sequence discovered from database
  const [filterSequence, setFilterSequence] = useState<string[]>([]);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  
  const currentField = filterSequence[currentStepIndex];
  const totalSteps = filterSequence.length;

  // Discover filter sequence on mount or when category changes
  useEffect(() => {
    if (!supplierId || !category) return;
    
    // Reset state for new category selection
    setDiscoveryComplete(false);
    setCurrentStepIndex(0);
    setAppliedFilters({});
    setFilterSequence([]);
    setLoading(true);
    
    discoverFilterSequence(supplierId, category, secondaryCategory)
      .then(sequence => {
        if (sequence.length === 0) {
          // No filters available, go directly to products
          onComplete({});
        } else {
          setFilterSequence(sequence);
          setDiscoveryComplete(true);
        }
      })
      .catch(() => {
        onComplete({});
      });
  }, [supplierId, category, secondaryCategory, onComplete]);

  // Fetch available values for current filter step
  const fetchFilterValues = useCallback(async () => {
    // Don't run until discovery is complete
    if (!discoveryComplete || !supplierId || !category || !currentField) {
      return;
    }

    setLoading(true);
    try {
      // Build filter object with all applied filters
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: category,
      };

      if (secondaryCategory) {
        filterObj.secondary_category = secondaryCategory;
      }

      // Apply previously selected filters
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          filterObj[key] = value;
        }
      });

      // Query for current field values
      const { data, error } = await supabase
        .from('catalog_items')
        .select(currentField)
        .match(filterObj);

      if (error) throw error;

      // Count occurrences
      const counts: Record<string, number> = {};
      let totalProducts = 0;
      data?.forEach(item => {
        totalProducts++;
        const value = (item as any)[currentField];
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });

      setProductCount(totalProducts);

      const values: SpecValue[] = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .filter(v => v.count > 0)
        .sort((a, b) => b.count - a.count);

      setAvailableValues(values);
      // No auto-advance - always show the step so user confirms each selection
    } catch (error) {
      console.error('Error fetching filter values:', error);
    } finally {
      setLoading(false);
    }
  }, [discoveryComplete, supplierId, category, secondaryCategory, currentField, appliedFilters]);

  // Only fetch filter values after discovery is complete
  useEffect(() => {
    if (discoveryComplete && currentField) {
      fetchFilterValues();
    }
  }, [discoveryComplete, currentField, fetchFilterValues]);

  const handleSelectValue = useCallback((value: string) => {
    const newFilters = { ...appliedFilters, [currentField]: value };
    setAppliedFilters(newFilters);

    // Check if this was the last step
    if (currentStepIndex >= totalSteps - 1) {
      onComplete(newFilters);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentField, currentStepIndex, totalSteps, appliedFilters, onComplete]);

  const handleAdvanceToNextStep = useCallback(() => {
    if (currentStepIndex >= totalSteps - 1) {
      onComplete(appliedFilters);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, totalSteps, appliedFilters, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete(appliedFilters);
  }, [appliedFilters, onComplete]);

  const handleBackStep = useCallback(() => {
    if (currentStepIndex === 0) {
      onBack();
    } else {
      // Go back one step and clear that filter
      const prevField = filterSequence[currentStepIndex - 1];
      const newFilters = { ...appliedFilters };
      delete newFilters[prevField];
      setAppliedFilters(newFilters);
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex, filterSequence, appliedFilters, onBack]);

  // Build breadcrumb path
  const buildBreadcrumb = () => {
    const parts: string[] = [];
    if (category) parts.push(category);
    if (secondaryCategory) parts.push(secondaryCategory);
    
    // Add applied filter values
    filterSequence.slice(0, currentStepIndex).forEach(field => {
      if (appliedFilters[field]) {
        parts.push(appliedFilters[field]);
      }
    });

    return parts.join(' › ');
  };

  // Show loading while discovery or fetching is in progress
  if (loading || !discoveryComplete) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 bg-muted/50 border-b">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with breadcrumb and current filter label */}
      <div className="px-4 py-3 bg-muted/50 border-b">
        <p className="text-sm text-muted-foreground truncate">
          {buildBreadcrumb()}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
          {currentField && (
            <p className="text-sm font-medium">
              Select {FIELD_LABELS[currentField] || currentField}
            </p>
          )}
        </div>
      </div>

      {/* Filter options */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {availableValues.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No options available. Tap below to view products.
          </p>
        ) : (
          availableValues.map(spec => (
            <Button
              key={spec.value}
              variant="outline"
              className="w-full h-14 justify-between text-left px-4"
              onClick={() => handleSelectValue(spec.value)}
            >
              <span className="font-medium truncate">{spec.value}</span>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {spec.count}
              </Badge>
            </Button>
          ))
        )}
      </div>

      {/* Sticky footer with skip action */}
      <div className="p-4 border-t bg-background">
        <Button
          variant="secondary"
          className="w-full h-12 text-base"
          onClick={handleSkip}
        >
          Skip — View All {productCount} Products
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
