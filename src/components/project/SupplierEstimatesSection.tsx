import { useState, useCallback } from 'react';
import { FileText, Upload, Send, Trash2, Package, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { EstimateSummaryCard } from '@/components/estimate-summary/EstimateSummaryCard';
import { EstimateUploadWizard } from '@/components/estimate-upload';
import {
  SupplierEstimateItem,
  ESTIMATE_STATUS_LABELS,
  ESTIMATE_STATUS_COLORS,
  SupplierEstimateStatus,
} from '@/types/supplierEstimate';

interface SupplierEstimatesSectionProps {
  projectId: string;
  projectName?: string;
  supplierOrgId: string;
}

interface UploadWizardState {
  open: boolean;
  estimateId: string;
  supplierId: string;
  projectName: string;
  estimateName: string;
}

export function SupplierEstimatesSection({ projectId, projectName, supplierOrgId }: SupplierEstimatesSectionProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [estimateItems, setEstimateItems] = useState<SupplierEstimateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [uploadWizard, setUploadWizard] = useState<UploadWizardState>({
    open: false, estimateId: '', supplierId: '', projectName: '', estimateName: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch the single estimate for this project + supplier
  const { data: estimate, isLoading } = useQuery({
    queryKey: ['supplier-project-estimate', projectId, supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_estimates')
        .select('id, name, status, total_amount, sales_tax_percent, created_at')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!supplierOrgId,
  });

  const fetchEstimateItems = useCallback(async (estimateId: string) => {
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
  }, []);

  const getSupplierId = useCallback(async () => {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', supplierOrgId)
      .limit(1);
    return suppliers?.[0]?.id || '';
  }, [supplierOrgId]);

  const invalidateEstimate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['supplier-project-estimate', projectId, supplierOrgId],
    });
  }, [queryClient, projectId, supplierOrgId]);

  // Auto-create a default estimate and open upload wizard
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('supplier_estimates')
        .insert({
          supplier_org_id: supplierOrgId,
          project_id: projectId,
          name: 'Materials Estimate',
          status: 'DRAFT',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast({ title: 'Success', description: 'Estimate created' });
      invalidateEstimate();
      const sid = await getSupplierId();
      setUploadWizard({
        open: true,
        estimateId: data.id,
        supplierId: sid,
        projectName: projectName || '',
        estimateName: data.name,
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create estimate', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { error } = await supabase
        .from('supplier_estimates')
        .delete()
        .eq('id', estimateId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Estimate deleted' });
      setDeleteConfirmId(null);
      setShowDetail(false);
      invalidateEstimate();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete estimate', variant: 'destructive' });
      setDeleteConfirmId(null);
    },
  });

  const handleOpenDetail = () => {
    if (estimate) {
      setShowDetail(true);
      fetchEstimateItems(estimate.id);
    }
  };

  const handleSubmitEstimate = async () => {
    if (!estimate) return;
    const { error } = await supabase
      .from('supplier_estimates')
      .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
      .eq('id', estimate.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit estimate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Estimate submitted for review' });
      invalidateEstimate();
    }
  };

  const handleUploadClick = async () => {
    if (!estimate) return;
    const sid = await getSupplierId();
    setUploadWizard({
      open: true,
      estimateId: estimate.id,
      supplierId: sid,
      projectName: projectName || '',
      estimateName: estimate.name,
    });
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-3 px-4">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          My Estimate
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        {!estimate ? (
          /* No estimate yet — show create button */
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No estimate for this project yet.</p>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Create Estimate'}
            </Button>
          </div>
        ) : (
          /* Estimate exists — show inline summary */
          <div
            className="cursor-pointer hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors"
            onClick={handleOpenDetail}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <p className="text-base font-medium">{estimate.name}</p>
                <Badge className={ESTIMATE_STATUS_COLORS[estimate.status as SupplierEstimateStatus] || ESTIMATE_STATUS_COLORS.DRAFT}>
                  {ESTIMATE_STATUS_LABELS[estimate.status as SupplierEstimateStatus] || estimate.status}
                </Badge>
              </div>
              <span className="text-sm font-medium">
                ${(estimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {estimate.status === 'DRAFT' && (
              <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Update
                </Button>
                <Button size="sm" onClick={handleSubmitEstimate}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Estimate Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-full sm:max-w-2xl overflow-auto">
          <SheetHeader>
            <SheetTitle>{estimate?.name}</SheetTitle>
          </SheetHeader>

          {estimate && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <Badge className={ESTIMATE_STATUS_COLORS[estimate.status as SupplierEstimateStatus] || ESTIMATE_STATUS_COLORS.DRAFT}>
                  {ESTIMATE_STATUS_LABELS[estimate.status as SupplierEstimateStatus] || estimate.status}
                </Badge>
                <p className="text-lg font-bold">
                  ${(estimate.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {estimate.status === 'DRAFT' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleUploadClick}>
                    <Upload className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                  <Button size="sm" onClick={handleSubmitEstimate} disabled={estimateItems.length === 0}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(estimate.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}

              {loadingItems ? (
                <Skeleton className="h-32 w-full" />
              ) : estimateItems.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No items yet. Upload a file to add line items.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <EstimateSummaryCard
                    items={estimateItems}
                    salesTaxPercent={(estimate as any).sales_tax_percent}
                    estimateId={estimate.id}
                    onTaxUpdate={() => invalidateEstimate()}
                  />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

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
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Wizard */}
      <EstimateUploadWizard
        open={uploadWizard.open}
        onOpenChange={(open) => setUploadWizard(prev => ({ ...prev, open }))}
        estimateId={uploadWizard.estimateId}
        supplierId={uploadWizard.supplierId}
        projectName={uploadWizard.projectName}
        estimateName={uploadWizard.estimateName}
        onComplete={() => {
          if (estimate) {
            fetchEstimateItems(estimate.id);
          }
          invalidateEstimate();
        }}
      />
    </Card>
  );
}
