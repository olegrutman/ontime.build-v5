import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SPEC_PRIORITY, SpecValue } from '@/types/poWizardV2';

interface SpecFiltersProps {
  supplierId: string | null;
  category: string | null;
  secondaryCategory: string | null;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onShowProducts: () => void;
  loading: boolean;
}

interface SpecGroup {
  field: string;
  label: string;
  values: SpecValue[];
}

const FIELD_LABELS: Record<string, string> = {
  dimension: 'Dimension',
  length: 'Length',
  color: 'Color',
  wood_species: 'Wood Species',
  thickness: 'Thickness',
  finish: 'Finish',
  manufacturer: 'Manufacturer',
};

export function SpecFilters({
  supplierId,
  category,
  secondaryCategory,
  filters,
  onFilterChange,
  onShowProducts,
  loading: parentLoading,
}: SpecFiltersProps) {
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (supplierId && category) {
      fetchSpecs();
    }
  }, [supplierId, category, secondaryCategory, filters]);

  const fetchSpecs = async () => {
    if (!supplierId || !category) return;
    setLoading(true);
    
    try {
      // Build filter object
      const filterObj: Record<string, any> = {
        supplier_id: supplierId,
        category: category,
      };

      if (secondaryCategory) {
        filterObj.secondary_category = secondaryCategory;
      }

      // Apply current filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          filterObj[key] = value;
        }
      });

      const { data, error } = await supabase
        .from('catalog_items')
        .select('dimension, length, color, wood_species, thickness, finish, manufacturer')
        .match(filterObj);

      if (error) throw error;

      setProductCount(data?.length || 0);

      // Get priority fields for this category
      const priorityFields = SPEC_PRIORITY[category] || [];
      
      // Build spec groups with counts
      const groups: SpecGroup[] = [];
      
      for (const field of priorityFields) {
        const counts: Record<string, number> = {};
        data?.forEach(item => {
          const value = (item as any)[field];
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });

        const values: SpecValue[] = Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .filter(v => v.count > 0)
          .sort((a, b) => b.count - a.count);

        if (values.length > 0) {
          groups.push({
            field,
            label: FIELD_LABELS[field] || field,
            values,
          });
        }
      }

      setSpecGroups(groups);
    } catch (error) {
      console.error('Error fetching specs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    Object.keys(filters).forEach(key => onFilterChange(key, 'all'));
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v !== 'all');

  if (loading || parentLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-20" />
          ))}
        </div>
        <Skeleton className="h-6 w-24" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {category} {secondaryCategory && `› ${secondaryCategory}`}
        </p>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {specGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No filters available. Tap below to view products.
          </p>
        ) : (
          specGroups.map(group => (
            <div key={group.field}>
              <h4 className="text-sm font-medium mb-2">{group.label}</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!filters[group.field] || filters[group.field] === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 min-w-[48px]"
                  onClick={() => onFilterChange(group.field, 'all')}
                >
                  All
                </Button>
                {group.values.map(spec => (
                  <Button
                    key={spec.value}
                    variant={filters[group.field] === spec.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-10"
                    onClick={() => onFilterChange(group.field, spec.value)}
                  >
                    {spec.value}
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1">
                      {spec.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t bg-background">
        <Button className="w-full h-12 text-base" onClick={onShowProducts}>
          View {productCount} Products
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
