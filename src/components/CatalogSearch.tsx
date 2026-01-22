import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, Loader2, X } from 'lucide-react';
import { Supplier, CatalogSearchResult, CATALOG_CATEGORIES, CATEGORY_LABELS, CatalogCategory } from '@/types/supplier';

interface CatalogSearchProps {
  onSelectItem?: (item: CatalogSearchResult) => void;
}

export function CatalogSearch({ onSelectItem }: CatalogSearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (data) setSuppliers(data as Supplier[]);
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

    const { data, error } = await supabase.rpc('search_catalog', {
      search_query: query || null,
      category_filter: category === 'all' ? null : category,
      supplier_filter: supplierId === 'all' ? null : supplierId,
    });

    if (error) {
      console.error('Search error:', error);
      setResults([]);
    } else {
      setResults(data as CatalogSearchResult[] || []);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setSupplierId('all');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search catalog (SKU, description, keywords)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATALOG_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>

        {hasSearched && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
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
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {item.supplier_sku}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{item.description}</p>
                      {item.size_or_spec && (
                        <p className="text-xs text-muted-foreground">{item.size_or_spec}</p>
                      )}
                    </div>
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
    </div>
  );
}
