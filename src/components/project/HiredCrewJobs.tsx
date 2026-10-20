import { useState } from 'react';
import { Plus, HardHat, CheckCircle2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { useCrewTracker } from '@/hooks/useCrewTracker';
import { crewDrawBalance, crewPay } from '@/lib/crewTracker';
import { HiredCrewTaskDialog } from '@/components/project/HiredCrewTaskDialog';
import { formatCurrency } from '@/lib/utils';

type Tracker = ReturnType<typeof useCrewTracker>;
export function HiredCrewJobs({tracker,projectId,date}:{tracker:Tracker;projectId:string;date:string}) {
  const [adding,setAdding]=useState(false);
  const [drawId,setDrawId]=useState<string|null>(null);
  const [percent,setPercent]=useState('');
  const [amount,setAmount]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const drawTask=tracker.tasks.find(t=>t.id===drawId);
  const paidFor=(id:string)=>tracker.entries.filter(e=>e.tracker_job_task_id===id).reduce((s,e)=>s+Number(e.total_amount),0);
  const balance=drawTask?crewDrawBalance(crewPay(Number(drawTask.rate),Number(drawTask.quantity)),Number(percent),paidFor(drawTask.id)):null;
  const total=tracker.tasks.reduce((s,t)=>s+crewPay(Number(t.rate),Number(t.quantity)),0);
  const paid=tracker.tasks.reduce((s,t)=>s+paidFor(t.id),0);
  return <div className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-heading text-xl font-semibold uppercase">Job roll-call</h2><p className="text-sm text-muted-foreground">Hired crews · task progress & payments</p></div>
      <Button size="sm" onClick={()=>setAdding(true)}><Plus className="h-4 w-4"/>Add hired crew task</Button>
    </header>
    <dl className="grid gap-3 sm:grid-cols-3">
      {([['Assigned work',total],['Payments logged',paid],['Unpaid balance',total-paid]] as const).map(([label,value])=><div key={label} className="min-w-0 border-b pb-3"><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-xl font-semibold">{formatCurrency(value)}</dd></div>)}
    </dl>
    {!tracker.tasks.length&&<div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground"><HardHat className="mx-auto mb-2 h-7 w-7"/><p>No hired crew tasks yet</p></div>}
    {tracker.tasks.map(t=>{
      const taskTotal=crewPay(Number(t.rate),Number(t.quantity)), taskPaid=paidFor(t.id), progress=Number(t.completed_percent);
      return <article key={t.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><HardHat className="h-5 w-5"/></span><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{t.crew_name}</h3><p className="break-words text-sm text-muted-foreground">{t.task_name}</p></div>{progress===100&&<CheckCircle2 className="h-5 w-5 shrink-0 text-budget-healthy"/>}</div>
        <p className="break-words text-xs text-muted-foreground">{t.pay_basis==='fixed'?'Fixed task price':`${t.quantity} ${t.pay_basis==='sq_ft'?'sq. ft':'units'} × ${formatCurrency(Number(t.rate))}`}</p>
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{progress}% complete</span><span className="font-mono">{formatCurrency(taskTotal)} task total</span></div>
        <Progress value={progress} className="h-2"/>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="break-words text-sm"><span className="font-mono font-semibold">{formatCurrency(taskPaid)}</span><span className="text-muted-foreground"> paid · {formatCurrency(taskTotal-taskPaid)} unpaid</span></p><Button variant="outline" size="sm" onClick={()=>{setRequestId(crypto.randomUUID());setDrawId(t.id);setPercent(String(progress));setAmount('0');}}><Wallet className="h-4 w-4"/>Update progress / pay</Button></div>
      </article>;
    })}
    <HiredCrewTaskDialog tracker={tracker} projectId={projectId} open={adding} onOpenChange={setAdding}/>
    <Dialog open={!!drawTask} onOpenChange={o=>{if(!o)setDrawId(null);}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="break-words">{drawTask?.crew_name}</DialogTitle><DialogDescription className="break-words">{drawTask?.task_name}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!drawTask)return;try{await tracker.saveDraw.mutateAsync({taskId:drawTask.id,percent:Number(percent),amount:Number(amount),date,requestId});setDrawId(null);}catch{}}}>
        <div><Label htmlFor="crew-progress">Total work completed (%)</Label><Input id="crew-progress" type="number" min="0" max="100" step="0.01" value={percent} onChange={e=>setPercent(e.target.value)} required/></div>
        <div className="flex flex-wrap gap-2">{[25,50,75,100].map(p=><Button type="button" key={p} size="sm" variant={Number(percent)===p?'default':'outline'} onClick={()=>setPercent(String(p))}>{p}%</Button>)}</div>
        <div className="rounded-lg bg-muted p-3 text-sm"><p>Available for payment <span className="font-mono font-semibold">{formatCurrency(balance?.available??0)}</span></p><p className="text-muted-foreground">Payment date · {date}</p></div>
        <div><Label htmlFor="crew-draw-amount">Payment made ($)</Label><Input id="crew-draw-amount" type="number" min="0" max={balance?.available??0} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></div>
        <Button type="button" variant="outline" size="sm" onClick={()=>setAmount(String(balance?.available??0))}>Use available amount</Button>
        <Button className="w-full" disabled={tracker.saveDraw.isPending||!date||Number(amount)>(balance?.available??0)||Number(percent)<0||Number(percent)>100}>Save progress & payment</Button>
      </form>
    </DialogContent></Dialog>
  </div>;
}
