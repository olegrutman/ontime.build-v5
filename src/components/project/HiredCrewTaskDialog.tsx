import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { BUILDING_TYPES, generateSOVLines } from '@/hooks/useSetupWizardV2';
import type { useCrewTracker } from '@/hooks/useCrewTracker';
import { crewPay } from '@/lib/crewTracker';
import { formatCurrency } from '@/lib/utils';

type Tracker = ReturnType<typeof useCrewTracker>;

/** Tasks from project setup (persisted SOV items first, then generated scope lines). */
export function useSetupTaskSuggestions(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['crew-setup-tasks', projectId],
    enabled,
    queryFn: async () => {
      const [{ data, error }, sov] = await Promise.all([
        supabase.from('project_setup_answers').select('field_key,value').eq('project_id', projectId),
        supabase.from('project_sov_items').select('item_name').eq('project_id', projectId).order('sort_order'),
      ]);
      if (error) throw error;
      if (sov.error) throw sov.error;
      const persisted = [...new Set((sov.data ?? []).map(s => s.item_name).filter((s): s is string => !!s))];
      if (persisted.length) return persisted;
      const answers: Record<string, any> = {};
      for (const row of data ?? []) { let value = row.value; if (typeof value === 'string') { try { value = JSON.parse(value); } catch { } } answers[row.field_key] = value; }
      const saved = answers.scope_selections_v2;
      const merged = saved && typeof saved === 'object' ? { ...answers, ...saved } : answers;
      const building = BUILDING_TYPES.find(b => b.slug === merged.building_type);
      if (!building) return [];
      return [...new Set(generateSOVLines(building.slug, merged).filter(l => !l.byOthers).map(l => l.description))];
    },
  });
}

/** Shared hired-crew task fields. `inline` renders just the fields (for embedding, e.g. inside the budget setup); otherwise a standalone dialog with its own save button. */
export function HiredCrewTaskForm({ tracker, projectId, open, onOpenChange, inline = false }: { tracker: Tracker; projectId: string; open: boolean; onOpenChange: (open: boolean) => void; inline?: boolean }) {
  const [crew, setCrew] = useState('');
  const [task, setTask] = useState('');
  const [basis, setBasis] = useState('sq_ft');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const suggestions = useSetupTaskSuggestions(projectId, open && !!tracker.orgId);
  const save = async () => {
    try {
      await tracker.saveTask.mutateAsync({ crew_name: crew.trim(), task_name: task.trim(), pay_basis: basis, quantity: basis === 'fixed' ? 1 : Number(quantity), rate: Number(rate) });
      onOpenChange(false); setCrew(''); setTask(''); setQuantity(''); setRate('');
    } catch { /* Mutation displays error; keep input. */ }
  };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); await save(); };
  const fields = <>
    <div><Label htmlFor="hired-crew-name">Crew / company name</Label><Input id="hired-crew-name" value={crew} onChange={e => setCrew(e.target.value)} required maxLength={100} /></div>
    <div><Label>Project setup task</Label><Select value={suggestions.data?.includes(task) ? task : 'custom'} onValueChange={v => setTask(v === 'custom' ? '' : v)}><SelectTrigger aria-label="Project setup task"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="custom">Custom task</SelectItem>{suggestions.data?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>{suggestions.error && <p role="alert" className="text-xs text-destructive">Could not load setup tasks. You can enter a task below.</p>}</div>
    <div><Label htmlFor="crew-task-name">Task name</Label><Input id="crew-task-name" value={task} onChange={e => setTask(e.target.value)} required maxLength={300} /></div>
    <div><Label>Payment basis</Label><Select value={basis} onValueChange={setBasis}><SelectTrigger aria-label="Crew payment basis"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sq_ft">Per sq. ft</SelectItem><SelectItem value="unit">Per unit</SelectItem><SelectItem value="fixed">Fixed task price</SelectItem></SelectContent></Select></div>
    <div className="grid gap-3 sm:grid-cols-2">{basis !== 'fixed' && <div><Label htmlFor="crew-task-quantity">{basis === 'sq_ft' ? 'Total sq. ft' : 'Total units'}</Label><Input id="crew-task-quantity" type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required /></div>}<div><Label htmlFor="crew-task-rate">{basis === 'fixed' ? 'Task price' : basis === 'sq_ft' ? 'Price per sq. ft' : 'Price per unit'}</Label><Input id="crew-task-rate" type="number" min="0.01" step="0.01" value={rate} onChange={e => setRate(e.target.value)} required /></div></div>
    <p className="rounded-lg bg-muted p-3 font-mono font-semibold">Task total {formatCurrency(crewPay(Number(rate), basis === 'fixed' ? 1 : Number(quantity)))}</p>
  </>;
  if (inline) return <div className="space-y-4">
    {fields}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" className="min-h-11" onClick={save} disabled={tracker.saveTask.isPending || !crew.trim() || !task.trim() || (basis !== 'fixed' && !(Number(quantity) > 0)) || !(Number(rate) > 0)}>Add task</Button>
      <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => onOpenChange(false)}>Done</Button>
    </div>
  </div>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add hired crew task</DialogTitle><DialogDescription>Private piece-rate or fixed-price work for this job.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={submit}>
      {fields}
      <Button className="w-full" disabled={tracker.saveTask.isPending || !crew.trim() || !task.trim()}>Add task</Button>
    </form>
  </DialogContent></Dialog>;
}

/** Standalone dialog wrapper — used by the Crew Tracker job roll-call. */
export function HiredCrewTaskDialog(props: { tracker: Tracker; projectId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <HiredCrewTaskForm {...props} />;
}
