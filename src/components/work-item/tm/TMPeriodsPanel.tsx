import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Clock } from 'lucide-react';
import { TMPeriod } from './types';
import { TMPeriodCard } from './TMPeriodCard';
import { TMBillableSlices } from './TMBillableSlices';
import { CreatePeriodDialog } from './CreatePeriodDialog';
import { AppRole } from '@/types/organization';

interface TMPeriodsPanelProps {
  workItemId: string;
  currentRole: AppRole | null;
  canViewRates: boolean;
  canSubmitTime?: boolean;
  isWorkItemOpen: boolean;
}

export function TMPeriodsPanel({ workItemId, currentRole, canViewRates, canSubmitTime = true, isWorkItemOpen }: TMPeriodsPanelProps) {
  const [periods, setPeriods] = useState<TMPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFCParticipant, setHasFCParticipant] = useState(true);

  const isTC = currentRole === 'TC_PM';
  const isFS = currentRole === 'FS';
  const isGC = currentRole === 'GC_PM';
  const canCreatePeriod = (isTC || isFS) && isWorkItemOpen;

  useEffect(() => {
    fetchPeriods();
    fetchFCStatus();
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`tm_periods_${workItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_periods',
          filter: `work_item_id=eq.${workItemId}`,
        },
        () => {
          fetchPeriods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workItemId]);

  const fetchFCStatus = async () => {
    // Check if any FC (trade_contractor type org that isn't the TC's own org) is a participant
    const { data } = await supabase
      .from('work_item_participants')
      .select('organization:organizations(id, type)')
      .eq('work_item_id', workItemId);

    if (data) {
      const hasFC = data.some((p: any) => p.organization?.type === 'field_contractor');
      setHasFCParticipant(hasFC);
    }
  };

  const fetchPeriods = async () => {
    setLoading(true);
    
    // GC uses the restricted view that only shows SUBMITTED/APPROVED periods
    if (isGC) {
      const { data, error } = await supabase
        .from('tm_periods_gc')
        .select('*')
        .eq('work_item_id', workItemId)
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching periods:', error);
      } else {
        setPeriods((data || []) as TMPeriod[]);
      }
    } else {
      const { data, error } = await supabase
        .from('tm_periods')
        .select('*')
        .eq('work_item_id', workItemId)
        .order('period_start', { ascending: false });

      if (error) {
        console.error('Error fetching periods:', error);
      } else {
        setPeriods((data || []) as TMPeriod[]);
      }
    }
    setLoading(false);
  };

  // Calculate totals from approved periods
  const approvedPeriods = periods.filter(p => p.status === 'APPROVED');
  const totalBilled = approvedPeriods.reduce((sum, p) => sum + (p.final_amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          T&M Periods
          {approvedPeriods.length > 0 && canViewRates && (
            <span className="text-muted-foreground">
              • {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBilled)} billed
            </span>
          )}
        </h3>
        {canCreatePeriod && (
          <CreatePeriodDialog 
            workItemId={workItemId} 
            existingPeriods={periods}
            onCreated={fetchPeriods} 
          />
        )}
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No periods created yet</p>
          {canCreatePeriod && (
            <p className="text-xs mt-1">Create a daily or weekly period to start tracking hours and materials.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <TMPeriodCard
              key={period.id}
              period={period}
              currentRole={currentRole}
              canViewRates={canViewRates}
              canSubmitTime={canSubmitTime}
              onUpdate={fetchPeriods}
              hasFCParticipant={hasFCParticipant}
            />
          ))}
        </div>
      )}

      {/* Billable Slices Summary */}
      {approvedPeriods.length > 0 && (
        <>
          <Separator />
          <TMBillableSlices 
            workItemId={workItemId} 
            canViewFinancials={canViewRates} 
          />
        </>
      )}
    </div>
  );
}
