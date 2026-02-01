import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Package, Trash2, Edit2, Plus, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CatalogItem {
  id: string;
  supplier_sku: string;
  description: string;
  category: string;
  size_or_spec: string | null;
  uom_default: string;
  created_at: string;
}

interface CSVPreviewRow {
  sku: string;
  description: string;
  category: string;
  size_or_spec: string;
  uom: string;
}

export default function SupplierInventory() {
  const navigate = useNavigate();
  const { userOrgRoles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewRow[]>([]);
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
      setItems(data || []);
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
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: 'Invalid CSV', description: 'File must have a header row and at least one data row', variant: 'destructive' });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const skuIdx = headers.findIndex(h => h.includes('sku'));
    const descIdx = headers.findIndex(h => h.includes('desc'));
    const catIdx = headers.findIndex(h => h.includes('cat'));
    const sizeIdx = headers.findIndex(h => h.includes('size') || h.includes('spec'));
    const uomIdx = headers.findIndex(h => h.includes('uom') || h.includes('unit'));

    if (skuIdx === -1 || descIdx === -1) {
      toast({ title: 'Invalid CSV', description: 'CSV must have SKU and Description columns', variant: 'destructive' });
      return;
    }

    const rows: CSVPreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols[skuIdx]) {
        rows.push({
          sku: cols[skuIdx] || '',
          description: cols[descIdx] || '',
          category: catIdx >= 0 ? cols[catIdx] || 'GENERAL' : 'GENERAL',
          size_or_spec: sizeIdx >= 0 ? cols[sizeIdx] || '' : '',
          uom: uomIdx >= 0 ? cols[uomIdx] || 'EA' : 'EA',
        });
      }
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

      // Upsert catalog items
      const itemsToInsert = csvPreview.map(row => ({
        supplier_id: supplier.id,
        supplier_sku: row.sku,
        description: row.description,
        category: row.category.toUpperCase() as any,
        size_or_spec: row.size_or_spec || null,
        uom_default: row.uom,
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
                      <p className="text-2xl font-bold">
                        {new Set(items.map(i => i.category)).size}
                      </p>
                      <p className="text-sm text-muted-foreground">Categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size/Spec</TableHead>
                        <TableHead>UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.supplier_sku}
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.size_or_spec || '—'}
                          </TableCell>
                          <TableCell>{item.uom_default}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* CSV Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Preview Import ({csvPreview.length} items)</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size/Spec</TableHead>
                      <TableHead>UOM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.slice(0, 20).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.size_or_spec || '—'}</TableCell>
                        <TableCell>{row.uom}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
