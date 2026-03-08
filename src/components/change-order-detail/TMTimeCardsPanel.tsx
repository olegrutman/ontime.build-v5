import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Plus, Clock, Check, X, Users, Send, DollarSign, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { TimeCardForm } from './TimeCardForm';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TMTimeCardsPanelProps {
  changeOrderId: string;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  hasTC?: boolean;
}

interface TimeCard {
  id: string;
  change_order_id: string;
  entry_date: string;
  fc_men_count: number | null;
  fc_hours_per_man: number | null;
  fc_man_hours: number | null;
  fc_description: string | null;
  fc_entered_by: string | null;
  fc_submitted_at: string | null;
  tc_approved: boolean;
  tc_approved_by: string | null;
  tc_approved_at: string | null;
  tc_rejection_notes: string | null;
  tc_own_hours: number | null;
  tc_hourly_rate: number | null;
  tc_submitted_at: string | null;
  gc_acknowledged: boolean;
  gc_acknowledged_by: string | null;
  gc_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
}

export function TMTimeCardsPanel({ changeOrderId, isGC, isTC, isFC, hasTC = true }: TMTimeCardsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTCRate, setEditingTCRate] = useState(false);
  const [tcRateValue, setTcRateValue] = useState('');
  const [editingFCRate, setEditingFCRate] = useState(false);
  const [fcRateValue, setFcRateValue] = useState('');

  // Fetch work-order-level hourly rates
  const { data: workOrder } = useQuery({
    queryKey: ['change-order-rate', changeOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_order_projects')
        .select('tc_hourly_rate, fc_hourly_rate')
        .eq('id', changeOrderId)
        .single();
      if (error) throw error;
      return data as { tc_hourly_rate: number | null; fc_hourly_rate: number | null };
    },
    enabled: !!changeOrderId,
  });

  const tcRate = workOrder?.tc_hourly_rate ?? 0;
  const fcRate = workOrder?.fc_hourly_rate ?? 0;

  const { data: timeCards = [], isLoading } = useQuery({
    queryKey: ['tm-time-cards', changeOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_time_cards')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data as unknown as TimeCard[];
    },
    enabled: !!changeOrderId,
  });

  // Update TC rate
  const updateTCRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const { error } = await supabase
        .from('change_order_projects')
        .update({ tc_hourly_rate: rate } as never)
        .eq('id', changeOrderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-rate', changeOrderId] });
      setEditingTCRate(false);
      toast({ title: 'TC hourly rate updated' });
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  // Update FC rate
  const updateFCRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const { error } = await supabase
        .from('change_order_projects')
        .update({ fc_hourly_rate: rate } as never)
        .eq('id', changeOrderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-order-rate', changeOrderId] });
      setEditingFCRate(false);
      toast({ title: 'FC hourly rate updated' });
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  // Create time card
  const createMutation = useMutation({
    mutationFn: async (card: {
      entry_date: string;
      fc_men_count: number;
      fc_hours_per_man: number;
      fc_description: string;
      submit: boolean;
    }) => {
      const { error } = await supabase.from('tm_time_cards').insert({
        change_order_id: changeOrderId,
        entry_date: card.entry_date,
        fc_men_count: card.fc_men_count,
        fc_hours_per_man: card.fc_hours_per_man,
        fc_description: card.fc_description,
        fc_entered_by: user?.id,
        fc_submitted_at: card.submit ? new Date().toISOString() : null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      setShowForm(false);
      toast({ title: 'Time card added' });
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  // TC approve
  const approveMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('tm_time_cards')
        .update({
          tc_approved: true,
          tc_approved_by: user?.id,
          tc_approved_at: new Date().toISOString(),
          tc_rejection_notes: null,
        } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      toast({ title: 'Time card approved' });
    },
  });

  // TC reject
  const rejectMutation = useMutation({
    mutationFn: async ({ cardId, notes }: { cardId: string; notes: string }) => {
      const { error } = await supabase
        .from('tm_time_cards')
        .update({
          tc_approved: false,
          tc_rejection_notes: notes || 'Rejected',
          fc_submitted_at: null,
        } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      toast({ title: 'Time card rejected' });
    },
  });

  // TC submit to GC
  const submitToGCMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('tm_time_cards')
        .update({ tc_submitted_at: new Date().toISOString() } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      toast({ title: 'Submitted to GC' });
    },
  });

  // GC acknowledge
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ cardId, ack }: { cardId: string; ack: boolean }) => {
      const { error } = await supabase
        .from('tm_time_cards')
        .update({
          gc_acknowledged: ack,
          gc_acknowledged_by: ack ? user?.id : null,
          gc_acknowledged_at: ack ? new Date().toISOString() : null,
        } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
    },
  });

  // Finalize T&M — convert hours to fixed labor entries
  const canFinalize = isTC || (isFC && !hasTC);
  const pendingApproval = timeCards.some((c) => !!c.fc_submitted_at && !c.tc_approved && !c.tc_rejection_notes);
  const hasCards = timeCards.length > 0;
  const finalizeDisabled = !hasCards || pendingApproval || tcRate <= 0 || fcRate <= 0;

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const approvedCards = timeCards.filter((c) => !!c.fc_submitted_at);
      const totalFCHours = approvedCards.reduce((sum, c) => sum + (c.fc_man_hours || 0), 0);
      const totalTCOwnHours = approvedCards.reduce((sum, c) => sum + (c.tc_own_hours || 0), 0);
      const totalHoursForGC = totalFCHours + totalTCOwnHours;

      const { error } = await supabase.rpc('finalize_tm_work_order', {
        p_change_order_id: changeOrderId,
        p_fc_hours: totalFCHours,
        p_fc_rate: fcRate,
        p_tc_hours: totalHoursForGC,
        p_tc_rate: tcRate,
        p_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-rate', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-detail', changeOrderId] });
      queryClient.invalidateQueries({ queryKey: ['change-order-project'] });
      toast({ title: 'T&M finalized', description: 'Hours converted to fixed labor entries.' });
    },
    onError: (e) => toast({ variant: 'destructive', title: 'Error finalizing', description: e.message }),
  });

  const visibleCards = timeCards.filter((card) => {
    if (isGC) return !!card.tc_submitted_at;
    if (isFC) return card.fc_entered_by === user?.id;
    if (isTC) return !!card.fc_submitted_at || card.fc_entered_by === user?.id;
    return true;
  });

  // --- Compute totals ---
  // FC totals
  const fcTotalManHours = visibleCards.reduce((sum, c) => sum + (c.fc_man_hours || 0), 0);
  const fcTotalEarnings = fcTotalManHours * fcRate;

  // TC dual counters
  const allFCSubmittedCards = timeCards.filter((c) => !!c.fc_submitted_at);
  const fcToTCHours = allFCSubmittedCards.reduce((sum, c) => sum + (c.fc_man_hours || 0), 0);
  const fcToTCCost = fcToTCHours * fcRate;

  const submittedToGCCards = timeCards.filter((c) => !!c.tc_submitted_at);
  const tcToGCHours = submittedToGCCards.reduce(
    (sum, c) => sum + (c.fc_man_hours || 0) + (c.tc_own_hours || 0),
    0
  );
  const tcToGCCost = tcToGCHours * tcRate;
  const submittedCount = submittedToGCCards.length;
  const totalCardCount = timeCards.filter((c) => !!c.fc_submitted_at || c.fc_entered_by === user?.id).length;

  // GC totals
  const gcTotalHours = visibleCards.reduce(
    (sum, c) => sum + (c.fc_man_hours || 0) + (c.tc_own_hours || 0),
    0
  );
  const gcTotalCost = gcTotalHours * tcRate;
  const acknowledgedCount = visibleCards.filter((c) => c.gc_acknowledged).length;

  const getCardStatus = (card: TimeCard) => {
    if (card.tc_rejection_notes && !card.fc_submitted_at) return 'rejected';
    if (!card.fc_submitted_at) return 'draft';
    if (!card.tc_approved) return 'pending_approval';
    if (!card.tc_submitted_at) return 'approved';
    if (card.gc_acknowledged) return 'acknowledged';
    return 'submitted';
  };

  const getFCStatus = (card: TimeCard) => {
    if (card.tc_rejection_notes && !card.fc_submitted_at) return 'rejected';
    if (!card.fc_submitted_at) return 'draft';
    if (card.tc_approved) return 'approved';
    return 'submitted';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      rejected: { label: 'Rejected', variant: 'destructive' },
      pending_approval: { label: 'Pending Approval', variant: 'outline' },
      approved: { label: 'Approved', variant: 'default' },
      submitted: { label: 'Submitted', variant: 'outline' },
      acknowledged: { label: 'Acknowledged', variant: 'default' },
    };
    const s = map[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Inline rate editor component
  const RateEditor = ({
    label,
    rate,
    editing,
    value,
    onChange,
    onSave,
    onEdit,
    onCancel,
    isPending,
    editable,
  }: {
    label: string;
    rate: number;
    editing: boolean;
    value: string;
    onChange: (v: string) => void;
    onSave: () => void;
    onEdit: () => void;
    onCancel: () => void;
    isPending: boolean;
    editable: boolean;
  }) => (
    <div className="flex items-center gap-3">
      <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      {editing ? (
        <>
          <Input
            type="number"
            placeholder="Rate"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 h-7 text-sm"
          />
          <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={isPending}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{rate > 0 ? `$${rate}/hr` : 'Not set'}</span>
          {editable && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
              {rate > 0 ? 'Edit' : 'Set'}
            </Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <Card data-sasha-card="Time Cards">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Cards
          </CardTitle>
          <div className="flex items-center gap-2">
            {(isFC || isTC) && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Time Card
              </Button>
            )}
            {canFinalize && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={finalizeDisabled || finalizeMutation.isPending}>
                    <Lock className="w-4 h-4 mr-1" /> Finalize T&M
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize T&M Work Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will convert all T&M hours into fixed labor entries and switch this work order to fixed pricing. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => finalizeMutation.mutate()}>
                      Finalize
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rate Editors - hidden from GC */}
        {!isGC && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            {/* FC Rate - editable by FC, read-only for TC */}
            <RateEditor
              label="FC Rate:"
              rate={fcRate}
              editing={editingFCRate}
              value={fcRateValue}
              onChange={setFcRateValue}
              onSave={() => {
                const r = parseFloat(fcRateValue);
                if (!isNaN(r) && r > 0) updateFCRateMutation.mutate(r);
              }}
              onEdit={() => {
                setFcRateValue(fcRate > 0 ? String(fcRate) : '');
                setEditingFCRate(true);
              }}
              onCancel={() => setEditingFCRate(false)}
              isPending={updateFCRateMutation.isPending}
              editable={isFC}
            />
            {/* TC Rate - editable by TC, hidden from FC */}
            {isTC && (
              <RateEditor
                label="TC Rate:"
                rate={tcRate}
                editing={editingTCRate}
                value={tcRateValue}
                onChange={setTcRateValue}
                onSave={() => {
                  const r = parseFloat(tcRateValue);
                  if (!isNaN(r) && r > 0) updateTCRateMutation.mutate(r);
                }}
                onEdit={() => {
                  setTcRateValue(tcRate > 0 ? String(tcRate) : '');
                  setEditingTCRate(true);
                }}
                onCancel={() => setEditingTCRate(false)}
                isPending={updateTCRateMutation.isPending}
                editable={true}
              />
            )}
          </div>
        )}

        {/* Running Totals - role-specific */}
        {isFC && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{fcTotalManHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">My Man-Hours</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {fcRate > 0
                  ? `$${fcTotalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">My Earnings</p>
            </div>
          </div>
        )}

        {isTC && (
          <div className="grid grid-cols-2 gap-3">
            {/* FC to TC */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From Field Crew</p>
              <p className="text-xl font-bold">{fcToTCHours.toFixed(1)} <span className="text-sm font-normal">hrs</span></p>
              <p className="text-sm text-muted-foreground">
                {fcRate > 0
                  ? `$${fcToTCCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'FC rate not set'}
              </p>
            </div>
            {/* TC to GC */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted to GC</p>
              <p className="text-xl font-bold">{tcToGCHours.toFixed(1)} <span className="text-sm font-normal">hrs</span></p>
              <p className="text-sm text-muted-foreground">
                {tcRate > 0
                  ? `$${tcToGCCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'TC rate not set'}
              </p>
              <p className="text-xs text-muted-foreground">{submittedCount} of {totalCardCount} cards submitted</p>
            </div>
          </div>
        )}

        {isGC && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{gcTotalHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Total Man-Hours</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                ${gcTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{acknowledgedCount}/{visibleCards.length}</p>
              <p className="text-xs text-muted-foreground">Acknowledged</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Time Card Form */}
        {showForm && (
          <TimeCardForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        )}

        {/* Time Card List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading time cards...</p>
        ) : visibleCards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No time cards yet. {(isFC || isTC) && 'Click "Add Time Card" to get started.'}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleCards.map((card) => {
              const status = isFC ? getFCStatus(card) : getCardStatus(card);
              const cardHours = isFC
                ? (card.fc_man_hours || 0)
                : (card.fc_man_hours || 0) + (card.tc_own_hours || 0);
              const cardCost = cardHours * tcRate;

              return (
                <div key={card.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isGC && (status === 'submitted' || status === 'acknowledged') && (
                        <Checkbox
                          checked={card.gc_acknowledged}
                          onCheckedChange={(checked) =>
                            acknowledgeMutation.mutate({ cardId: card.id, ack: !!checked })
                          }
                        />
                      )}
                      <div>
                        <p className="font-medium">{format(new Date(card.entry_date), 'MMM d, yyyy')}</p>
                        {card.fc_description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{card.fc_description}</p>
                        )}
                      </div>
                    </div>
                    {statusBadge(status)}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{card.fc_men_count || 0} men × {card.fc_hours_per_man || 0} hrs = <strong>{card.fc_man_hours || 0} man-hrs</strong></span>
                    </div>
                    {/* TC own hours - hidden from FC */}
                    {!isFC && (card.tc_own_hours ?? 0) > 0 && (
                      <span className="text-muted-foreground">+ {card.tc_own_hours} TC hrs</span>
                    )}
                    {/* Rate & cost - hidden from FC */}
                    {!isFC && tcRate > 0 && (
                      <>
                        <span className="text-muted-foreground">@ ${tcRate}/hr</span>
                        <span className="font-semibold">${cardCost.toFixed(2)}</span>
                      </>
                    )}
                  </div>

                  {/* Rejection notes */}
                  {card.tc_rejection_notes && status === 'rejected' && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      Rejection: {card.tc_rejection_notes}
                    </p>
                  )}

                  {/* TC Actions */}
                  {isTC && status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => approveMutation.mutate(card.id)}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const notes = prompt('Rejection reason:');
                          if (notes !== null) rejectMutation.mutate({ cardId: card.id, notes });
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {/* TC Submit to GC */}
                  {isTC && card.tc_approved && !card.tc_submitted_at && (
                    <div className="flex items-center gap-2 pt-1">
                      {tcRate > 0 ? (
                        <Button size="sm" onClick={() => submitToGCMutation.mutate(card.id)}>
                          <Send className="w-3.5 h-3.5 mr-1" /> Submit to GC
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">Set TC rate above before submitting.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
