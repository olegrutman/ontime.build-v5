import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Package, AlertCircle, AlertTriangle, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout';
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
import { parseCatalogImport, type CatalogImportRow } from '@/lib/catalogImport';
import { AddProductDialog } from '@/components/supplier-inventory/AddProductDialog';
import { EditProductDialog } from '@/components/supplier-inventory/EditProductDialog';
import { CatalogHealthStrip } from '@/components/supplier-inventory/CatalogHealthStrip';
import { CatalogToolbar } from '@/components/supplier-inventory/CatalogToolbar';
import { CatalogTable } from '@/components/supplier-inventory/CatalogTable';
import { CatalogBulkBar } from '@/components/supplier-inventory/CatalogBulkBar';
import {
  useCatalogManagerItems,
  useCatalogFacets,
  useSetCatalogPrice,
  useBulkUpdateCatalogItems,
  useBulkSetCatalogPrice,
  fetchCatalogForExport,
  DEFAULT_CATALOG_FILTERS,
  type CatalogFilters,
  type CatalogManagerItem,
} from '@/hooks/useCatalogManager';

// Ensure a supplier record exists for the SUPPLIER organization
const ensureSupplierRecord = async (orgId: string, orgName: string): Promise<string> => {
  const { data: existingSupplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (existingSupplier) return existingSupplier.id;

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

function toCsv(rows: CatalogManagerItem[]): string {
  const headers = [
    'sku', 'name', 'description', 'category', 'secondary_category', 'manufacturer',
    'dimension', 'thickness', 'length', 'color', 'wood_species', 'bundle_type',
    'bundle_qty', 'uom', 'list_price', 'price_uom', 'lead_time_days', 'min_order_qty', 'status',
  ];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.supplier_sku, r.name, r.description, r.category, r.secondary_category, r.manufacturer,
      r.dimension, r.thickness, r.length, r.color, r.wood_species, r.bundle_type,
      r.bundle_qty, r.uom_default, r.list_price, r.price_uom, r.lead_time_days, r.min_order_qty,
      r.is_active ? 'ACTIVE' : 'RETIRED',
    ].map(esc).join(','),
  );
  return [headers.join(','), ...lines].join('\n');
}

export default function SupplierInventory() {
  const navigate = useNavigate();
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [xlsxUploading, setXlsxUploading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CatalogImportRow[]>([]);
  const [skippedRows, setSkippedRows] = useState<{ line: number; reason: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogManagerItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentOrg = userOrgRoles[0]?.organization;
  const isSupplier = currentOrg?.type === 'SUPPLIER';
  const [isDesignatedOnly, setIsDesignatedOnly] = useState(false);

  const { data: page, isLoading: itemsLoading, refetch } = useCatalogManagerItems(supplierId, filters);
  const { data: facets } = useCatalogFacets(supplierId);
  const setPrice = useSetCatalogPrice();
  const bulkUpdate = useBulkUpdateCatalogItems();
  const bulkPrice = useBulkSetCatalogPrice();

  const rows = page?.rows ?? [];
  const total = page?.total ?? 0;
  const saving = setPrice.isPending || bulkUpdate.isPending || bulkPrice.isPending;

  useEffect(() => {
    const checkDesignatedSupplier = async () => {
      if (!authLoading && !isSupplier && user?.id) {
        const { data } = await supabase
          .from('project_designated_suppliers')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
        if (data && data.length > 0) setIsDesignatedOnly(true);
      }
    };
    checkDesignatedSupplier();
  }, [authLoading, isSupplier, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!isSupplier && !isDesignatedOnly) {
      toast({
        title: 'Access Denied',
        description: 'This page is only available to Supplier organizations.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    if (!isSupplier) {
      setInitializing(false);
      return;
    }

    if (!currentOrg) return;

    ensureSupplierRecord(currentOrg.id, currentOrg.name)
      .then((sid) => setSupplierId(sid))
      .catch((err: any) =>
        toast({
          title: 'Error',
          description: err.message || 'Failed to initialize supplier',
          variant: 'destructive',
        }),
      )
      .finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isSupplier, isDesignatedOnly, currentOrg?.id]);

  const patchFilters = (patch: Partial<CatalogFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setSelectedIds(new Set());
  };

  const toggleId = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) => {
      const allSelected = rows.length > 0 && rows.every((r) => prev.has(r.id));
      return allSelected ? new Set() : new Set(rows.map((r) => r.id));
    });

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const runBulk = async (fn: () => Promise<unknown>, label: string) => {
    try {
      await fn();
      toast({ title: label, description: `${selectedIdList.length} product(s) updated` });
      setSelectedIds(new Set());
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    if (!supplierId) return;
    setExporting(true);
    try {
      const all = await fetchCatalogForExport(supplierId, filters);
      const blob = new Blob([toCsv(all)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalog-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', description: `${all.length} products exported` });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'xlsx' || extension === 'xls') {
      await handleExcelUpload(file);
    } else if (extension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => parseCSV(event.target?.result as string);
      reader.readAsText(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV or Excel (.xlsx) file.',
        variant: 'destructive',
      });
    }
  };

  const handleExcelUpload = async (file: File) => {
    if (!supplierId) return;
    setXlsxUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('import-inventory', {
        body: { fileData: base64, supplierId, fileName: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Import Complete',
        description: `${data.insertedCount} items imported${data.duplicatesRemoved > 0 ? ` (${data.duplicatesRemoved} duplicates merged)` : ''}`,
      });
      refetch();
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message || 'Failed to import file', variant: 'destructive' });
    } finally {
      setXlsxUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string) => {
    const result = parseCatalogImport(text);
    if (result.missingColumns.length > 0 || result.rows.length === 0) {
      toast({
        title: 'File could not be read',
        description: result.missingColumns.length
          ? `Missing column(s): ${result.missingColumns.join(', ')}. Use the template headers below.`
          : 'No product rows found. Each row needs a SKU and description.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setCsvPreview(result.rows);
    setSkippedRows(result.skippedRows);
    setShowPreview(true);
  };

  const [importMode, setImportMode] = useState<'replace' | 'update'>('replace');

  const handleUploadConfirm = async () => {
    if (csvPreview.length === 0 || !supplierId) return;
    setUploading(true);
    try {
      const unique = new Map<string, CatalogImportRow>();
      csvPreview.forEach((row) => unique.set(row.supplier_sku, row));
      const list = Array.from(unique.values());
      const { data: auth } = await supabase.auth.getUser();
      let pricedSaved = 0;

      for (let i = 0; i < list.length; i += 400) {
        const chunk = list.slice(i, i + 400);
        const { data: saved, error } = await supabase
          .from('catalog_items')
          .upsert(
            chunk.map((row) => ({
              supplier_id: supplierId,
              supplier_sku: row.supplier_sku,
              name: row.name,
              description: row.description,
              category: row.category,
              secondary_category: row.secondary_category,
              manufacturer: row.manufacturer,
              dimension: row.dimension,
              thickness: row.thickness,
              length: row.length,
              color: row.color,
              wood_species: row.wood_species,
              bundle_type: row.bundle_type,
              bundle_qty: row.bundle_qty,
              uom_default: row.uom_default,
              lead_time_days: row.lead_time_days,
              min_order_qty: row.min_order_qty,
              is_active: row.is_active,
              discontinued_at: row.is_active ? null : new Date().toISOString(),
              ...(Object.keys(row.review).length ? { attributes: { import_review: row.review } } : {}),
            })),
            { onConflict: 'supplier_id,supplier_sku' },
          )
          .select('id, supplier_sku');
        if (error) throw error;

        const idBySku = new Map((saved || []).map((s) => [s.supplier_sku, s.id]));
        const prices = chunk
          .filter((row) => row.list_price != null && idBySku.has(row.supplier_sku))
          .map((row) => ({
            catalog_item_id: idBySku.get(row.supplier_sku)!,
            supplier_id: supplierId,
            list_price: row.list_price!,
            price_uom: row.price_uom,
            updated_by: auth.user?.id ?? null,
          }));
        if (prices.length) {
          const { error: priceError } = await supabase
            .from('catalog_prices')
            .upsert(prices, { onConflict: 'catalog_item_id' });
          if (priceError) throw priceError;
          pricedSaved += prices.length;
        }
      }

      let retired = 0;
      if (importMode === 'replace') {
        const keep = new Set(list.map((r) => r.supplier_sku));
        const stale: string[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from('catalog_items')
            .select('id, supplier_sku')
            .eq('supplier_id', supplierId)
            .eq('is_active', true)
            .order('id')
            .range(from, from + 999);
          if (error) throw error;
          (data || []).forEach((r) => { if (!keep.has(r.supplier_sku)) stale.push(r.id); });
          if (!data || data.length < 1000) break;
        }
        const now = new Date().toISOString();
        for (let i = 0; i < stale.length; i += 200) {
          const { error } = await supabase
            .from('catalog_items')
            .update({ is_active: false, discontinued_at: now })
            .in('id', stale.slice(i, i + 200));
          if (error) throw error;
        }
        retired = stale.length;
      }

      const unpriced = list.length - pricedSaved;
      toast({
        title: importMode === 'replace' ? 'Catalog replaced' : 'Import complete',
        description: `${list.length} products saved · ${pricedSaved} priced${unpriced ? ` · ${unpriced} need a price` : ''}${retired ? ` · ${retired} old products retired` : ''}`,
      });
      setShowPreview(false);
      setCsvPreview([]);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to import items', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const duplicateSkuCount = useMemo(() => {
    if (csvPreview.length === 0) return 0;
    const counts = csvPreview.reduce((acc, row) => {
      acc[row.supplier_sku] = (acc[row.supplier_sku] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.values(counts).filter((c) => c > 1).length;
  }, [csvPreview]);

  const previewStats = useMemo(() => ({
    priced: csvPreview.filter((r) => r.list_price != null).length,
    unpriced: csvPreview.filter((r) => r.list_price == null).length,
    invalid: csvPreview.filter((r) => r.invalid_price).length,
    review: csvPreview.filter((r) => Object.keys(r.review).length > 0).length,
  }), [csvPreview]);

  if (authLoading || (initializing && !isDesignatedOnly)) {
    return (
      <AppLayout title="Catalog Management">
        <Skeleton className="h-64 w-full" />
      </AppLayout>
    );
  }

  if (isDesignatedOnly && !isSupplier) {
    return (
      <AppLayout title="Product Catalog">
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Read-Only Access</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You have supplier access to specific projects but cannot edit the product catalog.
              Visit your assigned projects to manage purchase orders and estimates.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <AppLayout title="Catalog Management" subtitle="Products, pricing, and availability">
      <div className="space-y-4 pb-36">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Catalog Management</h1>
            <p className="text-sm text-muted-foreground">
              Maintain SKUs, list prices, lead times, and what buyers can order.
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={xlsxUploading}>
              {xlsxUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} disabled={!supplierId}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {facets && (
          <CatalogHealthStrip
            total={facets.total}
            activeCount={facets.activeCount}
            inactiveCount={facets.inactiveCount}
            unpricedCount={facets.unpricedCount}
            uncategorizedCount={facets.uncategorizedCount}
            manufacturerCount={facets.manufacturers.length}
            activeStatus={filters.status}
            onSelectStatus={(status) => patchFilters({ status, page: 0 })}
          />
        )}

        <CatalogToolbar
          filters={filters}
          onChange={patchFilters}
          manufacturers={facets?.manufacturers ?? []}
          onExport={handleExport}
          exporting={exporting}
        />

        <Card>
          <CardContent className="p-0">
            {itemsLoading ? (
              <div className="p-4"><Skeleton className="h-64 w-full" /></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {total === 0 && facets?.total === 0 ? 'No Products Yet' : 'No products match these filters'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  {total === 0 && facets?.total === 0
                    ? 'Import a CSV/Excel price file or add products manually.'
                    : 'Try clearing search, category, or status filters.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import file
                  </Button>
                  <Button onClick={() => setAddDialogOpen(true)} disabled={!supplierId}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </div>
            ) : (
              <CatalogTable
                rows={rows}
                selectedIds={selectedIds}
                onToggle={toggleId}
                onToggleAll={toggleAll}
                onEdit={setEditItem}
                onPriceCommit={(item, price) =>
                  setPrice.mutate(
                    {
                      catalogItemId: item.id,
                      supplierId: item.supplier_id,
                      listPrice: price,
                      priceUom: item.price_uom || item.uom_default,
                    },
                    {
                      onError: (err: any) =>
                        toast({ title: 'Price not saved', description: err.message, variant: 'destructive' }),
                    },
                  )
                }
              />
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground font-mono">
              {filters.page * filters.pageSize + 1}–{filters.page * filters.pageSize + rows.length} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 0}
                onClick={() => patchFilters({ page: filters.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                {filters.page + 1}/{pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page + 1 >= pageCount}
                onClick={() => patchFilters({ page: filters.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {selectedIdList.length > 0 && supplierId && (
          <CatalogBulkBar
            count={selectedIdList.length}
            saving={saving}
            onClear={() => setSelectedIds(new Set())}
            onSetCategory={(category) =>
              runBulk(() => bulkUpdate.mutateAsync({ ids: selectedIdList, patch: { category } }), 'Category updated')
            }
            onSetUom={(uom) =>
              runBulk(
                () => bulkUpdate.mutateAsync({ ids: selectedIdList, patch: { uom_default: uom } }),
                'Unit of measure updated',
              )
            }
            onSetPrice={(price, uom) =>
              runBulk(
                () => bulkPrice.mutateAsync({ ids: selectedIdList, supplierId, listPrice: price, priceUom: uom }),
                'Prices updated',
              )
            }
            onSetActive={(active) =>
              runBulk(
                () =>
                  bulkUpdate.mutateAsync({
                    ids: selectedIdList,
                    patch: { is_active: active, discontinued_at: active ? null : new Date().toISOString() },
                  }),
                active ? 'Products activated' : 'Products retired',
              )
            }
          />
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-1">
            <p>
              <strong>Import file:</strong> CSV or Excel, one product per row. Required: <code>sku</code>,{' '}
              <code>description</code>. Recommended: <code>category</code>, <code>uom</code> (EA, LF, SF, BF, CS, PK),{' '}
              <code>list_price</code>, <code>price_uom</code>, <code>manufacturer</code>, <code>dimension</code>,{' '}
              <code>length</code>, <code>lead_time_days</code>, <code>min_order_qty</code>, <code>status</code>.
            </p>
            <p>
              Prices are numbers per <code>price_uom</code> (e.g. 4.85). Also accepted: original_description,
              original_category, supplier_confirmed_price. Rows without a price are imported and flagged as unpriced.
            </p>
          </AlertDescription>
        </Alert>

        {/* CSV Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview Import ({csvPreview.length} items)</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{previewStats.priced} priced</Badge>
              <Badge variant={previewStats.unpriced ? 'destructive' : 'secondary'}>{previewStats.unpriced} need a price</Badge>
              {previewStats.review > 0 && <Badge variant="outline">{previewStats.review} with review notes kept</Badge>}
              {skippedRows.length > 0 && <Badge variant="outline">{skippedRows.length} rows skipped</Badge>}
            </div>
            {(previewStats.unpriced > 0 || previewStats.invalid > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {previewStats.unpriced} product(s) have no confirmed price and will show as unpriced — buyers won’t get
                  an auto-filled price until you add one.
                  {previewStats.invalid > 0 && ` ${previewStats.invalid} price value(s) were not numbers and were ignored.`}
                </AlertDescription>
              </Alert>
            )}
            {skippedRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Skipped: {skippedRows.slice(0, 5).map((s) => `line ${s.line} (${s.reason})`).join(', ')}
                {skippedRows.length > 5 ? '…' : ''}
              </p>
            )}
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
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.slice(0, 20).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.supplier_sku}</TableCell>
                      <TableCell className="text-sm">{row.name || row.description}</TableCell>
                      <TableCell><Badge variant="secondary">{row.category}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[row.dimension, row.thickness, row.length, row.color, row.wood_species]
                          .filter(Boolean)
                          .join(' • ') || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.uom_default}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {row.list_price != null
                          ? `$${row.list_price.toFixed(2)} / ${row.price_uom}`
                          : <span className="text-destructive">Needs price</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvPreview.length > 20 && (
              <p className="text-sm text-muted-foreground text-center">
                … and {csvPreview.length - 20} more items
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Import mode">
              {([
                ['replace', 'Replace catalog', 'Products not in this file are retired and hidden. Past orders keep their history.'],
                ['update', 'Update existing catalog', 'Keep current products; update matching SKUs and add new ones.'],
              ] as const).map(([value, label, help]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={importMode === value}
                  onClick={() => setImportMode(value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${importMode === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                >
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{help}</div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
              <Button onClick={handleUploadConfirm} disabled={uploading}>
                {uploading ? 'Importing…' : importMode === 'replace' ? 'Replace Catalog' : 'Confirm Import'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {supplierId && (
          <AddProductDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            supplierId={supplierId}
            onSaved={refetch}
          />
        )}
        <EditProductDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          item={editItem}
          onSaved={refetch}
        />
      </div>
    </AppLayout>
  );
}
