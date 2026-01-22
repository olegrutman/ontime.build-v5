import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Package, Lock, Unlock, Eye } from 'lucide-react';
import { 
  ProjectEstimate, 
  EstimatePack, 
  ESTIMATE_STATUS_LABELS,
  EstimateStatus
} from '@/types/estimate';

export default function EstimateApprovals() {
  const { user, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<ProjectEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [estimateToReject, setEstimateToReject] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && currentRole !== 'GC_PM') {
      toast.error('Only GC Project Managers can approve estimates');
      navigate('/');
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
      .from('project_estimates')
      .select(`
        *,
        project:projects(id, name),
        supplier:suppliers(id, name, supplier_code)
      `)
      .in('status', ['SUBMITTED', 'APPROVED', 'REJECTED'])
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching estimates:', error);
      setLoading(false);
      return;
    }
    setEstimates(data || []);
    setLoading(false);
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

  const handleApprove = async (estimateId: string) => {
    const { error } = await supabase
      .from('project_estimates')
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
      .from('project_estimates')
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

  const getStatusBadgeVariant = (status: EstimateStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: EstimateStatus) => {
    if (status === 'APPROVED') return 'bg-green-600';
    return '';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const submittedEstimates = estimates.filter(e => e.status === 'SUBMITTED');
  const processedEstimates = estimates.filter(e => e.status !== 'SUBMITTED');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Estimate Approvals</h1>
          <p className="text-muted-foreground">Review and approve supplier estimates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
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
                  onClick={() => fetchEstimateDetails(estimate.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{estimate.name}</CardTitle>
                      <Badge>Pending</Badge>
                    </div>
                    <CardDescription>
                      {estimate.project?.name} • {estimate.supplier?.name}
                    </CardDescription>
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
                <h2 className="text-lg font-semibold mt-8">Previously Reviewed</h2>
                {processedEstimates.map(estimate => (
                  <Card 
                    key={estimate.id}
                    className={`cursor-pointer transition-colors opacity-75 ${
                      selectedEstimate?.id === estimate.id ? 'border-primary opacity-100' : ''
                    }`}
                    onClick={() => fetchEstimateDetails(estimate.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{estimate.name}</CardTitle>
                        <Badge 
                          variant={getStatusBadgeVariant(estimate.status as EstimateStatus)}
                          className={getStatusBadgeClass(estimate.status as EstimateStatus)}
                        >
                          {ESTIMATE_STATUS_LABELS[estimate.status as EstimateStatus]}
                        </Badge>
                      </div>
                      <CardDescription>
                        {estimate.project?.name} • {estimate.supplier?.name}
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
                        Supplier: {selectedEstimate.supplier?.name}
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
                            <Badge variant="outline" className="ml-auto">
                              {pack.items?.length || 0} items
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
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No packs in this estimate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select an estimate to review details
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Estimate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
