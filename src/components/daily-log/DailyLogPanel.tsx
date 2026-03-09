import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useProjectSchedule } from '@/hooks/useProjectSchedule';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

import { WeatherCard } from './WeatherCard';
import { ManpowerCard } from './ManpowerCard';
import { WorkPerformedCard } from './WorkPerformedCard';
import { SafetyCard } from './SafetyCard';
import { DelaysCard } from './DelaysCard';
import { DeliveriesCard } from './DeliveriesCard';
import { PhotosCard } from './PhotosCard';
import { QuickNotesCard } from './QuickNotesCard';

import type { WeatherData, SafetyIncident } from '@/types/dailyLog';

interface DailyLogPanelProps {
  projectId: string;
}

export function DailyLogPanel({ projectId }: DailyLogPanelProps) {
  const { toast } = useToast();
  const [dateOffset, setDateOffset] = useState(0);
  const logDate = new Date();
  logDate.setDate(logDate.getDate() + dateOffset);
  const dateStr = logDate.toISOString().split('T')[0];

  const {
    log, logLoading, logId, manpower, delays, photos, deliveries,
    updateLog, upsertManpower, upsertDelays, addPhoto, deletePhoto, upsertDeliveries, submitLog,
    isSubmitted,
  } = useDailyLog(projectId, dateStr);

  const { items: scheduleItems, updateItem: updateScheduleItem } = useProjectSchedule(projectId);

  // Fetch project trades from project_team
  const { data: projectTrades = [] } = useQuery({
    queryKey: ['project-trades', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_team')
        .select('org_id, trade, role')
        .eq('project_id', projectId)
        .not('trade', 'is', null);
      return (data || []).map(t => ({ org_id: t.org_id, trade: t.trade || t.role || 'General' }));
    },
    enabled: !!projectId,
  });

  // Auto-save helpers
  const handleWeatherChange = useCallback((weather: WeatherData) => {
    updateLog.mutate({ weather_data: weather as any });
  }, [updateLog]);

  const handleManpowerChange = useCallback((entries: { org_id?: string | null; trade: string; headcount: number }[]) => {
    upsertManpower.mutate(entries);
  }, [upsertManpower]);

  const handleProgressChange = useCallback((itemId: string, progress: number) => {
    updateScheduleItem.mutate({ id: itemId, progress });
  }, [updateScheduleItem]);

  const handleSafetyChange = useCallback((incidents: SafetyIncident[]) => {
    updateLog.mutate({ safety_incidents: incidents as any });
  }, [updateLog]);

  const handleDelaysChange = useCallback((entries: { cause: string; hours_lost: number; notes?: string }[]) => {
    upsertDelays.mutate(entries);
  }, [upsertDelays]);

  const handleNotesChange = useCallback((notes: string) => {
    updateLog.mutate({ notes });
  }, [updateLog]);

  const handleSubmit = () => {
    submitLog.mutate(undefined, {
      onSuccess: () => toast({ title: 'Daily log submitted ✓' }),
    });
  };

  if (logLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Date nav */}
      <div className="flex items-center justify-between bg-card rounded-2xl border p-3">
        <button onClick={() => setDateOffset(d => d - 1)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{format(logDate, 'EEEE, MMM d, yyyy')}</span>
          {isSubmitted && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Submitted</Badge>}
          {!isSubmitted && log && <Badge variant="outline">Draft</Badge>}
        </div>
        <button
          onClick={() => setDateOffset(d => d + 1)}
          disabled={dateOffset >= 0}
          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <WeatherCard
        weather={(log?.weather_data as WeatherData) || {}}
        onChange={handleWeatherChange}
        disabled={isSubmitted}
      />

      <ManpowerCard
        entries={manpower.map(m => ({ org_id: m.org_id, trade: m.trade, headcount: m.headcount }))}
        projectTrades={projectTrades}
        onChange={handleManpowerChange}
        disabled={isSubmitted}
      />

      <WorkPerformedCard
        scheduleItems={scheduleItems}
        onProgressChange={handleProgressChange}
        disabled={isSubmitted}
      />

      <SafetyCard
        incidents={(log?.safety_incidents as SafetyIncident[]) || []}
        onChange={handleSafetyChange}
        disabled={isSubmitted}
      />

      <DeliveriesCard
        deliveries={deliveries.map(d => ({ po_id: d.po_id || '', status: d.status, notes: d.notes }))}
        onChange={(entries) => upsertDeliveries.mutate(entries)}
        disabled={isSubmitted}
      />

      <DelaysCard
        delays={delays.map(d => ({ cause: d.cause, hours_lost: Number(d.hours_lost) }))}
        onChange={handleDelaysChange}
        disabled={isSubmitted}
      />

      <PhotosCard
        photos={photos}
        onAdd={(p) => addPhoto.mutate(p)}
        onDelete={(id) => deletePhoto.mutate(id)}
        disabled={isSubmitted}
      />

      <QuickNotesCard
        notes={log?.notes || ''}
        onChange={handleNotesChange}
        disabled={isSubmitted}
      />

      {/* Submit button */}
      {!isSubmitted && logId && (
        <Button
          onClick={handleSubmit}
          disabled={submitLog.isPending}
          className="w-full h-12 rounded-xl text-base font-semibold"
          size="lg"
        >
          {submitLog.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Submit Daily Log
        </Button>
      )}
    </div>
  );
}
