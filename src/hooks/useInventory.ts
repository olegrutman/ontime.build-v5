import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, InventoryFilters, FilterHistory } from '@/types/inventory';
import { CatalogCategory } from '@/types/supplier';

const DEFAULT_FILTERS: InventoryFilters = {
  search: '',
  mainCategory: null,
  secondaryCategory: null,
  attributes: [],
  qtyType: null,
};

export function useInventory() {
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [filterHistory, setFilterHistory] = useState<FilterHistory[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input for live results
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Main query for inventory items
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory', debouncedSearch, filters.mainCategory, filters.secondaryCategory, filters.attributes, filters.qtyType],
    queryFn: async () => {
      // Use RPC search function for full-text search
      const { data, error } = await supabase.rpc('search_catalog', {
        search_query: debouncedSearch || null,
        category_filter: filters.mainCategory || null,
        supplier_filter: null,
      });

      if (error) {
        console.error('Inventory search error:', error);
        return [];
      }

      let results = (data || []) as InventoryItem[];

      // Client-side filtering for secondary category and attributes
      if (filters.secondaryCategory) {
        results = results.filter(item => 
          item.size_or_spec?.toLowerCase().includes(filters.secondaryCategory!.toLowerCase()) ||
          item.search_keywords?.some(k => k.toLowerCase().includes(filters.secondaryCategory!.toLowerCase()))
        );
      }

      // Filter by attributes (from size_or_spec or search_keywords)
      if (filters.attributes.length > 0) {
        results = results.filter(item => {
          const itemText = `${item.description} ${item.size_or_spec || ''} ${(item.search_keywords || []).join(' ')}`.toLowerCase();
          return filters.attributes.every(attr => itemText.includes(attr.toLowerCase()));
        });
      }

      // Filter by qty type
      if (filters.qtyType) {
        results = results.filter(item => item.uom_default === filters.qtyType);
      }

      return results;
    },
    staleTime: 30000, // Cache for 30s
  });

  // Track filter changes for "Clear Last Filter" functionality
  const addFilterToHistory = useCallback((type: FilterHistory['type'], value: string) => {
    setFilterHistory(prev => [...prev, { type, value }]);
  }, []);

  // Update search (no history tracking for search)
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  // Set main category
  const setMainCategory = useCallback((category: CatalogCategory | null) => {
    setFilters(prev => ({
      ...prev,
      mainCategory: category,
      secondaryCategory: null, // Reset secondary when main changes
      attributes: [], // Reset attributes
    }));
    if (category) {
      addFilterToHistory('mainCategory', category);
    }
  }, [addFilterToHistory]);

  // Set secondary category
  const setSecondaryCategory = useCallback((category: string | null) => {
    setFilters(prev => ({ ...prev, secondaryCategory: category }));
    if (category) {
      addFilterToHistory('secondaryCategory', category);
    }
  }, [addFilterToHistory]);

  // Toggle attribute
  const toggleAttribute = useCallback((attr: string) => {
    setFilters(prev => {
      const exists = prev.attributes.includes(attr);
      const newAttrs = exists
        ? prev.attributes.filter(a => a !== attr)
        : [...prev.attributes, attr];
      
      if (!exists) {
        addFilterToHistory('attribute', attr);
      }
      
      return { ...prev, attributes: newAttrs };
    });
  }, [addFilterToHistory]);

  // Set qty type
  const setQtyType = useCallback((qtyType: string | null) => {
    setFilters(prev => ({ ...prev, qtyType }));
    if (qtyType) {
      addFilterToHistory('qtyType', qtyType);
    }
  }, [addFilterToHistory]);

  // Clear last filter (for empty state recovery)
  const clearLastFilter = useCallback(() => {
    if (filterHistory.length === 0) return;
    
    const lastFilter = filterHistory[filterHistory.length - 1];
    setFilterHistory(prev => prev.slice(0, -1));
    
    switch (lastFilter.type) {
      case 'mainCategory':
        setFilters(prev => ({ ...prev, mainCategory: null, secondaryCategory: null, attributes: [] }));
        break;
      case 'secondaryCategory':
        setFilters(prev => ({ ...prev, secondaryCategory: null }));
        break;
      case 'attribute':
        setFilters(prev => ({
          ...prev,
          attributes: prev.attributes.filter(a => a !== lastFilter.value),
        }));
        break;
      case 'qtyType':
        setFilters(prev => ({ ...prev, qtyType: null }));
        break;
    }
  }, [filterHistory]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setFilterHistory([]);
  }, []);

  // Widen filters (remove most restrictive in order: attributes → secondary → main)
  const widenFilters = useCallback(() => {
    if (filters.attributes.length > 0) {
      setFilters(prev => ({ ...prev, attributes: [] }));
      setFilterHistory(prev => prev.filter(f => f.type !== 'attribute'));
    } else if (filters.secondaryCategory) {
      setFilters(prev => ({ ...prev, secondaryCategory: null }));
      setFilterHistory(prev => prev.filter(f => f.type !== 'secondaryCategory'));
    } else if (filters.mainCategory) {
      setFilters(prev => ({ ...prev, mainCategory: null }));
      setFilterHistory(prev => prev.filter(f => f.type !== 'mainCategory'));
    }
  }, [filters]);

  // Apply preset
  const applyPreset = useCallback((preset: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...DEFAULT_FILTERS, ...preset }));
    setFilterHistory([]);
    if (preset.mainCategory) {
      addFilterToHistory('mainCategory', preset.mainCategory);
    }
  }, [addFilterToHistory]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => 
    filters.mainCategory !== null ||
    filters.secondaryCategory !== null ||
    filters.attributes.length > 0 ||
    filters.qtyType !== null,
  [filters]);

  // Extract unique attributes from current results for dynamic chips
  const availableAttributes = useMemo(() => {
    const attrs = new Set<string>();
    items.forEach(item => {
      // Extract from size_or_spec
      if (item.size_or_spec) {
        attrs.add(item.size_or_spec);
      }
      // Extract from keywords
      item.search_keywords?.forEach(k => {
        if (k.includes('ft') || k.includes('x')) {
          attrs.add(k);
        }
      });
    });
    return Array.from(attrs).slice(0, 12); // Limit to 12 for UI
  }, [items]);

  return {
    items,
    isLoading,
    filters,
    filterHistory,
    hasActiveFilters,
    availableAttributes,
    setSearch,
    setMainCategory,
    setSecondaryCategory,
    toggleAttribute,
    setQtyType,
    clearLastFilter,
    clearAllFilters,
    widenFilters,
    applyPreset,
    refetch,
  };
}
