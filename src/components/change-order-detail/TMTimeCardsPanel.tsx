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
import { Plus, Clock, Check, X, Users, Send } from 'lucide-react';
import { format } from 'date-fns';
import { TimeCardForm } from './TimeCardForm';
import { Input } from '@/components/ui/input';

interface TMTimeCardsPanelProps {
  changeOrderId: string;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
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

export function TMTimeCardsPanel({ changeOrderId, isGC, isTC, isFC }: TMTimeCardsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState('');

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
          fc_submitted_at: null, // Allow FC to resubmit
        } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      toast({ title: 'Time card rejected' });
    },
  });

  // TC set rate
  const setRateMutation = useMutation({
    mutationFn: async ({ cardId, rate }: { cardId: string; rate: number }) => {
      const { error } = await supabase
        .from('tm_time_cards')
        .update({ tc_hourly_rate: rate } as never)
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-time-cards', changeOrderId] });
      setEditingRateId(null);
      toast({ title: 'Rate updated' });
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

  // Filter cards by role visibility
  const visibleCards = timeCards.filter((card) => {
    if (isGC) return !!card.tc_submitted_at; // GC only sees TC-submitted
    if (isTC) return !!card.fc_submitted_at || card.fc_entered_by === user?.id; // TC sees submitted FC cards
    return true; // FC sees all their own
  });

  // Running totals
  const totalManHours = visibleCards.reduce((sum, c) => sum + (c.fc_man_hours || 0) + (c.tc_own_hours || 0), 0);
  const totalCost = visibleCards.reduce((sum, c) => {
    const hours = (c.fc_man_hours || 0) + (c.tc_own_hours || 0);
    return sum + hours * (c.tc_hourly_rate || 0);
  }, 0);
  const acknowledgedCount = visibleCards.filter((c) => c.gc_acknowledged).length;

  const getCardStatus = (card: TimeCard) => {
    if (card.tc_rejection_notes && !card.fc_submitted_at) return 'rejected';
    if (!card.fc_submitted_at) return 'draft';
    if (!card.tc_approved) return 'pending_approval';
    if (!card.tc_submitted_at) return 'approved';
    if (card.gc_acknowledged) return 'acknowledged';
    return 'submitted';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      rejected: { label: 'Rejected', variant: 'destructive' },
      pending_approval: { label: 'Pending Approval', variant: 'outline' },
      approved: { label: 'Approved', variant: 'default' },
      submitted: { label: 'Submitted to GC', variant: 'default' },
      acknowledged: { label: 'Acknowledged', variant: 'default' },
    };
    const s = map[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Cards
          </CardTitle>
          {(isFC || isTC) && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Time Card
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Running Totals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{totalManHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Man-Hours</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </div>
          {isGC && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{acknowledgedCount}/{visibleCards.length}</p>
              <p className="text-xs text-muted-foreground">Acknowledged</p>
            </div>
          )}
          {!isGC && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{visibleCards.length}</p>
              <p className="text-xs text-muted-foreground">Time Cards</p>
            </div>
          )}
        </div>

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
              const status = getCardStatus(card);
              const cardHours = (card.fc_man_hours || 0) + (card.tc_own_hours || 0);
              const cardCost = cardHours * (card.tc_hourly_rate || 0);

              return (
                <div key={card.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isGC && status === 'submitted' && (
                        <Checkbox
                          checked={card.gc_acknowledged}
                          onCheckedChange={(checked) =>
                            acknowledgeMutation.mutate({ cardId: card.id, ack: !!checked })
                          }
                        />
                      )}
                      {isGC && status === 'acknowledged' && (
                        <Checkbox
                          checked={true}
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
                    {(card.tc_own_hours ?? 0) > 0 && (
                      <span className="text-muted-foreground">+ {card.tc_own_hours} TC hrs</span>
                    )}
                    {card.tc_hourly_rate && (
                      <span className="text-muted-foreground">@ ${card.tc_hourly_rate}/hr</span>
                    )}
                    {card.tc_hourly_rate && (
                      <span className="font-semibold">${cardCost.toFixed(2)}</span>
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

                  {/* TC Rate + Submit */}
                  {isTC && card.tc_approved && !card.tc_submitted_at && (
                    <div className="flex items-center gap-2 pt-1">
                      {editingRateId === card.id ? (
                        <>
                          <Input
                            type="number"
                            placeholder="Hourly rate"
                            value={rateValue}
                            onChange={(e) => setRateValue(e.target.value)}
                            className="w-28 h-8"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const rate = parseFloat(rateValue);
                              if (!isNaN(rate) && rate > 0) {
                                setRateMutation.mutate({ cardId: card.id, rate });
                              }
                            }}
                          >
                            Set
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingRateId(card.id);
                            setRateValue(String(card.tc_hourly_rate || ''));
                          }}
                        >
                          {card.tc_hourly_rate ? `$${card.tc_hourly_rate}/hr` : 'Set Rate'}
                        </Button>
                      )}
                      {card.tc_hourly_rate && (
                        <Button size="sm" onClick={() => submitToGCMutation.mutate(card.id)}>
                          <Send className="w-3.5 h-3.5 mr-1" /> Submit to GC
                        </Button>
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
