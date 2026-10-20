import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Users, Receipt, ShieldCheck, Download, Trash2, Pencil, Archive, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { useCrewTracker, type CrewSpending } from '@/hooks/useCrewTracker';
import { crewPay, spendingTotals, csvCell, EXPENSE_CATEGORIES } from '@/lib/crewTracker';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const blankEntry = (projectId: string, date: string) => ({
  project_id:projectId, entry_date:date, cost_type:'lump_sum', description:'', men_count:null, hours_per_man:null,
  hourly_rate:null, lump_amount:null,total_amount:0,tracker_category:null,tracker_worker_id:null,
  tracker_pay_basis:null,tracker_quantity:null,tracker_receipt_path:null,tracker_work_order_id:null,
});

export function CrewTracker({projectId,onBack}:{projectId:string;onBack:()=>void}) {
  const tracker=useCrewTracker(projectId);
  const [date,setDate]=useState(format(new Date(),'yyyy-MM-dd'));
  const [quantities,setQuantities]=useState<Record<string,string>>({});
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
  const activeWorkers=tracker.workers.filter(w=>w.active);
  const selected=activeWorkers.filter(w=>crewPay(Number(w.rate),Number(quantities[w.id]))>0);
  const payTotal=selected.reduce((s,w)=>s+crewPay(Number(w.rate),Number(quantities[w.id])),0);

  const saveLabor=async()=>{
    const entries=selected.map(w=>({...blankEntry(projectId,date),cost_type:w.pay_basis==='hourly'?'hours':'lump_sum',description:w.name,
      tracker_category:'labor',tracker_worker_id:w.id,tracker_pay_basis:w.pay_basis,tracker_quantity:Number(quantities[w.id]),
      hourly_rate:Number(w.rate),men_count:1,hours_per_man:w.pay_basis==='hourly'?Number(quantities[w.id]):null,
      lump_amount:w.pay_basis==='daily'?crewPay(Number(w.rate),Number(quantities[w.id])):null,total_amount:crewPay(Number(w.rate),Number(quantities[w.id]))}));
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
    const rows=[['Date','Description','Category','Pay basis','Quantity','Rate','Amount','Work order'],...tracker.entries.map(e=>[e.entry_date,e.description,e.tracker_category,e.tracker_pay_basis,e.tracker_quantity,e.hourly_rate,e.total_amount,tracker.orders.find(o=>o.id===e.tracker_work_order_id)?.co_number])];
    const url=URL.createObjectURL(new Blob([rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='crew-spending.csv';a.click();URL.revokeObjectURL(url);
  };
  if(tracker.loading) return <p role="status" className="py-12 text-muted-foreground">Loading crew spending…</p>;
  if(tracker.error) return <div role="alert"><p>{tracker.error.message}</p><Button variant="outline" onClick={onBack}>Back to overview</Button></div>;
  if(!tracker.orgId) return <p>Only your crew’s accepted projects have a Crew Tracker.</p>;
  return <section className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><Button variant="ghost" size="sm" onClick={onBack} className="mb-2"><ArrowLeft className="h-4 w-4"/>Overview</Button><h1 className="font-heading text-3xl font-bold">Crew Tracker</h1><p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0"/>Private to your crew company</p></div>
      <Button variant="outline" onClick={exportCosts} disabled={!tracker.entries.length}><Download className="h-4 w-4"/>Export</Button>
    </div>
    <dl className="grid grid-cols-2 gap-3 border-y py-4 sm:grid-cols-3">{[['Labor',totals.labor],['Expenses',totals.expenses],['Total spent',totals.total]].map(([label,value])=><div key={label} className={label==='Total spent'?'col-span-2 min-w-0 sm:col-span-1':'min-w-0'}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-mono text-xl font-semibold">{formatCurrency(Number(value))}</dd></div>)}</dl>
    <div className="max-w-xs space-y-1"><Label htmlFor="tracker-date">Date</Label><Input id="tracker-date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></div>
    <Tabs defaultValue="labor"><TabsList className="grid w-full max-w-md grid-cols-3"><TabsTrigger value="labor"><Users className="mr-1 h-4 w-4"/>Labor</TabsTrigger><TabsTrigger value="expense"><Receipt className="mr-1 h-4 w-4"/>Expense</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
      <TabsContent value="labor" className="space-y-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading text-xl font-semibold">Daily pay</h2><Button variant="outline" onClick={()=>{setWorkerOpen(true);setWorkerId(undefined);setName('');setRate('');setBasis('hourly');}}><Plus className="h-4 w-4"/>Add worker</Button></div>
        {workerOpen && <form className="grid gap-3 border-y py-4 sm:grid-cols-3" onSubmit={async e=>{e.preventDefault();try{await tracker.saveWorker.mutateAsync({id:workerId,name:name.trim(),pay_basis:basis,rate:Number(rate)});setWorkerOpen(false);}catch{}}}>
          <div><Label htmlFor="worker-name">Worker name</Label><Input id="worker-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} required/></div>
          <div><Label>Pay type</Label><Select value={basis} onValueChange={setBasis}><SelectTrigger aria-label="Pay type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Per day</SelectItem></SelectContent></Select></div>
          <div><Label htmlFor="worker-rate">{basis==='hourly'?'Hourly rate':'Daily rate'}</Label><Input id="worker-rate" type="number" min="0.01" step="0.01" value={rate} onChange={e=>setRate(e.target.value)} required/></div>
          <div className="flex flex-wrap gap-2 sm:col-span-3"><Button type="submit" disabled={tracker.saveWorker.isPending||!name.trim()}>Save worker</Button><Button type="button" variant="ghost" onClick={()=>setWorkerOpen(false)}>Cancel</Button></div>
        </form>}
        {!activeWorkers.length&&!workerOpen&&<p className="py-6 text-muted-foreground">No workers added yet.</p>}
        <div className="divide-y">{activeWorkers.map(w=>{
          const logged=tracker.entries.find(e=>e.tracker_worker_id===w.id&&e.entry_date===date);
          return <div key={w.id} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[1fr_1.5fr_auto]">
            <div className="min-w-0"><p className="break-words font-semibold">{w.name}</p><p className="text-sm text-muted-foreground">{formatCurrency(Number(w.rate))} / {w.pay_basis==='hourly'?'hour':'day'}</p><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${w.name}`} onClick={()=>{setWorkerId(w.id);setName(w.name);setBasis(w.pay_basis);setRate(String(w.rate));setWorkerOpen(true);}}><Pencil className="h-3.5 w-3.5"/></Button><Button variant="ghost" size="icon" aria-label={`Archive ${w.name}`} onClick={()=>tracker.saveWorker.mutate({id:w.id,name:w.name,pay_basis:w.pay_basis,rate:Number(w.rate),active:false})}><Archive className="h-3.5 w-3.5"/></Button></div></div>
            {logged?<p className="self-center text-sm text-muted-foreground">Pay already logged · {formatCurrency(Number(logged.total_amount))}</p>:<div className="space-y-2"><Label htmlFor={`pay-${w.id}`}>{w.pay_basis==='hourly'?'Hours':'Days'}</Label><Input id={`pay-${w.id}`} type="number" min="0" step="0.25" value={quantities[w.id]??''} onChange={e=>setQuantities(q=>({...q,[w.id]:e.target.value}))}/><div className="flex flex-wrap gap-2">{(w.pay_basis==='hourly'?[4,8,10]:[0.5,1]).map(q=><Button key={q} variant={Number(quantities[w.id])===q?'secondary':'outline'} size="sm" onClick={()=>setQuantities(v=>({...v,[w.id]:String(q)}))}>{w.pay_basis==='hourly'?`${q} hrs`:q===1?'Full day':'Half day'}</Button>)}</div></div>}
            <p className="self-center font-mono font-semibold">{formatCurrency(logged?Number(logged.total_amount):crewPay(Number(w.rate),Number(quantities[w.id])))}</p>
          </div>;
        })}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="font-mono font-semibold">Daily pay: {formatCurrency(payTotal)}</p><Button onClick={saveLabor} disabled={!selected.length||tracker.saveCosts.isPending||!date}>Save daily pay</Button></div>
      </TabsContent>
      <TabsContent value="expense" className="max-w-2xl space-y-4 pt-4"><form className="space-y-4" onSubmit={e=>{e.preventDefault();saveExpense();}}>
        <div><Label htmlFor="expense-amount">Amount</Label><Input id="expense-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></div>
        <div><Label>Category</Label><div className="mt-2 flex flex-wrap gap-2">{EXPENSE_CATEGORIES.map(c=><Button type="button" key={c} variant={category===c?'secondary':'outline'} size="sm" onClick={()=>setCategory(c)}>{c}</Button>)}</div></div>
        <div><div className="flex items-center gap-2"><Label htmlFor="expense-note">Note</Label><VoiceInputButton onTranscript={setNote}/></div><Input id="expense-note" placeholder="What did you buy?" value={note} onChange={e=>setNote(e.target.value)} maxLength={500}/></div>
        <div><Label>Related work order (optional)</Label><Select value={order} onValueChange={setOrder}><SelectTrigger aria-label="Related work order"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Project expense</SelectItem>{tracker.orders.filter(o=>o.id).map(o=><SelectItem key={o.id} value={o.id??''}>{o.co_number} · {o.title}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="receipt" className="flex items-center gap-2"><Camera className="h-4 w-4"/>Receipt (optional)</Label><Input key={receipt?.name??'empty'} id="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]??null)} className="mt-2"/>{receipt&&<p className="break-words text-sm text-muted-foreground">{receipt.name}</p>}</div>
        <Button type="submit" disabled={saving||tracker.saveCosts.isPending||!date||!(Number(amount)>0)}>Save expense</Button>
      </form></TabsContent>
      <TabsContent value="history" className="space-y-3 pt-4"><h2 className="font-heading text-xl font-semibold">Spending history</h2>{!tracker.entries.length&&<p className="py-6 text-muted-foreground">No spending logged yet.</p>}<div className="divide-y">{tracker.entries.map(e=><div key={e.id} className="flex flex-wrap items-start gap-3 py-4">
        <div className="min-w-0 flex-1 basis-40"><p className="break-words font-semibold">{e.description}</p><p className="break-words text-sm text-muted-foreground">{e.entry_date} · {e.tracker_category??'Cost entry'}{e.tracker_category==='labor'?` · ${e.tracker_quantity} ${e.tracker_pay_basis==='daily'?'days':'hrs'} × ${formatCurrency(Number(e.hourly_rate))}`:''}</p>{e.tracker_work_order_id&&<p className="break-words text-xs text-muted-foreground">{tracker.orders.find(o=>o.id===e.tracker_work_order_id)?.co_number??'Work order'}</p>}</div>
        <div className="flex shrink-0 items-center gap-1"><span className="font-mono font-semibold">{formatCurrency(Number(e.total_amount))}</span>{e.tracker_receipt_path&&<Button variant="ghost" size="icon" aria-label="View receipt" onClick={()=>{if(e.tracker_receipt_path) openReceipt(e.tracker_receipt_path);}}><Receipt className="h-4 w-4"/></Button>}{e.tracker_category&&<Button variant="ghost" size="icon" aria-label={`Edit entry ${e.description}`} onClick={()=>{setEditing(e);setEditValue(String(e.tracker_category==='labor'?e.tracker_quantity:e.total_amount));}}><Pencil className="h-4 w-4"/></Button>}<Button variant="ghost" size="icon" aria-label={`Delete entry ${e.description}`} onClick={()=>setRemove(e)}><Trash2 className="h-4 w-4"/></Button></div>
      </div>)}</div></TabsContent>
    </Tabs>
    {editing&&<form className="space-y-3 border-y py-4" onSubmit={async e=>{e.preventDefault();try{await tracker.editCost.mutateAsync({id:editing.id,...(editing.tracker_category==='labor'?{quantity:Number(editValue)}:{amount:Number(editValue)})});setEditing(null);}catch{}}}><h2 className="font-semibold break-words">Edit {editing.description}</h2><Label htmlFor="edit-cost">{editing.tracker_category==='labor'?(editing.tracker_pay_basis==='daily'?'Days':'Hours'):'Amount'}</Label><Input id="edit-cost" type="number" min="0.01" step="0.01" value={editValue} onChange={e=>setEditValue(e.target.value)} required/><div className="flex gap-2"><Button disabled={tracker.editCost.isPending}>Save changes</Button><Button type="button" variant="ghost" onClick={()=>setEditing(null)}>Cancel</Button></div></form>}
    <AlertDialog open={!!remove} onOpenChange={open=>{if(!open)setRemove(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this spending entry?</AlertDialogTitle><AlertDialogDescription>This removes the cost and its receipt from your crew tracker.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={()=>{if(remove)tracker.deleteCost.mutate(remove);setRemove(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}