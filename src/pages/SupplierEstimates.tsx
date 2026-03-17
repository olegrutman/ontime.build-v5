import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Upload, Send, FileText, Package, Lock, Unlock } from 'lucide-react';
import { SupplierEstimateCatalog } from '@/components/dashboard/supplier/SupplierEstimateCatalog';
import type { EstimateRow } from '@/hooks/useSupplierDashboardData';
import { 
  ProjectEstimate, 
  EstimatePack, 
  PackItem, 
  EstimateCSVRow, 
  parseEstimateCSV,
  PACK_TYPE_LABELS,
  ESTIMATE_STATUS_LABELS,
  EstimateStatus
} from '@/types/estimate';

export default function SupplierEstimates() {
  const { user, currentRole, userOrgRoles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; supplier_code: string }[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<ProjectEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimateRows, setEstimateRows] = useState<EstimateRow[]>([]);
  
  // New estimate form
  const [newEstimateOpen, setNewEstimateOpen] = useState(false);
  const [newEstimateName, setNewEstimateName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  // CSV upload
  const [csvPreview, setCsvPreview] = useState<EstimateCSVRow[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const organizationId = userOrgRoles[0]?.organization_id;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchEstimates(), fetchProjects(), fetchSuppliers(), fetchEstimateOrderRows()]);
    setLoading(false);
  };

  const fetchEstimateOrderRows = async () => {
    if (!organizationId) return;

    // Fetch supplier_estimates for this org
    const { data: supplierEsts } = await supabase
      .from('supplier_estimates')
      .select('id, name, project_id, total_amount, status, projects:project_id(name)')
      .eq('supplier_org_id', organizationId);

    if (!supplierEsts || supplierEsts.length === 0) {
      setEstimateRows([]);
      return;
    }

    const estIds = supplierEsts.map(e => e.id);

    // Fetch items (for pack names) and POs in parallel
    const [itemsRes, posRes] = await Promise.all([
      supabase
        .from('supplier_estimate_items')
        .select('estimate_id, pack_name')
        .in('estimate_id', estIds),
      supabase
        .from('purchase_orders')
        .select('id, source_estimate_id, source_pack_name, po_total, status')
        .in('source_estimate_id', estIds),
    ]);

    const items = itemsRes.data || [];
    const pos = posRes.data || [];

    // Build ordered amounts & pack names per estimate
    const orderedByEst: Record<string, number> = {};
    const orderedPacksByEst: Record<string, Set<string>> = {};
    pos.forEach(po => {
      if (po.source_estimate_id && po.status !== 'ACTIVE') {
        orderedByEst[po.source_estimate_id] = (orderedByEst[po.source_estimate_id] || 0) + (po.po_total || 0);
        if (po.source_pack_name) {
          if (!orderedPacksByEst[po.source_estimate_id]) orderedPacksByEst[po.source_estimate_id] = new Set();
          orderedPacksByEst[po.source_estimate_id].add(po.source_pack_name);
        }
      }
    });

    setEstimateRows(supplierEsts.map((est: any) => {
      const estItems = items.filter(i => i.estimate_id === est.id);
      const packs = [...new Set(estItems.map(i => i.pack_name).filter(Boolean))];
      const orderedAmt = orderedByEst[est.id] || 0;
      const total = est.total_amount || 0;
      return {
        id: est.id,
        name: est.name,
        projectName: est.projects?.name || 'Unknown',
        projectId: est.project_id,
        totalAmount: total,
        lineItemCount: estItems.length,
        packNames: packs as string[],
        orderedPackNames: [...(orderedPacksByEst[est.id] || [])],
        orderedAmount: orderedAmt,
        orderedPercent: total > 0 ? Math.round((orderedAmt / total) * 100) : 0,
        status: est.status,
      };
    }));
  };

  const fetchEstimates = async () => {
    const { data, error } = await supabase
      .from('project_estimates')
      .select(`
        *,
        project:projects(id, name),
        supplier:suppliers(id, name, supplier_code)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching estimates:', error);
      return;
    }
    setEstimates(data || []);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }
    setProjects(data || []);
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, supplier_code')
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      return;
    }
    setSuppliers(data || []);
  };

  const fetchEstimateDetails = async (estimateId: string) => {
    const { data: packs, error: packsError } = await supabase
      .from('estimate_packs')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('sort_order');

    if (packsError) {
      console.error('Error fetching packs:', packsError);
      return;
    }

    const packsWithItems: EstimatePack[] = [];
    for (const pack of packs || []) {
      const { data: items } = await supabase
        .from('pack_items')
        .select('*')
        .eq('pack_id', pack.id)
        .order('created_at');

      packsWithItems.push({
        ...pack,
        items: items || [],
      });
    }

    const estimate = estimates.find(e => e.id === estimateId);
    if (estimate) {
      setSelectedEstimate({
        ...estimate,
        packs: packsWithItems,
      });
    }
  };

  const handleCreateEstimate = async () => {
    if (!newEstimateName.trim() || !selectedProjectId || !selectedSupplierId) {
      toast.error('Please fill in all fields');
      return;
    }

    const { data, error } = await supabase
      .from('project_estimates')
      .insert({
        name: newEstimateName.trim(),
        project_id: selectedProjectId,
        supplier_id: selectedSupplierId,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create estimate: ' + error.message);
      return;
    }

    toast.success('Estimate created');
    setNewEstimateOpen(false);
    setNewEstimateName('');
    setSelectedProjectId('');
    setSelectedSupplierId('');
    fetchEstimates();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseEstimateCSV(text);
      setCsvPreview(rows);
      setUploadDialogOpen(true);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!selectedEstimate || csvPreview.length === 0) return;

    // Group items by pack
    const packGroups = new Map<string, EstimateCSVRow[]>();
    for (const row of csvPreview) {
      const key = `${row.pack_name}|${row.pack_type}`;
      if (!packGroups.has(key)) {
        packGroups.set(key, []);
      }
      packGroups.get(key)!.push(row);
    }

    let sortOrder = 0;
    for (const [key, items] of packGroups) {
      const [packName, packType] = key.split('|');
      
      // Create pack
      const { data: pack, error: packError } = await supabase
        .from('estimate_packs')
        .insert({
          estimate_id: selectedEstimate.id,
          pack_name: packName,
          pack_type: packType as 'LOOSE_MODIFIABLE' | 'ENGINEERED_LOCKED',
          sort_order: sortOrder++,
        })
        .select()
        .single();

      if (packError) {
        toast.error('Failed to create pack: ' + packError.message);
        return;
      }

      // Create items
      const packItems = items.map(item => ({
        pack_id: pack.id,
        supplier_sku: item.supplier_sku,
        description: item.description,
        quantity: item.quantity,
        uom: item.uom,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('pack_items')
        .insert(packItems);

      if (itemsError) {
        toast.error('Failed to create items: ' + itemsError.message);
        return;
      }
    }

    toast.success(`Imported ${csvPreview.length} items into ${packGroups.size} packs`);
    setCsvPreview([]);
    setUploadDialogOpen(false);
    fetchEstimateDetails(selectedEstimate.id);
  };

  const handleSubmitEstimate = async (estimateId: string) => {
    const { error } = await supabase
      .from('project_estimates')
      .update({ 
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', estimateId);

    if (error) {
      toast.error('Failed to submit estimate: ' + error.message);
      return;
    }

    toast.success('Estimate submitted for approval');
    fetchEstimates();
    if (selectedEstimate?.id === estimateId) {
      setSelectedEstimate(prev => prev ? { ...prev, status: 'SUBMITTED' } : null);
    }
  };

  const getStatusBadgeVariant = (status: EstimateStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppLayout>
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Project Estimates</h1>
            <p className="text-muted-foreground">Create and manage pack-based estimates</p>
          </div>
          <Dialog open={newEstimateOpen} onOpenChange={setNewEstimateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Estimate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Estimate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="estimateName">Estimate Name</Label>
                  <Input
                    id="estimateName"
                    value={newEstimateName}
                    onChange={(e) => setNewEstimateName(e.target.value)}
                    placeholder="e.g., Main Building Materials"
                  />
                </div>
                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.supplier_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewEstimateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEstimate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estimate → Orders card */}
        {estimateRows.length > 0 && (
          <div className="mb-6">
            <SupplierEstimateCatalog estimates={estimateRows} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estimates List */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Estimates</h2>
            {estimates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No estimates yet. Create your first estimate.
                </CardContent>
              </Card>
            ) : (
              estimates.map(estimate => (
                <Card 
                  key={estimate.id}
                  className={`cursor-pointer transition-colors ${
                    selectedEstimate?.id === estimate.id ? 'border-primary' : ''
                  }`}
                  onClick={() => fetchEstimateDetails(estimate.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{estimate.name}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(estimate.status as EstimateStatus)}>
                        {ESTIMATE_STATUS_LABELS[estimate.status as EstimateStatus]}
                      </Badge>
                    </div>
                    <CardDescription>
                      {estimate.project?.name} • {estimate.supplier?.name}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          {/* Estimate Details */}
          <div className="md:col-span-2">
            {selectedEstimate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedEstimate.name}</CardTitle>
                      <CardDescription>
                        Project: {selectedEstimate.project?.name} | 
                        Supplier: {selectedEstimate.supplier?.name}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedEstimate.status === 'DRAFT' && (
                        <>
                          <div>
                            <Input
                              type="file"
                              accept=".csv"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="csv-upload"
                            />
                            <Label htmlFor="csv-upload" className="cursor-pointer">
                              <Button variant="outline" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload CSV
                                </span>
                              </Button>
                            </Label>
                          </div>
                          <Button onClick={() => handleSubmitEstimate(selectedEstimate.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Submit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedEstimate.packs && selectedEstimate.packs.length > 0 ? (
                    <div className="space-y-6">
                      {selectedEstimate.packs.map(pack => (
                        <div key={pack.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">{pack.pack_name}</h3>
                            <Badge variant={pack.pack_type === 'ENGINEERED_LOCKED' ? 'secondary' : 'outline'}>
                              {pack.pack_type === 'ENGINEERED_LOCKED' ? (
                                <><Lock className="h-3 w-3 mr-1" /> Locked</>
                              ) : (
                                <><Unlock className="h-3 w-3 mr-1" /> Modifiable</>
                              )}
                            </Badge>
                          </div>
                          {pack.items && pack.items.length > 0 ? (
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
                                {pack.items.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono text-sm">
                                      {item.supplier_sku || '-'}
                                    </TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell>{item.uom}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-muted-foreground text-sm">No items in this pack</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No packs yet. Upload a CSV to add packs and items.</p>
                      <p className="text-sm mt-2">
                        CSV format: pack_name, pack_type, supplier_sku, description, quantity, uom, notes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select an estimate to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* CSV Preview Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Preview Import</DialogTitle>
            </DialogHeader>
            {csvPreview.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {csvPreview.length} items will be imported into{' '}
                  {new Set(csvPreview.map(r => r.pack_name)).size} packs
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pack</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>UOM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.slice(0, 20).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.pack_name}</TableCell>
                        <TableCell>
                          <Badge variant={row.pack_type === 'ENGINEERED_LOCKED' ? 'secondary' : 'outline'}>
                            {row.pack_type === 'ENGINEERED_LOCKED' ? 'Locked' : 'Modifiable'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.supplier_sku || '-'}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>{row.uom}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {csvPreview.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ... and {csvPreview.length - 20} more items
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportCSV}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
