import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useReturnPricingVisibility } from '@/hooks/useReturnPricingVisibility';
import { Return, ReturnItem, ReturnStatus, RETURN_STATUS_LABELS, UrgencyType, URGENCY_COLORS } from '@/types/return';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import { ReturnPricingPanel } from './ReturnPricingPanel';
import { ReturnSupplierReview } from './ReturnSupplierReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Send, CalendarCheck, Package, Download, Loader2, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useNudge } from '@/hooks/useNudge';

interface ReturnDetailProps {
  returnId: string;
  projectId: string;
  onBack: () => void;
}

export function ReturnDetail({ returnId, projectId, onBack }: ReturnDetailProps) {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userOrgId = userOrgRoles[0]?.organization?.id || null;
  const isSupplier = userOrgRoles[0]?.organization?.type === 'SUPPLIER';
  const { sendNudge, loading: nudgeLoading, wasSent } = useNudge();

  const { data: returnData, isLoading } = useQuery({
    queryKey: ['return-detail', returnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_items(*),
          supplier_org:supplier_org_id(id, name),
          created_by_org:created_by_org_id(id, name)
        `)
        .eq('id', returnId)
        .single();
      if (error) throw error;
      return data as unknown as Return;
    },
  });

  const pricing = useReturnPricingVisibility(returnData || null, userOrgId);

  const isCreatorOrg = returnData?.created_by_org_id === userOrgId;
  const isSupplierOrg = returnData?.supplier_org_id === userOrgId;

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async ({ newStatus, extraFields }: { newStatus: ReturnStatus; extraFields?: Record<string, any> }) => {
      const update: Record<string, any> = { status: newStatus, ...extraFields };
      if (newStatus === 'CLOSED') update.closed_at = new Date().toISOString();
      const { error } = await supabase.from('returns').update(update).eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-detail', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Return updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('returns').delete().eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Return deleted' });
      onBack();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Scheduling fields
  const [pickupDate, setPickupDate] = useState('');
  useEffect(() => {
    if (returnData?.pickup_date) setPickupDate(returnData.pickup_date);
  }, [returnData?.pickup_date]);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('returns').update({
        pickup_date: pickupDate,
        status: 'SCHEDULED',
      }).eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-detail', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', projectId] });
      toast({ title: 'Pickup scheduled' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const [downloading, setDownloading] = useState(false);
  const handleDownloadMemo = async () => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/return-credit-memo?return_id=${returnId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to generate credit memo');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${returnData?.return_number || 'Return'}-Credit-Memo.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !returnData) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const items = (returnData.return_items || []) as ReturnItem[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{returnData.return_number}</h2>
            <ReturnStatusBadge status={returnData.status} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {returnData.reason}{returnData.wrong_type ? ` – ${returnData.wrong_type}` : ''}
              {returnData.reason_notes ? ` • ${returnData.reason_notes}` : ''}
            </p>
            {returnData.urgency && returnData.urgency !== 'Standard' && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${URGENCY_COLORS[returnData.urgency as UrgencyType] || ''}`}>
                {returnData.urgency}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Logistics card */}
      {(returnData.pickup_type || returnData.contact_name) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Logistics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {returnData.pickup_type && <p><span className="text-muted-foreground">Pickup:</span> {returnData.pickup_type}</p>}
            {returnData.pickup_date && <p><span className="text-muted-foreground">Date:</span> {format(new Date(returnData.pickup_date), 'MMM d, yyyy')}</p>}
            {returnData.contact_name && <p><span className="text-muted-foreground">Contact:</span> {returnData.contact_name} {returnData.contact_phone ? `• ${returnData.contact_phone}` : ''}</p>}
            {returnData.instructions && <p><span className="text-muted-foreground">Instructions:</span> {returnData.instructions}</p>}
          </CardContent>
        </Card>
      )}

      {/* Line items table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16">Reason</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-20">UOM</TableHead>
                  <TableHead className="w-28">Condition</TableHead>
                  <TableHead className="w-24">Returnable</TableHead>
                  {pricing.canViewPricing && (
                    <>
                      <TableHead className="w-24 text-right">Orig. Price</TableHead>
                      <TableHead className="w-24 text-right">Unit Credit</TableHead>
                      <TableHead className="w-24 text-right">Line Total</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.description_snapshot}</TableCell>
                    <TableCell className="text-xs">{item.reason || '—'}</TableCell>
                    <TableCell>
                      {item.accepted_qty != null && item.accepted_qty !== item.qty_requested
                        ? <span>{item.accepted_qty} <span className="text-muted-foreground text-[10px]">/ {item.qty_requested}</span></span>
                        : item.qty_requested
                      }
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>
                      <span className="text-xs">{item.condition}</span>
                      {item.condition_notes && (
                        <p className="text-[10px] text-muted-foreground">{item.condition_notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.returnable_flag === 'Yes' ? 'default' :
                        item.returnable_flag === 'No' ? 'destructive' : 'secondary'
                      } className="text-[10px]">
                        {item.returnable_flag}
                      </Badge>
                      {item.nonreturnable_reason && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.nonreturnable_reason}</p>
                      )}
                    </TableCell>
                    {pricing.canViewPricing && (
                      <>
                        <TableCell className="text-right text-sm">
                          {item.original_unit_price ? `$${Number(item.original_unit_price).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.credit_unit_price ? `$${item.credit_unit_price.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.credit_line_total ? `$${item.credit_line_total.toFixed(2)}` : '—'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      {pricing.canViewPricing && ['APPROVED', 'SCHEDULED', 'PICKED_UP', 'PRICED', 'CLOSED'].includes(returnData.status) && (
        <Card>
          <CardContent className="p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credit Subtotal</span>
              <span>${returnData.credit_subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Restocking Fee ({returnData.restocking_type === 'Percent' ? `${returnData.restocking_value}%` : returnData.restocking_type === 'Flat' ? 'Flat' : 'None'})
              </span>
              <span className="text-destructive">-${returnData.restocking_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Net Credit</span>
              <span className="text-emerald-700 dark:text-emerald-400">${returnData.net_credit_total.toFixed(2)}</span>
            </div>
            {!['PRICED', 'CLOSED'].includes(returnData.status) && (
              <p className="text-[10px] text-muted-foreground text-right">(subject to final pricing adjustment)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supplier Review panel */}
      {isSupplierOrg && returnData.status === 'SUPPLIER_REVIEW' && (
        <ReturnSupplierReview
          returnId={returnId}
          items={items}
          projectId={projectId}
        />
      )}

      {/* Supplier Pricing panel */}
      {pricing.canEditPricing && returnData.status === 'PICKED_UP' && (
        <ReturnPricingPanel
          returnId={returnId}
          items={items}
          projectId={projectId}
        />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Creator: Submit (DRAFT) */}
        {isCreatorOrg && returnData.status === 'DRAFT' && (
          <>
            <Button
              size="sm"
              onClick={() => statusMutation.mutate({ newStatus: 'SUBMITTED' })}
              disabled={statusMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" /> Submit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </>
        )}

        {/* Supplier: Begin Review (SUBMITTED) */}
        {isSupplierOrg && returnData.status === 'SUBMITTED' && (
          <Button
            size="sm"
            onClick={() => statusMutation.mutate({ newStatus: 'SUPPLIER_REVIEW' })}
            disabled={statusMutation.isPending}
          >
            Begin Review
          </Button>
        )}

        {/* Creator: Schedule Pickup (APPROVED) */}
        {isCreatorOrg && returnData.status === 'APPROVED' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={pickupDate}
              onChange={e => setPickupDate(e.target.value)}
              className="w-40 h-9"
            />
            <Button
              size="sm"
              onClick={() => scheduleMutation.mutate()}
              disabled={!pickupDate || scheduleMutation.isPending}
            >
              <CalendarCheck className="h-4 w-4 mr-1" /> Schedule Pickup
            </Button>
          </div>
        )}

        {/* Supplier: Mark Picked Up (SCHEDULED) */}
        {isSupplierOrg && returnData.status === 'SCHEDULED' && (
          <Button
            size="sm"
            onClick={() => statusMutation.mutate({ newStatus: 'PICKED_UP' })}
            disabled={statusMutation.isPending}
          >
            <Package className="h-4 w-4 mr-1" /> Mark Picked Up
          </Button>
        )}

        {/* Creator/Pricing owner: Close Return (PRICED) */}
        {pricing.canCloseReturn && returnData.status === 'PRICED' && (
          <Button
            size="sm"
            onClick={() => statusMutation.mutate({ newStatus: 'CLOSED' })}
            disabled={statusMutation.isPending}
          >
            Close Return
          </Button>
        )}

        {/* Download credit memo (PRICED or CLOSED) */}
        {pricing.canViewPricing && ['PRICED', 'CLOSED'].includes(returnData.status) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadMemo}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Credit Memo
          </Button>
        )}
      </div>
    </div>
  );
}
