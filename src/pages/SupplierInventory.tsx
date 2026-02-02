import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Package, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { parseEnhancedInventoryCSV, EnhancedCatalogCSVRow, CatalogCategory } from '@/types/supplier';

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
    // Get supplier linked to this org
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', currentOrg?.id)
      .single();

    if (!supplier) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('category', { ascending: true })
      .order('supplier_sku', { ascending: true });

    if (error) {
      console.error('Error fetching catalog:', error);
      toast({ title: 'Error', description: 'Failed to load catalog', variant: 'destructive' });
    } else {
      setItems((data as CatalogItem[]) || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
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
    if (csvPreview.length === 0) return;
    setUploading(true);

    try {
      // Get supplier linked to this org
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrg?.id)
        .single();

      if (!supplier) {
        throw new Error('No supplier record found for this organization');
      }

      // Prepare items for upsert with all enhanced columns
      const itemsToInsert = csvPreview.map(row => ({
        supplier_id: supplier.id,
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
      }));

      const { error } = await supabase
        .from('catalog_items')
        .upsert(itemsToInsert, { onConflict: 'supplier_id,supplier_sku' });

      if (error) throw error;

      toast({ title: 'Success', description: `${csvPreview.length} items imported` });
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

  if (authLoading || (!isSupplier && loading)) {
    return (
      <SidebarProvider>
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <TopBar title="My Product Catalog" />
          <main className="flex-1 overflow-auto container mx-auto px-4 py-6 space-y-6">
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
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
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

            {/* CSV Format Help */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV format: SKU, name, description, Main Category, Secondary Category, Manufacture, Dimension, Thickness, Length, Color, Wood Species, Bundle Name, Bundle Count, qtyType
              </AlertDescription>
            </Alert>

            {/* Catalog Table */}
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Products Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Upload a CSV file to add products to your catalog.
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
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
                        {items.slice(0, 100).map((item) => (
                          <TableRow key={item.id}>
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
                  {items.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing 100 of {items.length} items
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
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
