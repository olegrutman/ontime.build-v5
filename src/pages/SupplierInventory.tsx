import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Package, FileSpreadsheet, AlertCircle, AlertTriangle, Loader2, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { parseEnhancedInventoryCSV, EnhancedCatalogCSVRow, CatalogCategory, CATALOG_CATEGORIES, CATEGORY_LABELS } from '@/types/supplier';
import { AddProductDialog } from '@/components/supplier-inventory/AddProductDialog';
import { EditProductDialog } from '@/components/supplier-inventory/EditProductDialog';

interface CatalogItem {
  id: string;
  supplier_sku: string;
  name: string | null;
  description: string;
  category: string;
  secondary_category: string | null;
  manufacturer: string | null;
  dimension: string | null;
  thickness: string | null;
  length: string | null;
  color: string | null;
  wood_species: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  uom_default: string;
  created_at: string;
}

// Helper function to ensure a supplier record exists for the SUPPLIER organization
const ensureSupplierRecord = async (orgId: string, orgName: string): Promise<string> => {
  // First try to fetch existing supplier
  const { data: existingSupplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (existingSupplier) {
    return existingSupplier.id;
  }

  // Create supplier record for this SUPPLIER organization
  const { data: newSupplier, error: insertError } = await supabase
    .from('suppliers')
    .insert({
      organization_id: orgId,
      supplier_code: orgName.substring(0, 20).toUpperCase().replace(/\s+/g, '-'),
      name: orgName,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return newSupplier.id;
};

export default function SupplierInventory() {
  const navigate = useNavigate();
  const { userOrgRoles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<EnhancedCatalogCSVRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [xlsxUploading, setXlsxUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';

  useEffect(() => {
    if (!authLoading && !isSupplier) {
      toast({
        title: 'Access Denied',
        description: 'This page is only available to Supplier organizations.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    if (isSupplier) {
      fetchCatalogItems();
    }
  }, [authLoading, isSupplier, navigate]);

  const fetchCatalogItems = async () => {
    if (!currentOrg) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      // Ensure supplier record exists, creating one if needed
      const sid = await ensureSupplierRecord(currentOrg.id, currentOrg.name);
      setSupplierId(sid);

      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('supplier_id', sid)
        .order('category', { ascending: true })
        .order('supplier_sku', { ascending: true });

      if (error) {
        console.error('Error fetching catalog:', error);
        toast({ title: 'Error', description: 'Failed to load catalog', variant: 'destructive' });
      } else {
        setItems((data as CatalogItem[]) || []);
      }
    } catch (err: any) {
      console.error('Error ensuring supplier record:', err);
      toast({ title: 'Error', description: err.message || 'Failed to initialize supplier', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      await handleExcelUpload(file);
    } else if (extension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    } else {
      toast({ 
        title: 'Invalid File', 
        description: 'Please upload a CSV or Excel (.xlsx) file.', 
        variant: 'destructive' 
      });
    }
  };

  const handleExcelUpload = async (file: File) => {
    if (!currentOrg) return;
    
    setXlsxUploading(true);
    
    try {
      // Ensure supplier record exists
      const supplierId = await ensureSupplierRecord(currentOrg.id, currentOrg.name);
      
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('import-inventory', {
        body: {
          fileData: base64,
          supplierId,
          fileName: file.name,
        },
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      toast({ 
        title: 'Import Complete', 
        description: `${data.insertedCount} items imported successfully${data.duplicatesRemoved > 0 ? ` (${data.duplicatesRemoved} duplicates merged)` : ''}` 
      });
      
      // Refresh catalog
      fetchCatalogItems();
    } catch (err: any) {
      console.error('Excel upload error:', err);
      toast({ 
        title: 'Import Failed', 
        description: err.message || 'Failed to import Excel file', 
        variant: 'destructive' 
      });
    } finally {
      setXlsxUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseCSV = (text: string) => {
    const rows = parseEnhancedInventoryCSV(text);
    
    if (rows.length === 0) {
      toast({ 
        title: 'Invalid CSV', 
        description: 'Could not parse CSV. Ensure it has SKU and Description columns.', 
        variant: 'destructive' 
      });
      return;
    }

    setCsvPreview(rows);
    setShowPreview(true);
  };

  const handleUploadConfirm = async () => {
    if (csvPreview.length === 0 || !currentOrg) return;
    setUploading(true);

    try {
      // Ensure supplier record exists, creating one if needed
      const supplierId = await ensureSupplierRecord(currentOrg.id, currentOrg.name);

      // De-duplicate by SKU - keep the LAST occurrence (allows overrides in CSV)
      const uniqueItems = new Map<string, any>();
      csvPreview.forEach(row => {
        uniqueItems.set(row.supplier_sku, {
          supplier_id: supplierId,
          supplier_sku: row.supplier_sku,
          name: row.name || null,
          description: row.description,
          category: row.category as CatalogCategory,
          secondary_category: row.secondary_category || null,
          manufacturer: row.manufacturer || null,
          use_type: row.use_type || null,
          product_type: row.product_type || null,
          dimension: row.dimension || null,
          thickness: row.thickness || null,
          length: row.length || null,
          color: row.color || null,
          finish: row.finish || null,
          wood_species: row.wood_species || null,
          bundle_type: row.bundle_type || null,
          bundle_qty: row.bundle_qty || null,
          uom_default: row.uom_default,
          size_or_spec: row.size_or_spec || null,
        });
      });

      const itemsToInsert = Array.from(uniqueItems.values());

      const { error } = await supabase
        .from('catalog_items')
        .upsert(itemsToInsert, { onConflict: 'supplier_id,supplier_sku' });

      if (error) throw error;

      const duplicatesRemoved = csvPreview.length - itemsToInsert.length;
      toast({ 
        title: 'Success', 
        description: duplicatesRemoved > 0 
          ? `${itemsToInsert.length} items imported (${duplicatesRemoved} duplicates merged)` 
          : `${itemsToInsert.length} items imported` 
      });
      setShowPreview(false);
      setCsvPreview([]);
      fetchCatalogItems();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to import items', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Count unique values
  const uniqueCategories = new Set(items.map(i => i.category)).size;
  const uniqueManufacturers = new Set(items.filter(i => i.manufacturer).map(i => i.manufacturer)).size;

  // Filtered items based on search and category
  const filteredItems = useMemo(() => {
    let result = items;
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.supplier_sku.toLowerCase().includes(q) ||
        (i.name && i.name.toLowerCase().includes(q)) ||
        i.description.toLowerCase().includes(q) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, searchQuery, categoryFilter]);

  // Detect duplicate SKUs in preview
  const duplicateSkuCount = useMemo(() => {
    if (csvPreview.length === 0) return 0;
    const skuCounts = csvPreview.reduce((acc, row) => {
      acc[row.supplier_sku] = (acc[row.supplier_sku] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.values(skuCounts).filter(count => count > 1).length;
  }, [csvPreview]);

  const defaultOpen = useDefaultSidebarOpen();

  if (authLoading || (!isSupplier && loading)) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <TopBar title="My Inventory" />
            <main className="flex-1 overflow-auto container mx-auto px-4 py-6">
              <Skeleton className="h-64 w-full" />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
         <SidebarInset className="flex flex-col flex-1 bg-background">
          <TopBar title="My Product Catalog" />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 pb-20 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Product Catalog</h1>
                <p className="text-muted-foreground">
                  Manage your inventory and product offerings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={xlsxUploading}
                >
                  {xlsxUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
                <Button onClick={() => setAddDialogOpen(true)} disabled={!supplierId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{items.length}</p>
                      <p className="text-sm text-muted-foreground">Total Products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <FileSpreadsheet className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueCategories}</p>
                      <p className="text-sm text-muted-foreground">Categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Package className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueManufacturers}</p>
                      <p className="text-sm text-muted-foreground">Manufacturers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* File Format Help */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supports Excel (.xlsx) or CSV upload. Excel format: code, name, description, Main Category, Secondary Category, Manufacture, Dimension, Thickness, Length, Color, Wood Species, Bundle Name, Bundle Count, qtyType
              </AlertDescription>
            </Alert>

            {/* Search & Filter */}
            {!loading && items.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by SKU, name, description, or manufacturer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATALOG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Catalog Table */}
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Products Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Upload a CSV or add products manually.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <Button onClick={() => setAddDialogOpen(true)} disabled={!supplierId}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Specs</TableHead>
                          <TableHead>Bundle</TableHead>
                          <TableHead>UOM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.slice(0, 200).map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setEditItem(item)}
                          >
                            <TableCell className="font-mono text-sm">
                              {item.supplier_sku}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{item.name || item.description}</p>
                                {item.manufacturer && (
                                  <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary">{item.category}</Badge>
                                {item.secondary_category && (
                                  <Badge variant="outline" className="text-xs">{item.secondary_category}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {[item.dimension, item.thickness, item.length, item.color, item.wood_species]
                                .filter(Boolean)
                                .join(' • ') || '—'}
                            </TableCell>
                            <TableCell>
                              {item.bundle_type && item.bundle_qty ? (
                                <span className="text-xs">
                                  {item.bundle_type}: {item.bundle_qty}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>{item.uom_default}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredItems.length > 200 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing 200 of {filteredItems.length} items. Use search to narrow results.
                    </p>
                  )}
                  {filteredItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No items match your search.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CSV Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-5xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Preview Import ({csvPreview.length} items)</DialogTitle>
                </DialogHeader>
                {duplicateSkuCount > 0 && (
                  <Alert className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      Found {duplicateSkuCount} duplicate SKUs. Last occurrence of each will be used.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Specs</TableHead>
                        <TableHead>Bundle</TableHead>
                        <TableHead>UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.slice(0, 20).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{row.supplier_sku}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{row.name || row.description}</p>
                              {row.manufacturer && (
                                <p className="text-xs text-muted-foreground">{row.manufacturer}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary">{row.category}</Badge>
                              {row.secondary_category && (
                                <Badge variant="outline" className="text-xs">{row.secondary_category}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {[row.dimension, row.thickness, row.length, row.color, row.wood_species]
                              .filter(Boolean)
                              .join(' • ') || '—'}
                          </TableCell>
                          <TableCell>
                            {row.bundle_type && row.bundle_qty ? (
                              <span className="text-xs">
                                {row.bundle_type}: {row.bundle_qty}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{row.uom_default}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvPreview.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center">
                    ... and {csvPreview.length - 20} more items
                  </p>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUploadConfirm} disabled={uploading}>
                    {uploading ? 'Importing...' : 'Confirm Import'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add / Edit Dialogs */}
            {supplierId && (
              <AddProductDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                supplierId={supplierId}
                onSaved={fetchCatalogItems}
              />
            )}
            <EditProductDialog
              open={!!editItem}
              onOpenChange={(open) => { if (!open) setEditItem(null); }}
              item={editItem}
              onSaved={fetchCatalogItems}
            />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
