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
import { Plus, Send, FileText, Download, Trash2, Package } from 'lucide-react';
import { PurchaseOrder, PO_STATUS_LABELS, PO_STATUS_COLORS, POStatus } from '@/types/purchaseOrder';

export default function PurchaseOrders() {
  const { user, userOrgRoles, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; supplier_code: string; contact_info?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [workItems, setWorkItems] = useState<{ id: string; title: string; item_type: string; project_id?: string | null }[]>([]);
  const [materialOrders, setMaterialOrders] = useState<{ id: string; work_item: { title: string } | null; ordering_mode: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New PO form
  const [newPOOpen, setNewPOOpen] = useState(false);
  const [poName, setPOName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [selectedMaterialOrderId, setSelectedMaterialOrderId] = useState('');
  const [poNotes, setPONotes] = useState('');
  
  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [sending, setSending] = useState(false);
  
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
    await Promise.all([fetchOrders(), fetchSuppliers(), fetchProjects(), fetchWorkItems(), fetchMaterialOrders()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        organization:organizations(name, org_code),
        supplier:suppliers(id, name, supplier_code, contact_info),
        project:projects(id, name),
        work_item:work_items(id, title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching POs:', error);
      return;
    }
    setOrders((data || []) as unknown as PurchaseOrder[]);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name, supplier_code, contact_info').order('name');
    setSuppliers(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name').order('name');
    setProjects(data || []);
  };

  const fetchWorkItems = async () => {
    const { data } = await supabase.from('work_items').select('id, title, item_type, project_id').order('created_at', { ascending: false });
    setWorkItems(data || []);
  };

  const fetchMaterialOrders = async () => {
    const { data } = await supabase
      .from('material_orders')
      .select('id, ordering_mode, work_item:work_items(title)')
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });
    setMaterialOrders(data || []);
  };

  const fetchPODetails = async (poId: string) => {
    const { data: lineItems } = await supabase
      .from('po_line_items')
      .select('*')
      .eq('po_id', poId)
      .order('line_number');

    const po = orders.find(o => o.id === poId);
    if (po) {
      setSelectedPO({ ...po, line_items: lineItems || [] });
    }
  };

  const handleCreatePO = async () => {
    if (!poName.trim() || !selectedSupplierId || (!selectedProjectId && !selectedWorkItemId)) {
      toast.error('Please fill in required fields');
      return;
    }

    // Generate PO number
    const { data: poNumber } = await supabase.rpc('generate_po_number', { org_id: organizationId });

    const { data: newPO, error } = await supabase
      .from('purchase_orders')
      .insert({
        organization_id: organizationId,
        po_number: poNumber,
        po_name: poName.trim(),
        supplier_id: selectedSupplierId,
        project_id: selectedProjectId || null,
        work_item_id: selectedWorkItemId || null,
        material_order_id: selectedMaterialOrderId || null,
        notes: poNotes.trim() || null,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create PO: ' + error.message);
      return;
    }

    // If linked to a material order, copy items
    if (selectedMaterialOrderId) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', selectedMaterialOrderId);

      if (orderItems && orderItems.length > 0) {
        const lineItems = orderItems.map((item, idx) => ({
          po_id: newPO.id,
          line_number: idx + 1,
          supplier_sku: item.supplier_sku,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          pieces: item.pieces,
          length_ft: item.length_ft,
          computed_bf: item.computed_bf,
          computed_lf: item.computed_lf,
        }));

        await supabase.from('po_line_items').insert(lineItems);
      }
    }

    toast.success(`PO ${poNumber} created`);
    setNewPOOpen(false);
    resetForm();
    fetchOrders();
  };

  const resetForm = () => {
    setPOName('');
    setSelectedSupplierId('');
    setSelectedProjectId('');
    setSelectedWorkItemId('');
    setSelectedMaterialOrderId('');
    setPONotes('');
  };

  const handleSendPO = async () => {
    if (!selectedPO || !supplierEmail.trim()) {
      toast.error('Please enter supplier email');
      return;
    }

    setSending(true);

    const { data, error } = await supabase.functions.invoke('send-po', {
      body: {
        po_id: selectedPO.id,
        supplier_email: supplierEmail.trim(),
      },
    });

    if (error) {
      toast.error('Failed to send PO: ' + error.message);
      setSending(false);
      return;
    }

    toast.success('PO sent to supplier');
    setSending(false);
    setSendDialogOpen(false);
    setSupplierEmail('');
    fetchOrders();
    if (selectedPO) {
      setSelectedPO(prev => prev ? { ...prev, status: 'SUBMITTED' as POStatus } : null);
    }
  };

  const handleDeletePO = async (poId: string) => {
    if (!confirm('Delete this purchase order?')) return;

    const { error } = await supabase.from('purchase_orders').delete().eq('id', poId);

    if (error) {
      toast.error('Failed to delete PO: ' + error.message);
      return;
    }

    toast.success('PO deleted');
    if (selectedPO?.id === poId) {
      setSelectedPO(null);
    }
    fetchOrders();
  };

  const getDownloadUrl = (format: 'pdf' | 'csv') => {
    if (!selectedPO?.download_token) return '';
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/po-download?token=${selectedPO.download_token}&format=${format}`;
  };

  const getStatusBadgeClass = (status: POStatus) => {
    return PO_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Purchase Orders">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Purchase Orders" subtitle="Create and send purchase orders to suppliers">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex justify-end">
          <Dialog open={newPOOpen} onOpenChange={setNewPOOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New PO</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>PO Name *</Label>
                  <Input
                    value={poName}
                    onChange={(e) => setPOName(e.target.value)}
                    placeholder="e.g., 1st Floor Framing Materials"
                  />
                </div>
                <div>
                  <Label>Supplier *</Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setSelectedWorkItemId(''); }}>
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
                <div>
                  <Label>Or Work Item (for Change Work)</Label>
                  <Select value={selectedWorkItemId} onValueChange={(v) => { setSelectedWorkItemId(v); setSelectedProjectId(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work item" />
                    </SelectTrigger>
                    <SelectContent>
                      {workItems.filter(w => w.item_type === 'CHANGE_WORK').map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Import from Approved Material Order</Label>
                  <Select value={selectedMaterialOrderId} onValueChange={setSelectedMaterialOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional - import items" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOrders.map(mo => (
                        <SelectItem key={mo.id} value={mo.id}>
                          {mo.work_item?.title || 'Order'} ({mo.ordering_mode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={poNotes}
                    onChange={(e) => setPONotes(e.target.value)}
                    placeholder="Optional notes for the supplier..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewPOOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePO}>Create PO</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PO List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Orders</h2>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchase orders yet</p>
                </CardContent>
              </Card>
            ) : (
              orders.map(po => (
                <Card 
                  key={po.id}
                  className={`cursor-pointer transition-colors ${selectedPO?.id === po.id ? 'border-primary' : ''}`}
                  onClick={() => fetchPODetails(po.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-mono">{po.po_number}</CardTitle>
                        <CardDescription className="truncate">{po.po_name}</CardDescription>
                      </div>
                      <Badge className={getStatusBadgeClass(po.status as POStatus)}>
                        {PO_STATUS_LABELS[po.status as POStatus]}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {po.supplier?.name} • {po.project?.name || po.work_item?.title}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          {/* PO Details */}
          <div className="lg:col-span-2">
            {selectedPO ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-mono">{selectedPO.po_number}</CardTitle>
                      <CardDescription>{selectedPO.po_name}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedPO.status === 'ACTIVE' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePO(selectedPO.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => {
                            setSupplierEmail(selectedPO.supplier?.contact_info || '');
                            setSendDialogOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </Button>
                        </>
                      )}
                      {selectedPO.status !== 'ACTIVE' && (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <a href={getDownloadUrl('csv')} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              CSV
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={getDownloadUrl('pdf')} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              PDF
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-lg text-sm">
                    <div>
                      <span className="text-muted-foreground">Supplier:</span>
                      <p className="font-medium">{selectedPO.supplier?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project/Work Item:</span>
                      <p className="font-medium">{selectedPO.project?.name || selectedPO.work_item?.title}</p>
                    </div>
                    {selectedPO.submitted_at && (
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">{new Date(selectedPO.submitted_at).toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Total Items:</span>
                      <p className="font-medium">{selectedPO.line_items?.length || 0}</p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  {selectedPO.line_items && selectedPO.line_items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>UOM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.line_items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">{item.line_number}</TableCell>
                            <TableCell className="font-mono text-sm">{item.supplier_sku || '—'}</TableCell>
                            <TableCell>
                              <div>
                                <p>{item.description}</p>
                                {item.length_ft && item.computed_lf && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.pieces || item.quantity} pcs @ {item.length_ft}' = {item.computed_lf} LF
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>{item.uom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No line items</p>
                    </div>
                  )}

                  {selectedPO.notes && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">{selectedPO.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a purchase order to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Send PO Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send PO to Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Supplier Email</Label>
                <Input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  placeholder="supplier@example.com"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The supplier will receive an email with download links for PDF and CSV.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendPO} disabled={sending}>
                {sending ? 'Sending...' : 'Send PO'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
