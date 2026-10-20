import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Users, Receipt, ShieldCheck, Download, Trash2, Pencil, Archive, Camera, Wallet, HardHat, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { useCrewTracker, type CrewSpending } from '@/hooks/useCrewTracker';
import { crewPay, spendingTotals, csvCell, EXPENSE_CATEGORIES, PAY_BASIS, payBasisInfo, presetLabel } from '@/lib/crewTracker';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HiredCrewJobs } from './HiredCrewJobs';
import { useSetupTaskSuggestions } from './HiredCrewTaskDialog';

const blankEntry = (projectId: string, date: string) => ({
  project_id:projectId, entry_date:date, cost_type:'lump_sum', description:'', men_count:null, hours_per_man:null,
  hourly_rate:null, lump_amount:null,total_amount:0,tracker_category:null,tracker_worker_id:null,
   tracker_pay_basis:null,tracker_quantity:null,tracker_receipt_path:null,tracker_work_order_id:null,tracker_job_task_id:null,
});

export function CrewTracker({projectId,onBack}:{projectId:string;onBack:()=>void}) {
  const tracker=useCrewTracker(projectId);
  const [laborView,setLaborView]=useState('workers');
  const [date,setDate]=useState(format(new Date(),'yyyy-MM-dd'));
  const [quantities,setQuantities]=useState<Record<string,string>>({});
  const [workTasks,setWorkTasks]=useState<Record<string,string>>({});
  const taskSuggestions=useSetupTaskSuggestions(projectId,!!tracker.orgId);
  const [workerOpen,setWorkerOpen]=useState(false);
  const [workerId,setWorkerId]=useState<string>();
  const [name,setName]=useState('');
  const [basis,setBasis]=useState('hourly');
  const [rate,setRate]=useState('');
  const [category,setCategory]=useState(EXPENSE_CATEGORIES[0]);
  const [amount,setAmount]=useState('');
  const [note,setNote]=useState('');
  const [order,setOrder]=useState('none');
  const [receipt,setReceipt]=useState<File|null>(null);
  const [saving,setSaving]=useState(false);
  const [remove,setRemove]=useState<CrewSpending|null>(null);
  const [editing,setEditing]=useState<CrewSpending|null>(null);
  const [editValue,setEditValue]=useState('');
  const totals=spendingTotals(tracker.entries);
  const activeWorkers=tracker.workers.filter(w=>w.active&&['hourly','daily'].includes(w.pay_basis));
  const legacyCrews=tracker.workers.filter(w=>w.active&&!['hourly','daily'].includes(w.pay_basis));
  const selected=activeWorkers.filter(w=>!tracker.entries.some(e=>e.tracker_worker_id===w.id&&e.entry_date===date)&&crewPay(Number(w.rate),Number(quantities[w.id]))>0);
  const payTotal=selected.reduce((s,w)=>s+crewPay(Number(w.rate),Number(quantities[w.id])),0);

  const saveLabor=async()=>{
    const entries=selected.map(w=>({...blankEntry(projectId,date),cost_type:w.pay_basis==='hourly'?'hours':'lump_sum',description:w.name,
      tracker_category:'labor',tracker_worker_id:w.id,tracker_pay_basis:w.pay_basis,tracker_quantity:Number(quantities[w.id]),
      hourly_rate:Number(w.rate),men_count:1,hours_per_man:w.pay_basis==='hourly'?Number(quantities[w.id]):null,
      lump_amount:w.pay_basis!=='hourly'?crewPay(Number(w.rate),Number(quantities[w.id])):null,total_amount:crewPay(Number(w.rate),Number(quantities[w.id]))}));
    try {await tracker.saveCosts.mutateAsync(entries);setQuantities({});} catch { /* Mutation displays error; preserve input. */ }
  };
  const saveExpense=async()=>{
    if(!tracker.orgId || Number(amount)<=0) return;
    setSaving(true);let path:string|null=null;
    try {
      if(receipt){
        if(receipt.size>10*1024*1024 || !['image/jpeg','image/png','image/webp','application/pdf'].includes(receipt.type)) throw new Error('Use a JPG, PNG, WebP or PDF receipt under 10 MB');
        path=`${tracker.orgId}/${projectId}/${crypto.randomUUID()}.${receipt.type==='application/pdf'?'pdf':receipt.type.split('/')[1]}`;
        const {error}=await supabase.storage.from('crew-receipts').upload(path,receipt);
        if(error) throw error;
      }
      await tracker.saveCosts.mutateAsync([{...blankEntry(projectId,date),description:note.trim()||category,tracker_category:category,
        lump_amount:Number(amount),total_amount:Number(amount),tracker_receipt_path:path,tracker_work_order_id:order==='none'?null:order}]);
      setAmount('');setNote('');setReceipt(null);setOrder('none');
    } catch(e) {if(path) await supabase.storage.from('crew-receipts').remove([path]);toast.error(e instanceof Error?e.message:'Could not save expense');}
    finally{setSaving(false);}
  };
  const openReceipt=async(path:string)=>{
    const {data,error}=await supabase.storage.from('crew-receipts').createSignedUrl(path,60);
    if(error) {toast.error(error.message);return;}
    if(data) window.open(data.signedUrl,'_blank','noopener,noreferrer');
  };
  const exportCosts=()=>{
    const rows=[['Date','Description','Category','Pay basis','Quantity','Rate','Amount','Work order','Crew task'],...tracker.entries.map(e=>[e.entry_date,e.description,e.tracker_category,e.tracker_job_task_id?'Progress payment':e.tracker_pay_basis,e.tracker_job_task_id?'':e.tracker_quantity,e.tracker_job_task_id?'':e.hourly_rate,e.total_amount,tracker.orders.find(o=>o.id===e.tracker_work_order_id)?.co_number,tracker.tasks.find(t=>t.id===e.tracker_job_task_id)?.task_name])];
    const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='crew-spending.csv';a.click();URL.revokeObjectURL(url);
  };
  if(tracker.loading) return <p role="status" className="py-12 text-muted-foreground">Loading crew spending…</p>;
  if(tracker.error) return <div role="alert"><p>{tracker.error.message}</p><Button variant="outline" onClick={onBack}>Back to overview</Button></div>;
  if(!tracker.orgId) return <p>Only your crew’s accepted projects have a Crew Tracker.</p>;
  const card='min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5';
  const todayCount=tracker.entries.filter(e=>e.entry_date===date).length;
  const kpis:[string,number,string,typeof Wallet][]=[
    ['Total spent',totals.total,`${tracker.entries.length} ${tracker.entries.length===1?'entry':'entries'}`,Wallet],
    ['Labor',totals.labor,`${activeWorkers.length} active ${activeWorkers.length===1?'worker':'workers'}`,HardHat],
    ['Job expenses',totals.expenses,`${tracker.entries.filter(e=>e.tracker_receipt_path).length} receipts`,Receipt],
  ];
  return <section className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><Button variant="ghost" size="sm" onClick={onBack} className="mb-2"><ArrowLeft className="h-4 w-4"/>Overview</Button><h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Crew Tracker</h1>
        <p className="mt-1 inline-flex max-w-full items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary"/><span className="min-w-0 break-words">Private to your crew · never shared with the General Contractor or Subcontractor</span></p></div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label htmlFor="tracker-date" className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-3.5 w-3.5"/>Work date</Label><Input id="tracker-date" type="date" value={date} onChange={e=>setDate(e.target.value)} required className="w-44"/></div>
        <Button variant="outline" onClick={exportCosts} disabled={!tracker.entries.length}><Download className="h-4 w-4"/>Export</Button>
      </div>
    </div>
    <dl className="grid gap-3 sm:grid-cols-3">{kpis.map(([label,value,sub,Icon])=><div key={label} className={card}>
      <div className="flex items-center justify-between gap-2"><dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span></div>
      <dd className="mt-2 break-words font-mono text-2xl font-semibold">{formatCurrency(value)}</dd><p className="text-xs text-muted-foreground">{sub}</p></div>)}</dl>

    <div className="grid gap-5 lg:grid-cols-2">
      <div id="roll-call" className={`${card} space-y-4`}>
        <Tabs value={laborView} onValueChange={setLaborView}><TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger value="workers">Daily workers</TabsTrigger><TabsTrigger value="crews">Hired crews</TabsTrigger></TabsList></Tabs>
        {laborView==='crews'?<><HiredCrewJobs tracker={tracker} projectId={projectId} date={date}/>{legacyCrews.length>0&&<div className="space-y-2 border-t pt-3"><h3 className="font-semibold">Previous piece-rate roster</h3>{legacyCrews.map(w=><p key={w.id} className="break-words text-sm text-muted-foreground">{w.name} · {formatCurrency(Number(w.rate))} / {payBasisInfo(w.pay_basis).per}</p>)}</div>}</>:<>
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h2 className="font-heading text-xl font-semibold uppercase tracking-wide">Daily worker roll-call</h2><p className="text-xs text-muted-foreground">Hourly & daily employee payroll</p></div><Button variant="outline" size="sm" onClick={()=>{setWorkerOpen(true);setWorkerId(undefined);setName('');setRate('');setBasis('hourly');}}><Plus className="h-4 w-4"/>Add worker</Button></div>
        {workerOpen && <form className="grid gap-3 rounded-xl border bg-muted/40 p-3 sm:grid-cols-3" onSubmit={async e=>{e.preventDefault();try{await tracker.saveWorker.mutateAsync({id:workerId,name:name.trim(),pay_basis:basis,rate:Number(rate)});setWorkerOpen(false);}catch{}}}>
          <div><Label htmlFor="worker-name">Worker name</Label><Input id="worker-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} required/></div>
          <div><Label>Pay type</Label><Select value={basis} onValueChange={setBasis}><SelectTrigger aria-label="Pay type"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(PAY_BASIS).filter(([k])=>['hourly','daily'].includes(k)).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="worker-rate">{payBasisInfo(basis).rateLabel}</Label><Input id="worker-rate" type="number" min="0.01" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} required/></div>
          <div className="flex flex-wrap gap-2 sm:col-span-3"><Button type="submit" disabled={tracker.saveWorker.isPending||!name.trim()}>Save worker</Button><Button type="button" variant="ghost" onClick={()=>setWorkerOpen(false)}>Cancel</Button></div>
        </form>}
        {!activeWorkers.length&&!workerOpen&&<div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 h-6 w-6"/>No workers yet. Add your crew once and reuse their rates every day.</div>}
        <div className="space-y-2">{activeWorkers.map(w=>{
          const logged=tracker.entries.find(e=>e.tracker_worker_id===w.id&&e.entry_date===date);
          const pay=logged?Number(logged.total_amount):crewPay(Number(w.rate),Number(quantities[w.id]));
          return <div key={w.id} className={`min-w-0 space-y-3 rounded-xl border p-3 ${logged?'bg-muted/40':''}`}>
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{w.name.trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="break-words font-semibold">{w.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(w.rate))} / {payBasisInfo(w.pay_basis).per}</p></div>
              <p className="shrink-0 font-mono font-semibold">{formatCurrency(pay)}</p>
              <div className="flex shrink-0"><Button variant="ghost" size="icon" aria-label={`Edit ${w.name}`} onClick={()=>{setWorkerId(w.id);setName(w.name);setBasis(w.pay_basis);setRate(String(w.rate));setWorkerOpen(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button variant="ghost" size="icon" aria-label={`Archive ${w.name}`} onClick={()=>tracker.saveWorker.mutate({id:w.id,name:w.name,pay_basis:w.pay_basis,rate:Number(w.rate),active:false})}><Archive className="h-3.5 w-3.5"/></Button></div></div>
            {logged?<p className="text-xs font-medium text-primary">✓ Pay logged for this date</p>:<div className="flex flex-wrap items-center gap-2">{payBasisInfo(w.pay_basis).presets.map(q=><Button key={q} variant={Number(quantities[w.id])===q?'default':'outline'} size="sm" onClick={()=>setQuantities(v=>({...v,[w.id]:String(q)}))}>{presetLabel(w.pay_basis,q)}</Button>)}
              <Input aria-label={`${payBasisInfo(w.pay_basis).qty} for ${w.name}`} placeholder={payBasisInfo(w.pay_basis).qty} className="h-9 w-28" type="number" min="0" step={payBasisInfo(w.pay_basis).step} value={quantities[w.id]??''} onChange={e=>setQuantities(q=>({...q,[w.id]:e.target.value}))}/></div>}
          </div>;
        })}</div>
        {activeWorkers.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3"><div><p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">Pay to save</p><p className="font-mono text-lg font-semibold">{formatCurrency(payTotal)}</p></div><Button onClick={saveLabor} disabled={!selected.length||tracker.saveCosts.isPending||!date}>Save daily pay</Button></div>}
        </>}
      </div>

      <form id="log-expense" className={`${card} space-y-4`} onSubmit={e=>{e.preventDefault();saveExpense();}}>
        <div><h2 className="font-heading text-xl font-semibold uppercase tracking-wide">Log a job expense</h2><p className="text-xs text-muted-foreground">Nails, blades, fuel, rentals, dump runs…</p></div>
        <div><Label htmlFor="expense-amount">Amount</Label><div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">$</span><Input id="expense-amount" className="h-12 pl-7 font-mono text-xl" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required/></div></div>
        <div><Label>Category</Label><div className="mt-2 flex flex-wrap gap-2">{EXPENSE_CATEGORIES.map(c=><Button type="button" key={c} variant={category===c?'default':'outline'} size="sm" onClick={()=>setCategory(c)}>{c}</Button>)}</div></div>
        <div><div className="flex items-center gap-2"><Label htmlFor="expense-note">Note</Label><VoiceInputButton onTranscript={setNote}/></div><Input id="expense-note" placeholder="What did you buy?" value={note} onChange={e=>setNote(e.target.value)} maxLength={500}/></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0"><Label>Work order (optional)</Label><Select value={order} onValueChange={setOrder}><SelectTrigger aria-label="Related work order"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Project expense</SelectItem>{tracker.orders.filter(o=>o.id).map(o=><SelectItem key={o.id} value={o.id??''}>{o.co_number} · {o.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-0"><Label htmlFor="receipt" className="flex items-center gap-2"><Camera className="h-4 w-4"/>Receipt (optional)</Label><Input key={receipt?.name??'empty'} id="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]??null)}/>{receipt&&<p className="break-words text-xs text-muted-foreground">{receipt.name}</p>}</div>
        </div>
        <Button type="submit" className="w-full" disabled={saving||tracker.saveCosts.isPending||!date||!(Number(amount)>0)}><Plus className="h-4 w-4"/>Save expense</Button>
      </form>
    </div>

    <div id="activity" className={`${card} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-xl font-semibold uppercase tracking-wide">Recent activity</h2><span className="text-xs text-muted-foreground">{todayCount} on selected date</span></div>
      {!tracker.entries.length&&<p className="py-6 text-center text-sm text-muted-foreground">No spending logged yet.</p>}
      <div className="divide-y">{tracker.entries.map(e=><div key={e.id} className="flex flex-wrap items-start gap-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{e.tracker_category==='labor'?<HardHat className="h-4 w-4"/>:<Receipt className="h-4 w-4"/>}</span>
        <div className="min-w-0 flex-1 basis-40"><p className="break-words font-semibold">{e.description}</p><p className="break-words text-xs text-muted-foreground">{e.entry_date}{e.tracker_job_task_id?' · Hired crew payment':e.tracker_category==='labor'?` · ${e.tracker_quantity} ${payBasisInfo(e.tracker_pay_basis).qty.toLowerCase()} × ${formatCurrency(Number(e.hourly_rate))}`:''}</p>
          <div className="mt-1 flex flex-wrap gap-1"><span className="rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">{e.tracker_category==='labor'?'Labor':e.tracker_category??'Cost entry'}</span>{e.tracker_work_order_id&&<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] text-primary">{tracker.orders.find(o=>o.id===e.tracker_work_order_id)?.co_number??'Work order'}</span>}</div></div>
        <div className="flex shrink-0 items-center gap-1"><span className="font-mono font-semibold">{formatCurrency(Number(e.total_amount))}</span>{e.tracker_receipt_path&&<Button variant="ghost" size="icon" aria-label="View receipt" onClick={()=>{if(e.tracker_receipt_path) openReceipt(e.tracker_receipt_path);}}><Receipt className="h-4 w-4"/></Button>}{e.tracker_category&&!e.tracker_job_task_id&&<Button variant="ghost" size="icon" aria-label={`Edit entry ${e.description}`} onClick={()=>{setEditing(e);setEditValue(String(e.tracker_category==='labor'?e.tracker_quantity:e.total_amount));}}><Pencil className="h-4 w-4"/></Button>}<Button variant="ghost" size="icon" aria-label={`Delete entry ${e.description}`} onClick={()=>setRemove(e)}><Trash2 className="h-4 w-4"/></Button></div>
      </div>)}</div>
    </div>
    <Dialog open={!!editing} onOpenChange={o=>{if(!o)setEditing(null);}}><DialogContent>{editing&&<form className="space-y-3" onSubmit={async e=>{e.preventDefault();try{await tracker.editCost.mutateAsync({id:editing.id,...(editing.tracker_category==='labor'?{quantity:Number(editValue)}:{amount:Number(editValue)})});setEditing(null);}catch{}}}><DialogHeader><DialogTitle className="break-words">Edit {editing.description}</DialogTitle></DialogHeader><Label htmlFor="edit-cost">{editing.tracker_category==='labor'?payBasisInfo(editing.tracker_pay_basis).qty:'Amount'}</Label><Input id="edit-cost" type="number" min="0.01" step="0.01" value={editValue} onChange={e=>setEditValue(e.target.value)} required/><div className="flex gap-2"><Button disabled={tracker.editCost.isPending}>Save changes</Button><Button type="button" variant="ghost" onClick={()=>setEditing(null)}>Cancel</Button></div></form>}</DialogContent></Dialog>
    <AlertDialog open={!!remove} onOpenChange={open=>{if(!open)setRemove(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this spending entry?</AlertDialogTitle><AlertDialogDescription>This removes the cost and its receipt from your crew tracker.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{if(remove)tracker.deleteCost.mutate(remove);setRemove(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
