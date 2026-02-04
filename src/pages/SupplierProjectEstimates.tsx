import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  Plus, 
  Send, 
  Trash2, 
  Edit2, 
  ChevronRight,
  Building2,
  Package
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { 
  SupplierProjectEstimate, 
  SupplierEstimateItem,
  ESTIMATE_STATUS_LABELS,
  ESTIMATE_STATUS_COLORS,
  SupplierEstimateStatus
} from '@/types/supplierEstimate';
import { EstimatePDFUpload, EstimateReviewTable, EstimatePackList } from '@/components/estimate';

interface Project {
  id: string;
  name: string;
}

interface CSVLineItem {
  sku: string;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
  notes: string;
}

interface PDFUpload {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface EstimateLineItem {
  id: string;
  estimate_id: string;
  raw_text_line: string | null;
  description: string;
  quantity: number | null;
  uom: string | null;
  pack_name: string;
  status: 'imported' | 'needs_review' | 'matched' | 'unmatched';
  catalog_item_id: string | null;
  sort_order: number;
  catalog_item?: {
    id: string;
    description: string;
    supplier_sku: string | null;
  } | null;
}

export default function SupplierProjectEstimates() {
  const navigate = useNavigate();
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [estimates, setEstimates] = useState<SupplierProjectEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  // Create estimate dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newEstimateName, setNewEstimateName] = useState('');
  const [newEstimateProjectId, setNewEstimateProjectId] = useState('');
  const [creating, setCreating] = useState(false);

  // Estimate detail sheet
  const [selectedEstimate, setSelectedEstimate] = useState<SupplierProjectEstimate | null>(null);
  const [estimateItems, setEstimateItems] = useState<SupplierEstimateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // CSV upload
  const [csvPreview, setCsvPreview] = useState<CSVLineItem[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // PDF upload and line items
  const [pdfUpload, setPdfUpload] = useState<PDFUpload | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('items');

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

    if (isSupplier && currentOrg) {
      fetchProjects();
      fetchEstimates();
    }
  }, [authLoading, isSupplier, currentOrg]);

  const fetchProjects = async () => {
    // Get projects where this org is a participant
    const { data: participations } = await supabase
      .from('project_participants')
      .select('project_id')
      .eq('organization_id', currentOrg?.id)
      .eq('invite_status', 'ACCEPTED');

    if (!participations || participations.length === 0) {
      setProjects([]);
      return;
    }

    const projectIds = participations.map(p => p.project_id);
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)
      .order('name');

    setProjects(projectData || []);
  };

  const fetchEstimates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_estimates')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('supplier_org_id', currentOrg?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching estimates:', error);
    } else {
      setEstimates((data || []) as unknown as SupplierProjectEstimate[]);
    }
    setLoading(false);
  };

  const fetchEstimateItems = async (estimateId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('supplier_estimate_items')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('created_at');

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setEstimateItems((data || []) as unknown as SupplierEstimateItem[]);
    }
    setLoadingItems(false);
  };

  const fetchPDFUpload = async (estimateId: string) => {
    const { data, error } = await supabase
      .from('estimate_pdf_uploads')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setPdfUpload(data as PDFUpload);
    } else {
      setPdfUpload(null);
    }
  };

  const fetchLineItems = async (estimateId: string) => {
    setLoadingLineItems(true);
    const { data, error } = await supabase
      .from('estimate_line_items')
      .select(`
        *,
        catalog_item:catalog_items(id, description, supplier_sku)
      `)
      .eq('estimate_id', estimateId)
      .order('sort_order');

    if (error) {
      console.error('Error fetching line items:', error);
    } else {
      setLineItems((data || []) as unknown as EstimateLineItem[]);
    }
    setLoadingLineItems(false);
  };

  const handleCreateEstimate = async () => {
    if (!newEstimateName.trim() || !newEstimateProjectId) {
      toast({ title: 'Error', description: 'Name and project are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from('supplier_estimates')
      .insert({
        supplier_org_id: currentOrg?.id,
        project_id: newEstimateProjectId,
        name: newEstimateName.trim(),
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      console.error('Create error:', error);
      toast({ title: 'Error', description: 'Failed to create estimate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Estimate created' });
      setShowCreate(false);
      setNewEstimateName('');
      setNewEstimateProjectId('');
      fetchEstimates();
    }
    setCreating(false);
  };

  const handleOpenEstimate = (estimate: SupplierProjectEstimate) => {
    setSelectedEstimate(estimate);
    setActiveTab('items');
    fetchEstimateItems(estimate.id);
    fetchPDFUpload(estimate.id);
    fetchLineItems(estimate.id);
  };

  const handlePDFUploadComplete = () => {
    if (selectedEstimate) {
      fetchPDFUpload(selectedEstimate.id);
    }
  };

  const handleParseComplete = (stats: { total_items: number; matched: number; needs_review: number }) => {
    if (selectedEstimate) {
      fetchLineItems(selectedEstimate.id);
      setActiveTab('review');
    }
  };

  const handleLineItemsChange = () => {
    if (selectedEstimate) {
      fetchLineItems(selectedEstimate.id);
    }
  };

  const handleFinalizeEstimate = async () => {
    if (!selectedEstimate) return;
    // Update status
    await supabase
      .from('supplier_estimates')
      .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
      .eq('id', selectedEstimate.id);
    
    setSelectedEstimate({ ...selectedEstimate, status: 'SUBMITTED' });
    fetchEstimates();
  };

  const handleCreatePOFromPack = (packName: string, packItems: EstimateLineItem[]) => {
    // TODO: Open POWizardV2 with pack items pre-populated
    toast({ 
      title: 'Create PO from Pack', 
      description: `Would create PO for "${packName}" with ${packItems.length} items` 
    });
  };

  // Get supplier ID for the current org
  const [supplierId, setSupplierId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSupplierId = async () => {
      if (!currentOrg) return;
      const { data } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .single();
      if (data) setSupplierId(data.id);
    };
    fetchSupplierId();
  }, [currentOrg]);

  const handleSubmitEstimate = async () => {
    if (!selectedEstimate) return;

    const { error } = await supabase
      .from('supplier_estimates')
      .update({ 
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', selectedEstimate.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit estimate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Estimate submitted for review' });
      setSelectedEstimate({ ...selectedEstimate, status: 'SUBMITTED' });
      fetchEstimates();
    }
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
      toast({ title: 'Invalid CSV', description: 'File must have header and data rows', variant: 'destructive' });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const skuIdx = headers.findIndex(h => h.includes('sku'));
    const descIdx = headers.findIndex(h => h.includes('desc'));
    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
    const uomIdx = headers.findIndex(h => h.includes('uom') || h.includes('unit'));
    const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('cost'));
    const notesIdx = headers.findIndex(h => h.includes('note'));

    if (descIdx === -1) {
      toast({ title: 'Invalid CSV', description: 'CSV must have a Description column', variant: 'destructive' });
      return;
    }

    const rows: CSVLineItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols[descIdx]) {
        rows.push({
          sku: skuIdx >= 0 ? cols[skuIdx] || '' : '',
          description: cols[descIdx] || '',
          quantity: qtyIdx >= 0 ? parseFloat(cols[qtyIdx]) || 1 : 1,
          uom: uomIdx >= 0 ? cols[uomIdx] || 'EA' : 'EA',
          unit_price: priceIdx >= 0 ? parseFloat(cols[priceIdx]) || 0 : 0,
          notes: notesIdx >= 0 ? cols[notesIdx] || '' : '',
        });
      }
    }

    setCsvPreview(rows);
    setShowCsvPreview(true);
  };

  const handleCsvImport = async () => {
    if (!selectedEstimate || csvPreview.length === 0) return;

    const items = csvPreview.map(row => ({
      estimate_id: selectedEstimate.id,
      supplier_sku: row.sku || null,
      description: row.description,
      quantity: row.quantity,
      uom: row.uom,
      unit_price: row.unit_price,
      notes: row.notes || null,
    }));

    const { error } = await supabase
      .from('supplier_estimate_items')
      .insert(items);

    if (error) {
      toast({ title: 'Error', description: 'Failed to import items', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${items.length} items imported` });
      setShowCsvPreview(false);
      setCsvPreview([]);
      fetchEstimateItems(selectedEstimate.id);
      
      // Update total
      const total = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
      await supabase
        .from('supplier_estimates')
        .update({ total_amount: total })
        .eq('id', selectedEstimate.id);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredEstimates = selectedProjectId === 'all'
    ? estimates
    : estimates.filter(e => e.project_id === selectedProjectId);

  if (authLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1">
            <TopBar title="My Estimates" />
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
          <TopBar title="Project Estimates" />
          <main className="flex-1 overflow-auto container mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">My Estimates</h1>
                <p className="text-muted-foreground">
                  Create and submit project estimates for review
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Estimate
                </Button>
              </div>
            </div>

            {/* Estimates List */}
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : filteredEstimates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Estimates</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    Create an estimate to provide pricing for a project.
                  </p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Estimate
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredEstimates.map((estimate) => (
                  <Card 
                    key={estimate.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleOpenEstimate(estimate)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{estimate.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {estimate.project?.name || 'Unknown Project'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            ${(estimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(estimate.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge className={ESTIMATE_STATUS_COLORS[estimate.status as SupplierEstimateStatus]}>
                          {ESTIMATE_STATUS_LABELS[estimate.status as SupplierEstimateStatus]}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Create Estimate Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Estimate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Estimate Name</Label>
                    <Input
                      placeholder="e.g., Phase 1 Materials"
                      value={newEstimateName}
                      onChange={(e) => setNewEstimateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={newEstimateProjectId} onValueChange={setNewEstimateProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEstimate} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Estimate Detail Sheet */}
            <Sheet open={!!selectedEstimate} onOpenChange={() => setSelectedEstimate(null)}>
              <SheetContent className="w-full sm:max-w-4xl overflow-auto">
                <SheetHeader>
                  <SheetTitle>{selectedEstimate?.name}</SheetTitle>
                </SheetHeader>
                
                {selectedEstimate && (
                  <div className="space-y-6 mt-6">
                    {/* Estimate Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={ESTIMATE_STATUS_COLORS[selectedEstimate.status as SupplierEstimateStatus]}>
                          {ESTIMATE_STATUS_LABELS[selectedEstimate.status as SupplierEstimateStatus]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedEstimate.project?.name}
                        </span>
                      </div>
                      <p className="text-lg font-bold">
                        ${(selectedEstimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Tabs for different sections */}
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="review">Review Items</TabsTrigger>
                        <TabsTrigger value="packs">Packs</TabsTrigger>
                        <TabsTrigger value="items">Pricing</TabsTrigger>
                      </TabsList>

                      {/* Upload Tab - PDF Upload */}
                      <TabsContent value="upload" className="space-y-4">
                        <EstimatePDFUpload
                          estimateId={selectedEstimate.id}
                          supplierOrgId={selectedEstimate.supplier_org_id}
                          existingUpload={pdfUpload}
                          onUploadComplete={handlePDFUploadComplete}
                          onParseComplete={handleParseComplete}
                          disabled={selectedEstimate.status !== 'DRAFT'}
                        />
                        
                        {/* Fallback CSV upload */}
                        {selectedEstimate.status === 'DRAFT' && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-3">
                              Or upload pricing data via CSV:
                            </p>
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
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload CSV
                              </Button>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* Review Tab - Line Items from PDF */}
                      <TabsContent value="review" className="space-y-4">
                        {loadingLineItems ? (
                          <Skeleton className="h-32 w-full" />
                        ) : lineItems.length === 0 ? (
                          <Card>
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-sm text-muted-foreground text-center">
                                No items parsed yet. Upload a PDF estimate to get started.
                              </p>
                            </CardContent>
                          </Card>
                        ) : supplierId && (
                          <EstimateReviewTable
                            estimateId={selectedEstimate.id}
                            supplierId={supplierId}
                            projectId={selectedEstimate.project_id}
                            items={lineItems}
                            onItemsChange={handleLineItemsChange}
                            onFinalize={handleFinalizeEstimate}
                            disabled={selectedEstimate.status !== 'DRAFT'}
                          />
                        )}
                      </TabsContent>

                      {/* Packs Tab - Create PO from Pack */}
                      <TabsContent value="packs" className="space-y-4">
                        {lineItems.length === 0 ? (
                          <Card>
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-sm text-muted-foreground text-center">
                                Packs will appear after parsing a PDF estimate.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <EstimatePackList
                            items={lineItems}
                            onCreatePO={handleCreatePOFromPack}
                            disabled={selectedEstimate.status === 'DRAFT'}
                          />
                        )}
                      </TabsContent>

                      {/* Items Tab - Traditional Pricing */}
                      <TabsContent value="items" className="space-y-4">
                        {selectedEstimate.status === 'DRAFT' && (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm"
                              onClick={handleSubmitEstimate}
                              disabled={estimateItems.length === 0 && lineItems.length === 0}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit for Review
                            </Button>
                          </div>
                        )}

                        {/* Line Items */}
                        {loadingItems ? (
                          <Skeleton className="h-32 w-full" />
                        ) : estimateItems.length === 0 ? (
                          <Card>
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No pricing items yet. Upload a CSV to add line items with pricing.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead>UOM</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {estimateItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div>
                                      <p>{item.description}</p>
                                      {item.supplier_sku && (
                                        <p className="text-xs text-muted-foreground font-mono">
                                          {item.supplier_sku}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell>{item.uom}</TableCell>
                                  <TableCell className="text-right">
                                    ${item.unit_price.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${item.line_total.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* CSV Preview Dialog */}
            <Dialog open={showCsvPreview} onOpenChange={setShowCsvPreview}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Preview Import ({csvPreview.length} items)</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.slice(0, 20).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{row.sku || '—'}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell>{row.uom}</TableCell>
                        <TableCell className="text-right">${row.unit_price.toFixed(2)}</TableCell>
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
                  <Button variant="outline" onClick={() => setShowCsvPreview(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCsvImport}>
                    Confirm Import
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
