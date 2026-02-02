import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Check, Building2, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POWizardData } from '@/types/poWizard';
import { cn } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  supplier_code: string;
  isProjectSupplier?: boolean;
}

interface SupplierStepProps {
  data: POWizardData;
  onChange: (updates: Partial<POWizardData>) => void;
  projectId?: string | null;
}

export function SupplierStep({ data, onChange, projectId }: SupplierStepProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projectSuppliers, setProjectSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [projectId]);

  const fetchSuppliers = async () => {
    setLoading(true);
    
    // Fetch all suppliers
    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select('id, name, supplier_code, organization_id')
      .order('name');
    
    const allSuppliers = (suppliersData || []).map(s => ({
      id: s.id,
      name: s.name,
      supplier_code: s.supplier_code,
    }));
    
    // If we have a project, find suppliers on the team
    if (projectId) {
      // Get team members with 'Supplier' role and their org_ids
      const { data: teamData } = await supabase
        .from('project_team')
        .select('org_id')
        .eq('project_id', projectId)
        .eq('role', 'Supplier');
      
      if (teamData && teamData.length > 0) {
        const supplierOrgIds = teamData.map(t => t.org_id).filter(Boolean);
        
        if (supplierOrgIds.length > 0) {
          // Find suppliers linked to these orgs
          const { data: projectSuppliersData } = await supabase
            .from('suppliers')
            .select('id, name, supplier_code')
            .in('organization_id', supplierOrgIds);
          
          const projSuppliers = (projectSuppliersData || []).map(s => ({
            id: s.id,
            name: s.name,
            supplier_code: s.supplier_code,
            isProjectSupplier: true,
          }));
          
          setProjectSuppliers(projSuppliers);
          
          // Auto-select if there's exactly one project supplier and none selected yet
          if (projSuppliers.length === 1 && !data.supplier_id && !autoSelected) {
            onChange({
              supplier_id: projSuppliers[0].id,
              supplier_name: projSuppliers[0].name,
            });
            setAutoSelected(true);
          }
        }
      }
    }
    
    setSuppliers(allSuppliers);
    setLoading(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code.toLowerCase().includes(search.toLowerCase())
  );

  // Show suppliers not on project team
  const otherSuppliers = suppliers.filter(s => 
    !projectSuppliers.some(ps => ps.id === s.id)
  );

  const handleSelect = (supplier: Supplier) => {
    onChange({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
    });
  };

  const handleDropdownChange = (supplierId: string) => {
    const supplier = projectSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      handleSelect(supplier);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Select Supplier</h2>
        <p className="text-muted-foreground text-sm">
          Who are you ordering from?
        </p>
      </div>

      {/* Single Project Supplier - Auto-selected confirmation */}
      {!search && projectSuppliers.length === 1 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Project supplier auto-selected
          </p>
          <Card className="p-4 border-primary bg-primary/5 inline-block">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">{projectSuppliers[0].name}</p>
                <p className="text-xs text-muted-foreground">{projectSuppliers[0].supplier_code}</p>
              </div>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            Tap Next to continue, or search for a different supplier below
          </p>
        </div>
      )}

      {/* Multiple Project Suppliers - Dropdown */}
      {!search && projectSuppliers.length > 1 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Select Project Supplier
          </p>
          <Select 
            value={data.supplier_id || ''} 
            onValueChange={handleDropdownChange}
          >
            <SelectTrigger className="w-full h-14">
              <SelectValue placeholder="Choose a supplier..." />
            </SelectTrigger>
            <SelectContent>
              {projectSuppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{supplier.name}</span>
                    <span className="text-xs text-muted-foreground">{supplier.supplier_code}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* No Project Suppliers - Show all with search */}
      {!search && projectSuppliers.length === 0 && otherSuppliers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Available Suppliers
          </p>
          <div className="grid grid-cols-2 gap-2">
            {otherSuppliers.slice(0, 4).map((supplier) => (
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
