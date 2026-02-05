import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, FileText, Eye, Loader2 } from 'lucide-react';

interface SupplierEstimate {
  id: string;
  name: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  project_id: string;
  supplier_org_id: string;
  project?: { id: string; name: string } | null;
  supplier_org?: { id: string; name: string; org_code: string } | null;
}

interface EstimateLineItem {
  id: string;
  supplier_sku: string | null;
  description: string;
  quantity: number | null;
  uom: string | null;
  unit_price: number | null;
  line_total: number | null;
  notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function EstimateApprovals() {
  const { user, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [estimates, setEstimates] = useState<SupplierEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<SupplierEstimate | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [estimateToReject, setEstimateToReject] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && currentRole !== 'GC_PM') {
      toast.error('Only GC Project Managers can approve estimates');
      navigate('/dashboard');
    }
  }, [user, currentRole, authLoading, navigate]);

  useEffect(() => {
    if (currentRole === 'GC_PM') {
      fetchEstimates();
    }
  }, [currentRole]);

  const fetchEstimates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_estimates')
      .select(`
        *,
        project:projects(id, name),
        supplier_org:organizations!supplier_estimates_supplier_org_id_fkey(id, name, org_code)
      `)
      .in('status', ['SUBMITTED', 'APPROVED', 'REJECTED'])
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
      setLoading(false);
      return;
    }
    setEstimates(data || []);
    setLoading(false);
  };

  const fetchEstimateDetails = async (estimate: SupplierEstimate) => {
    setSelectedEstimate(estimate);
    setLoadingDetails(true);
    
    const { data: items, error } = await supabase
      .from('supplier_estimate_items')
      .select('*')
      .eq('estimate_id', estimate.id)
      .order('created_at');

    if (error) {
      console.error('Error fetching line items:', error);
      toast.error('Failed to load estimate details');
    }
    
    setLineItems(items || []);
    setLoadingDetails(false);
  };

  const handleApprove = async (estimateId: string) => {
    const { error } = await supabase
      .from('supplier_estimates')
      .update({ 
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', estimateId);

    if (error) {
      toast.error('Failed to approve estimate: ' + error.message);
      return;
    }

    toast.success('Estimate approved');
    fetchEstimates();
    if (selectedEstimate?.id === estimateId) {
      setSelectedEstimate(prev => prev ? { ...prev, status: 'APPROVED' } : null);
    }
  };

  const handleReject = async () => {
    if (!estimateToReject) return;

    const { error } = await supabase
      .from('supplier_estimates')
      .update({ 
        status: 'REJECTED',
        notes: rejectReason,
      })
      .eq('id', estimateToReject);

    if (error) {
      toast.error('Failed to reject estimate: ' + error.message);
      return;
    }

    toast.success('Estimate rejected');
    setRejectDialogOpen(false);
    setRejectReason('');
    setEstimateToReject(null);
    fetchEstimates();
    if (selectedEstimate?.id === estimateToReject) {
      setSelectedEstimate(prev => prev ? { ...prev, status: 'REJECTED' } : null);
    }
  };

  const openRejectDialog = (estimateId: string) => {
    setEstimateToReject(estimateId);
    setRejectDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'APPROVED') return 'bg-green-600';
    return '';
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Estimate Approvals">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'GC_PM') {
    return (
      <AppLayout title="Estimate Approvals">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Only GC Project Managers can approve estimates</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const submittedEstimates = estimates.filter(e => e.status === 'SUBMITTED');
  const processedEstimates = estimates.filter(e => e.status !== 'SUBMITTED');

  return (
    <AppLayout title="Estimate Approvals" subtitle="Review and approve supplier estimates">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pending Approvals */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              Pending Review
              {submittedEstimates.length > 0 && (
                <Badge variant="destructive">{submittedEstimates.length}</Badge>
              )}
            </h2>
            {submittedEstimates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No estimates pending approval
                </CardContent>
              </Card>
            ) : (
              submittedEstimates.map(estimate => (
                <Card 
                  key={estimate.id}
                  className={`cursor-pointer transition-colors ${
                    selectedEstimate?.id === estimate.id ? 'border-primary' : ''
                  }`}
                  onClick={() => fetchEstimateDetails(estimate)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{estimate.name}</CardTitle>
                      <Badge>Pending</Badge>
                    </div>
                    <CardDescription>
                      {estimate.project?.name} • {estimate.supplier_org?.name}
                    </CardDescription>
                    {estimate.total_amount !== null && estimate.total_amount > 0 && (
                      <p className="text-sm font-medium text-foreground mt-1">
                        {formatCurrency(estimate.total_amount)}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); handleApprove(estimate.id); }}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); openRejectDialog(estimate.id); }}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {processedEstimates.length > 0 && (
              <>
                <h2 className="text-base sm:text-lg font-semibold mt-6 sm:mt-8">Previously Reviewed</h2>
                {processedEstimates.map(estimate => (
                  <Card 
                    key={estimate.id}
                    className={`cursor-pointer transition-colors opacity-75 ${
                      selectedEstimate?.id === estimate.id ? 'border-primary opacity-100' : ''
                    }`}
                    onClick={() => fetchEstimateDetails(estimate)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{estimate.name}</CardTitle>
                        <Badge 
                          variant={getStatusBadgeVariant(estimate.status)}
                          className={getStatusBadgeClass(estimate.status)}
                        >
                          {STATUS_LABELS[estimate.status] || estimate.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {estimate.project?.name} • {estimate.supplier_org?.name}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Estimate Details */}
          <div className="lg:col-span-2">
            {selectedEstimate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedEstimate.name}</CardTitle>
                      <CardDescription>
                        Project: {selectedEstimate.project?.name} | 
                        Supplier: {selectedEstimate.supplier_org?.name}
                        {selectedEstimate.total_amount !== null && selectedEstimate.total_amount > 0 && (
                          <span className="ml-2 font-medium text-foreground">
                            • Total: {formatCurrency(selectedEstimate.total_amount)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {selectedEstimate.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <Button onClick={() => handleApprove(selectedEstimate.id)}>
                          <Check className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button variant="destructive" onClick={() => openRejectDialog(selectedEstimate.id)}>
                          <X className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedEstimate.notes && selectedEstimate.status === 'REJECTED' && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm mt-1">{selectedEstimate.notes}</p>
                    </div>
                  )}

                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : lineItems.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">
                                {item.supplier_sku || '-'}
                              </TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity ?? '-'}</TableCell>
                              <TableCell>{item.uom || '-'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.line_total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No line items in this estimate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an estimate to review details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Estimate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide feedback for the supplier..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} className="w-full sm:w-auto">
                Reject Estimate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}