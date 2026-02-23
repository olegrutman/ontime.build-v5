import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, FileText, Eye, Loader2, Package } from 'lucide-react';

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
  pack_name: string | null;
  catalog_item_id: string | null;
}

interface ProjectEstimatesReviewProps {
  projectId: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function ProjectEstimatesReview({ projectId }: ProjectEstimatesReviewProps) {
  const { user, userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  const [estimates, setEstimates] = useState<SupplierEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<SupplierEstimate | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isResponsible, setIsResponsible] = useState(false);
  const [canViewEstimates, setCanViewEstimates] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [estimateToReject, setEstimateToReject] = useState<string | null>(null);

  // Determine if user's org is the material-responsible party
  useEffect(() => {
    const checkMaterialResponsibility = async () => {
      if (!currentOrgId) {
        setCheckingPermission(false);
        return;
      }

      const { data: contracts } = await supabase
        .from('project_contracts')
        .select('material_responsibility, from_org_id, to_org_id')
        .eq('project_id', projectId)
        .not('material_responsibility', 'is', null);

      if (contracts && contracts.length > 0) {
        // Can approve/reject: only the material-responsible party
        const responsible = contracts.some((c: any) => {
          if (c.material_responsibility === 'GC') return c.to_org_id === currentOrgId;
          if (c.material_responsibility === 'TC') return c.from_org_id === currentOrgId;
          return false;
        });
        setIsResponsible(responsible);

        // Can view estimates + pricing: both GC and TC on the contract
        const canView = contracts.some((c: any) =>
          c.from_org_id === currentOrgId || c.to_org_id === currentOrgId
        );
        setCanViewEstimates(canView);
      }
      setCheckingPermission(false);
    };

    checkMaterialResponsibility();
  }, [projectId, currentOrgId]);

  // Fetch estimates for this project
  useEffect(() => {
    const fetchEstimates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_estimates')
        .select(`
          *,
          supplier_org:organizations!supplier_estimates_supplier_org_id_fkey(id, name, org_code)
        `)
        .eq('project_id', projectId)
        .in('status', ['SUBMITTED', 'APPROVED', 'REJECTED'])
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching estimates:', error);
        toast.error('Failed to load estimates');
      }
      setEstimates(data || []);
      setLoading(false);
    };

    fetchEstimates();
  }, [projectId]);

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

  const refreshEstimates = async () => {
    const { data } = await supabase
      .from('supplier_estimates')
      .select(`
        *,
        supplier_org:organizations!supplier_estimates_supplier_org_id_fkey(id, name, org_code)
      `)
      .eq('project_id', projectId)
      .in('status', ['SUBMITTED', 'APPROVED', 'REJECTED'])
      .order('submitted_at', { ascending: false });
    setEstimates(data || []);
  };

  const handleApprove = async (estimateId: string) => {
    const { data, error } = await supabase
      .from('supplier_estimates')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', estimateId)
      .select();

    if (error) {
      toast.error('Failed to approve estimate: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('Unable to approve estimate — you may not have permission');
      return;
    }

    toast.success('Estimate approved');

    // Update material_estimate_total
    try {
      const { data: approvedEstimates } = await supabase
        .from('supplier_estimates')
        .select('total_amount')
        .eq('project_id', projectId)
        .eq('status', 'APPROVED');

      const totalBudget = (approvedEstimates || []).reduce(
        (sum, est) => sum + (est.total_amount || 0), 0
      );

      await supabase
        .from('project_contracts')
        .update({ material_estimate_total: totalBudget } as any)
        .eq('project_id', projectId)
        .not('material_responsibility', 'is', null);
    } catch (err) {
      console.error('Failed to update material estimate total:', err);
    }

    refreshEstimates();
    if (selectedEstimate?.id === estimateId) {
      setSelectedEstimate(prev => prev ? { ...prev, status: 'APPROVED' } : null);
    }
  };

  const handleReject = async () => {
    if (!estimateToReject) return;

    const { data, error } = await supabase
      .from('supplier_estimates')
      .update({ status: 'REJECTED', notes: rejectReason })
      .eq('id', estimateToReject)
      .select();

    if (error) {
      toast.error('Failed to reject estimate: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('Unable to reject estimate — you may not have permission');
      return;
    }

    toast.success('Estimate rejected');
    setRejectDialogOpen(false);
    setRejectReason('');
    setEstimateToReject(null);
    refreshEstimates();
    if (selectedEstimate?.id === estimateToReject) {
      setSelectedEstimate(prev => prev ? { ...prev, status: 'REJECTED' } : null);
    }
  };

  const openRejectDialog = (estimateId: string) => {
    setEstimateToReject(estimateId);
    setRejectDialogOpen(true);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'APPROVED') return 'bg-green-600';
    return '';
  };

  if (loading || checkingPermission) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No supplier estimates submitted for this project</p>
        </CardContent>
      </Card>
    );
  }

  const submittedEstimates = estimates.filter(e => e.status === 'SUBMITTED');
  const processedEstimates = estimates.filter(e => e.status !== 'SUBMITTED');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: estimate list */}
        <div className="md:col-span-1 space-y-4">
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
                    {estimate.supplier_org?.name}
                  </CardDescription>
                  {canViewEstimates && estimate.total_amount !== null && estimate.total_amount > 0 && (
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formatCurrency(estimate.total_amount)}
                    </p>
                  )}
                </CardHeader>
                {isResponsible && (
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
                )}
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
                      {estimate.supplier_org?.name}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Right column: detail */}
        <div className="md:col-span-2">
          {selectedEstimate ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedEstimate.name}</CardTitle>
                    <CardDescription>
                      Supplier: {selectedEstimate.supplier_org?.name}
                      {canViewEstimates && selectedEstimate.total_amount !== null && selectedEstimate.total_amount > 0 && (
                        <span className="ml-2 font-medium text-foreground">
                          • Total: {formatCurrency(selectedEstimate.total_amount)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {isResponsible && selectedEstimate.status === 'SUBMITTED' && (
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
                  (() => {
                    const grouped = new Map<string, EstimateLineItem[]>();
                    for (const item of lineItems) {
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
                                <span className="text-sm font-semibold">{packName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {packItems.length} items
                                </Badge>
                              </div>
                            )}
                            <div className="border rounded-lg overflow-hidden">
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
                                  {packItems.map(item => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-mono text-sm">
                                        {item.supplier_sku || '-'}
                                      </TableCell>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell className="text-right">{item.quantity ?? '-'}</TableCell>
                                      <TableCell>{item.uom || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
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
  );
}
