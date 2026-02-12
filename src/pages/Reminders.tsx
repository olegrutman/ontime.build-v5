import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { RemindersTile, AddReminderDialog } from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function Reminders() {
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const { projects, reminders, loading: dataLoading, refetch } = useDashboardData();
  const { toast } = useToast();
  const [addReminderOpen, setAddReminderOpen] = useState(false);

  const currentOrg = userOrgRoles[0]?.organization;

  const handleCompleteReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed: true })
      .eq('id', reminderId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to complete reminder', variant: 'destructive' });
    } else {
      refetch();
    }
  };

  const handleAddReminder = async (reminder: { title: string; due_date: string; project_id?: string }) => {
    if (!user || !currentOrg) return;

    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      org_id: currentOrg.id,
      title: reminder.title,
      due_date: reminder.due_date,
      project_id: reminder.project_id === 'none' ? null : reminder.project_id,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add reminder', variant: 'destructive' });
    } else {
      toast({ title: 'Reminder Added', description: 'Your reminder has been saved.' });
      refetch();
    }
  };

  if (authLoading || dataLoading) {
    return (
      <AppLayout title="Reminders">
        <div className="max-w-2xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reminders">
      <div className="max-w-2xl">
        <RemindersTile
          reminders={reminders}
          onComplete={handleCompleteReminder}
          onAdd={() => setAddReminderOpen(true)}
        />
      </div>

      <AddReminderDialog
        open={addReminderOpen}
        onOpenChange={setAddReminderOpen}
        onAdd={handleAddReminder}
        projects={projects.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.name }))}
      />
    </AppLayout>
  );
}
