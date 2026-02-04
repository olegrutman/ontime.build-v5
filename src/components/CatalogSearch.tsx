import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Loader2, X } from 'lucide-react';
import { CatalogSearchResult, CATALOG_CATEGORIES, CatalogCategory } from '@/types/supplier';

interface CatalogSearchProps {
  onSelectItem?: (item: CatalogSearchResult) => void;
}

// Category chips for quick filtering
const CATEGORY_CHIPS: { label: string; value: CatalogCategory | null }[] = [
  { label: 'All', value: null },
  { label: 'Lumber', value: 'FramingLumber' },
  { label: 'Sheathing', value: 'Sheathing' },
  { label: 'Hardware', value: 'Hardware' },
  { label: 'Decking', value: 'Decking' },
  { label: 'Engineered', value: 'Engineered' },
  { label: 'Accessories', value: 'FramingAccessories' },
  { label: 'Exterior', value: 'Exterior' },
  { label: 'Structural', value: 'Structural' },
];

export function CatalogSearch({ onSelectItem }: CatalogSearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string, categoryFilter: CatalogCategory | null) => {
    setLoading(true);
    setHasSearched(true);

    const { data, error } = await supabase.rpc('search_catalog_v2', {
      search_query: searchQuery || null,
      category_filter: categoryFilter || null,
      secondary_category_filter: null,
      manufacturer_filter: null,
      max_results: 50,
    });

    if (error) {
      console.error('Search error:', error);
      setResults([]);
    } else {
      setResults(data as CatalogSearchResult[] || []);
    }
    setLoading(false);
  }, []);

  // Debounce effect for typeahead
  useEffect(() => {
    const shouldSearch = query.length >= 2 || category !== null;
    
    if (!shouldSearch) {
      if (query.length === 0 && category === null) {
        setResults([]);
        setHasSearched(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query, category);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(query, category);
    }
  };

  const handleCategoryClick = (cat: CatalogCategory | null) => {
    setCategory(cat);
  };

  const clearFilters = () => {
    setQuery('');
    setCategory(null);
    setResults([]);
    setHasSearched(false);
  };

  // Format product display
  const formatProductDetails = (item: CatalogSearchResult) => {
    const details: string[] = [];
    if (item.dimension) details.push(item.dimension);
    if (item.thickness) details.push(item.thickness);
    if (item.length) details.push(item.length);
    if (item.color) details.push(item.color);
    if (item.wood_species) details.push(item.wood_species);
    return details.join(' • ');
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by SKU, name, dimensions, species..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
          type="text"
        />
        {(query || category) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearFilters}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_CHIPS.map((chip) => (
          <Badge
            key={chip.label}
            variant={category === chip.value ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => handleCategoryClick(chip.value)}
          >
            {chip.label}
          </Badge>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>

          {results.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items found.</p>
              <p className="text-sm">Try different search terms or filters.</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {results.map((item) => (
                <Card
                  key={item.id}
                  className={`p-3 hover:shadow-md transition-shadow ${onSelectItem ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectItem?.(item)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* SKU and Category */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {item.supplier_sku}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.secondary_category && (
                          <Badge variant="secondary" className="text-xs">
                            {item.secondary_category}
                          </Badge>
                        )}
                      </div>

                      {/* Name/Description */}
                      <p className="font-medium text-sm">
                        {item.name || item.description}
                      </p>
                      {item.name && item.description !== item.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}

                      {/* Product Details */}
                      {formatProductDetails(item) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatProductDetails(item)}
                        </p>
                      )}

                      {/* Bundle Info */}
                      {item.bundle_type && item.bundle_qty && (
                        <p className="text-xs text-primary mt-1">
                          📦 {item.bundle_type}: {item.bundle_qty} per pack
                        </p>
                      )}

                      {/* Manufacturer */}
                      {item.manufacturer && (
                        <p className="text-xs text-muted-foreground">
                          by {item.manufacturer}
                        </p>
                      )}
                    </div>

                    {/* Right side - UOM and match */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono">{item.uom_default}</p>
                      {item.rank > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          match: {(item.rank * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!loading && !hasSearched && (
        <Card className="p-8 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Start typing or select a category to search</p>
          <p className="text-sm mt-1">Search by SKU, dimensions, species, color...</p>
        </Card>
      )}
    </div>
  );
}
