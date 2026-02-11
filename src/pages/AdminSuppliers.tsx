import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Supplier, CatalogItem, CATALOG_CATEGORIES, parseCSVToItems, CatalogCSVRow, parseInventoryCSV } from '@/types/supplier';
import { Plus, Upload, Search, Package, Loader2, Trash2, FileText, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

const supplierSchema = z.object({
  supplier_code: z.string().min(2, 'Code required').max(20).regex(/^[A-Z0-9-]+$/, 'Uppercase, numbers, hyphens only'),
  name: z.string().min(2, 'Name required'),
  contact_info: z.string().optional(),
});

export default function AdminSuppliers() {
  const navigate = useNavigate();
  const { user, userOrgRoles, currentRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CatalogCSVRow[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  const [supplierForm, setSupplierForm] = useState({
    supplier_code: '',
    name: '',
    contact_info: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAdmin = currentRole === 'GC_PM' || currentRole === 'TC_PM';
  const orgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!authLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only GC and TC managers can manage suppliers.',
      });
      navigate('/');
      return;
    }
    if (orgId) {
      fetchSuppliers();
    }
  }, [authLoading, user, isAdmin, orgId]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setSuppliers(data as Supplier[] || []);
    }
    setLoading(false);
  };

  const fetchCatalogItems = async (supplierId: string) => {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('category', { ascending: true })
      .order('description', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setCatalogItems(data as CatalogItem[] || []);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = supplierSchema.safeParse(supplierForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!orgId) return;

    setUploading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: orgId,
        supplier_code: supplierForm.supplier_code.toUpperCase(),
        name: supplierForm.name,
        contact_info: supplierForm.contact_info || null,
      })
      .select()
      .single();

    setUploading(false);

    if (error) {
      if (error.message.includes('unique')) {
        toast({ variant: 'destructive', title: 'Error', description: 'Supplier code already exists.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    } else {
      toast({ title: 'Supplier created!', description: `${data.name} (${data.supplier_code})` });
      setSupplierForm({ supplier_code: '', name: '', contact_info: '' });
      setCreateDialogOpen(false);
      fetchSuppliers();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSupplier) return;

    const text = await file.text();
    
    // Auto-detect format based on headers
    const firstLine = text.split('\n')[0].toLowerCase();
    const isInventoryFormat = firstLine.includes('sku') && firstLine.includes('main category');
    
    const items = isInventoryFormat ? parseInventoryCSV(text) : parseCSVToItems(text);

    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid CSV', description: 'No valid rows found.' });
      return;
    }

    setCsvPreview(items);
    setShowCsvPreview(true);
  };

  const handleImportCatalog = async () => {
    if (!selectedSupplier || csvPreview.length === 0) return;

    setUploading(true);

    const itemsToInsert = csvPreview.map(row => ({
      supplier_id: selectedSupplier.id,
      supplier_sku: row.supplier_sku,
      category: row.category as any,
      description: row.description,
      uom_default: row.uom_default,
      size_or_spec: row.size_or_spec || null,
      search_keywords: row.search_keywords ? row.search_keywords.split(',').map(k => k.trim()) : null,
    }));

    const { error } = await supabase
      .from('catalog_items')
      .upsert(itemsToInsert, { 
        onConflict: 'supplier_id,supplier_sku',
        ignoreDuplicates: false 
      });

    setUploading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Import failed', description: error.message });
    } else {
      toast({ title: 'Catalog imported!', description: `${csvPreview.length} items imported.` });
      setCsvPreview([]);
      setShowCsvPreview(false);
      fetchCatalogItems(selectedSupplier.id);
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!confirm(`Delete ${supplier.name}? This will also delete all catalog items.`)) return;

    const { error } = await supabase.from('suppliers').delete().eq('id', supplier.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Deleted', description: `${supplier.name} removed.` });
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
        setCatalogItems([]);
      }
      fetchSuppliers();
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Manage Suppliers">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Supplier Management" subtitle="Create suppliers and upload product catalogs">
      <div className="p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Suppliers List */}
          <div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Suppliers</h2>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Supplier</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSupplier} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Supplier Code</label>
                        <Input
                          placeholder="SIMPSON"
                          value={supplierForm.supplier_code}
                          onChange={(e) => setSupplierForm({ ...supplierForm, supplier_code: e.target.value.toUpperCase() })}
                          className="font-mono uppercase"
                        />
                        {errors.supplier_code && <p className="text-xs text-destructive mt-1">{errors.supplier_code}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Company Name</label>
                        <Input
                          placeholder="Simpson Strong-Tie"
                          value={supplierForm.name}
                          onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                        />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Contact Info (optional)</label>
                        <Input
                          placeholder="sales@example.com"
                          value={supplierForm.contact_info}
                          onChange={(e) => setSupplierForm({ ...supplierForm, contact_info: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={uploading}>
                        {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Supplier
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No suppliers yet. Create one to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        fetchCatalogItems(supplier.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSupplier?.id === supplier.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{supplier.name}</p>
                            <code className="text-xs text-muted-foreground">{supplier.supplier_code}</code>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSupplier(supplier);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Catalog Items */}
          <div>
            {selectedSupplier ? (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold">{selectedSupplier.name} Catalog</h2>
                    <p className="text-sm text-muted-foreground">{catalogItems.length} items</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-1" />
                          Import CSV
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {/* CSV Preview */}
                {showCsvPreview && (
                  <Card className="mb-4 p-4 border-2 border-dashed border-primary/50 bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">CSV Preview ({csvPreview.length} items)</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowCsvPreview(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleImportCatalog} disabled={uploading}>
                          {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Import All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>UOM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{row.supplier_sku}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{row.category}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{row.description}</TableCell>
                              <TableCell className="text-xs">{row.uom_default}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {csvPreview.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          ...and {csvPreview.length - 10} more items
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {/* Catalog Table */}
                {catalogItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No catalog items yet.</p>
                    <p className="text-sm">Upload a CSV to import products.</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Size/Spec</TableHead>
                          <TableHead>UOM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catalogItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.supplier_sku}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.size_or_spec || '—'}</TableCell>
                            <TableCell className="text-xs">{item.uom_default}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* CSV Format Help */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-xs font-medium mb-2">CSV Format</h4>
                  <code className="text-[10px] text-muted-foreground block">
                    supplier_sku,category,description,uom_default,size_or_spec,search_keywords
                  </code>
                  <code className="text-[10px] text-muted-foreground block mt-1">
                    LUS28,Hardware,Joist Hanger 2x8,EA,2x8,"simpson,joist,hanger"
                  </code>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Select a supplier</p>
                <p className="text-sm">Choose a supplier to view or upload their catalog.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
