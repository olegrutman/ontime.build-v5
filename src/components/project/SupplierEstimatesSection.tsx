import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface SupplierEstimatesSectionProps {
  projectId: string;
  supplierOrgId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function SupplierEstimatesSection({ projectId, supplierOrgId }: SupplierEstimatesSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEstimateName, setNewEstimateName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: estimates, isLoading } = useQuery({
    queryKey: ['supplier-project-estimates', projectId, supplierOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_estimates')
        .select('id, name, status, total_amount, created_at')
        .eq('project_id', projectId)
        .eq('supplier_org_id', supplierOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!supplierOrgId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('supplier_estimates')
        .insert({
          supplier_org_id: supplierOrgId,
          project_id: projectId,
          name: name.trim(),
          status: 'DRAFT',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Estimate created' });
      setShowCreate(false);
      setNewEstimateName('');
      queryClient.invalidateQueries({ 
        queryKey: ['supplier-project-estimates', projectId, supplierOrgId] 
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
      queryClient.invalidateQueries({
        queryKey: ['supplier-project-estimates', projectId, supplierOrgId],
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete estimate', variant: 'destructive' });
      setDeleteConfirmId(null);
    },
  });

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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="bg-muted/30 py-3 px-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex-1 cursor-pointer hover:opacity-80 transition-opacity">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  My Estimates
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {estimates?.length || 0} estimate{estimates?.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-4 space-y-2">
            {estimates && estimates.length > 0 ? (
              estimates.map((estimate) => (
                <div
                  key={estimate.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{estimate.name}</p>
                    <Badge className={STATUS_COLORS[estimate.status] || STATUS_COLORS.DRAFT}>
                      {STATUS_LABELS[estimate.status] || estimate.status}
                    </Badge>
                  </div>
                  {estimate.status === 'DRAFT' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(estimate.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No estimates yet</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newEstimateName)}
              disabled={!newEstimateName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </Card>
  );
}
