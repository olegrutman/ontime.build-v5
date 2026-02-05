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
import { EstimateUploadWizard } from '@/components/estimate-upload';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  pack_name: string;
}

// State for estimate upload wizard
interface UploadWizardState {
  open: boolean;
  estimateId: string;
  supplierId: string;
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

  // CSV upload (legacy)
  const [csvPreview, setCsvPreview] = useState<CSVLineItem[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Pack-aware upload wizard
  const [uploadWizard, setUploadWizard] = useState<UploadWizardState>({
    open: false,
    estimateId: '',
    supplierId: '',
  });

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    fetchEstimateItems(estimate.id);
  };

  const handleDeleteEstimate = async (estimateId: string) => {
    const { error } = await supabase
      .from('supplier_estimates')
      .delete()
      .eq('id', estimateId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete estimate', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Estimate has been deleted' });
      setSelectedEstimate(null);
      fetchEstimates();
    }
    setDeleteConfirmId(null);
  };

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
    const packIdx = headers.findIndex(h => h.includes('pack'));

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
          pack_name: packIdx >= 0 ? cols[packIdx] || '' : '',
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
      pack_name: row.pack_name || null,
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
              <SheetContent className="w-full sm:max-w-2xl overflow-auto">
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

                    {/* Actions */}
                    {selectedEstimate.status === 'DRAFT' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            // Get supplier_id from suppliers table for this org
                            const { data: suppliers } = await supabase
                              .from('suppliers')
                              .select('id')
                              .eq('organization_id', currentOrg?.id)
                              .limit(1);
                            const sid = suppliers?.[0]?.id || '';
                            setUploadWizard({
                              open: true,
                              estimateId: selectedEstimate.id,
                              supplierId: sid,
                            });
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload CSV
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSubmitEstimate}
                          disabled={estimateItems.length === 0}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Review
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmId(selectedEstimate.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
                            No items yet. Upload a CSV to add line items.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Group items by pack_name */}
                        {(() => {
                          const grouped = new Map<string, SupplierEstimateItem[]>();
                          for (const item of estimateItems) {
                            const key = item.pack_name || 'Ungrouped';
                            if (!grouped.has(key)) grouped.set(key, []);
                            grouped.get(key)!.push(item);
                          }
                          const hasMultiplePacks = grouped.size > 1 || (grouped.size === 1 && !grouped.has('Ungrouped'));

                          return (
                            <div className="space-y-4">
                              {Array.from(grouped.entries()).map(([packName, packItems]) => (
                                <div key={packName}>
                                  {hasMultiplePacks && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">{packName}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {packItems.length} items
                                      </Badge>
                                    </div>
                                  )}
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead>UOM</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {packItems.map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-mono text-xs">
                                            {item.supplier_sku || '—'}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <p className="text-sm">{item.description}</p>
                                              {item.catalog_item_id && (
                                                <Badge variant="outline" className="text-[10px] mt-0.5 bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                                                  Catalog matched
                                                </Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right">{item.quantity}</TableCell>
                                          <TableCell>{item.uom}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
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

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure? This will permanently delete this estimate and all its line items. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteConfirmId && handleDeleteEstimate(deleteConfirmId)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Pack-Aware Upload Wizard */}
            <EstimateUploadWizard
              open={uploadWizard.open}
              onOpenChange={(open) => setUploadWizard(prev => ({ ...prev, open }))}
              estimateId={uploadWizard.estimateId}
              supplierId={uploadWizard.supplierId}
              onComplete={() => {
                if (selectedEstimate) {
                  fetchEstimateItems(selectedEstimate.id);
                }
                fetchEstimates();
              }}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
