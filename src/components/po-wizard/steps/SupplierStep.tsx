import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Check, Building2 } from 'lucide-react';
import { POWizardData } from '@/types/poWizard';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
}

interface SupplierStepProps {
  data: POWizardData;
  onChange: (updates: Partial<POWizardData>) => void;
}

export function SupplierStep({ data, onChange }: SupplierStepProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select('id, name, supplier_code')
      .order('name');
    setSuppliers(suppliersData || []);
    setLoading(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(search.toLowerCase())
  );

  // Show first 4 as "recent" for now
  const recentSuppliers = suppliers.slice(0, 4);

  const handleSelect = (supplier: Supplier) => {
    onChange({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Select Supplier</h2>
        <p className="text-muted-foreground text-sm">
          Who are you ordering from?
        </p>
      </div>

      {/* Recent Suppliers */}
      {!search && recentSuppliers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Recent Suppliers
          </p>
          <div className="grid grid-cols-2 gap-2">
            {recentSuppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className={cn(
                  'p-4 cursor-pointer transition-all touch-manipulation min-h-[72px] flex flex-col justify-center',
                  'hover:border-primary/50 active:scale-[0.98]',
                  data.supplier_id === supplier.id && 'border-primary bg-primary/5'
                )}
                onClick={() => handleSelect(supplier)}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate flex-1">
                    <p className="font-medium text-sm truncate">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.supplier_code}</p>
                  </div>
                  {data.supplier_id === supplier.id && (
                    <Check className="h-5 w-5 text-primary shrink-0 ml-2" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {search ? 'Search Results' : 'All Suppliers'}
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No suppliers found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {filteredSuppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className={cn(
                  'p-3 cursor-pointer transition-all touch-manipulation',
                  'hover:border-primary/50 active:scale-[0.99]',
                  data.supplier_id === supplier.id && 'border-primary bg-primary/5'
                )}
                onClick={() => handleSelect(supplier)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{supplier.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {supplier.supplier_code}
                    </Badge>
                  </div>
                  {data.supplier_id === supplier.id && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
