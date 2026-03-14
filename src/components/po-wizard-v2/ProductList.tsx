import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, ChevronRight } from 'lucide-react';
import { CatalogProduct } from '@/types/poWizardV2';

interface ProductListProps {
  products: CatalogProduct[];
  loading: boolean;
  onSelect: (product: CatalogProduct) => void;
}

export function ProductList({ products, loading, onSelect }: ProductListProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products;

  const formatSpecs = (product: CatalogProduct) => {
    const parts: string[] = [];
    if (product.dimension) parts.push(product.dimension);
    if (product.length) parts.push(product.length);
    if (product.color) parts.push(product.color);
    if (product.thickness) parts.push(product.thickness);
    return parts.join(' · ') || product.category;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Collapsible Search */}
      <div className="px-4 py-2 border-b">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 flex-1 text-sm"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground h-9 text-sm"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            Search {products.length} products...
          </Button>
        )}
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              {searchQuery ? 'No products match your search.' : 'No products found.'}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          filteredProducts.map(product => (
            <button
              key={product.id}
              className="wz-ans"
              onClick={() => onSelect(product)}
            >
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate">
                  {product.name || product.description}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {product.supplier_sku} · {formatSpecs(product)}
                </p>
                {product.bundle_type && (
                  <p className="text-xs text-primary mt-0.5">
                    Bundle: {product.bundle_type} ({product.bundle_qty} pcs)
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
