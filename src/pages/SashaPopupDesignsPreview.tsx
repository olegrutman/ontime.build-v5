import { ArrowRight, ClipboardList, FileText, GraduationCap, Mic, Receipt, Send, Sparkles, X, Hammer, PlayCircle } from 'lucide-react';
import sashaAvatar from '@/assets/sasha-avatar.png';

const Avatar = ({ size = 'h-9 w-9' }: { size?: string }) => (
  <img src={sashaAvatar} alt="Sasha" className={`${size} rounded-full object-cover ring-2 ring-primary/40`} />
);

function Label({ n, title, from }: { n: number; title: string; from: string }) {
  return (
    <div className="mb-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Idea {n} · inspired by {from}</p>
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
    </div>
  );
}

/* 1 — Navy command header (Intercom Fin / Procore Copilot) */
function DesignOne() {
  return (
    <div className="w-[380px] h-[560px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
      <div className="bg-sidebar px-4 pt-4 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><Avatar /><div><p className="font-semibold leading-tight">Sasha</p><p className="text-[0.7rem] text-white/60">Knows this page · Dashboard</p></div></div>
          <X className="h-4 w-4 text-white/70" />
        </div>
        <p className="mt-4 font-heading text-xl font-bold">Hi Oleg — what do you need?</p>
      </div>
      <div className="-mt-3 mx-3 rounded-xl border border-border bg-card p-1.5 shadow-md">
        {[{i: GraduationCap, t: 'Guide me through this page', s: '8 steps · nothing gets saved'}, {i: ClipboardList, t: 'Explain change orders', s: 'Plain-English answer'}, {i: Receipt, t: 'What needs my attention?', s: '1 project needs attention'}].map(({i: I, t, s}) => (
          <div key={t} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted">
            <I className="h-5 w-5 text-primary" /><div className="flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">{s}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 border-t border-border p-3">
        <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><Mic className="h-4 w-4" /></button>
        <div className="flex-1 h-10 rounded-full border border-border px-4 flex items-center text-sm text-muted-foreground">Ask Sasha anything…</div>
        <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* 2 — Side panel with tabs (Notion AI / Linear / Microsoft Copilot) */
function DesignTwo() {
  return (
    <div className="w-[400px] h-[560px] rounded-l-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2"><Avatar size="h-7 w-7" /><p className="font-heading text-lg font-bold">Sasha</p></div>
        <X className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-1 p-1.5 mx-4 mt-3 rounded-lg bg-muted text-sm font-semibold">
        <div className="rounded-md bg-card py-1.5 text-center shadow-sm">Ask</div><div className="py-1.5 text-center text-muted-foreground">Tours</div><div className="py-1.5 text-center text-muted-foreground">Help</div>
      </div>
      <div className="p-4 space-y-3 flex-1">
        <div className="rounded-xl bg-muted p-3 text-sm">Hi, I'm Sasha. You're on your <b>Dashboard</b>. I can explain anything here or walk you through it.</div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Suggested for this page</p>
        <div className="flex flex-wrap gap-2">
          {['Why is a project "Watch"?', 'Start a field report', 'Review WO-KNO-0006', 'Explain margin'].map(t => <span key={t} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">{t}</span>)}
        </div>
      </div>
      <div className="m-3 rounded-xl border border-border p-2">
        <p className="px-2 py-1 text-sm text-muted-foreground">Ask Sasha anything…</p>
        <div className="flex items-center justify-between pt-1"><span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"><Sparkles className="h-3 w-3" />Dashboard context</span>
          <div className="flex gap-1.5"><span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><Mic className="h-4 w-4" /></span><span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Send className="h-4 w-4" /></span></div></div>
      </div>
    </div>
  );
}

/* 3 — Onboarding checklist launcher (Pendo / WalkMe / Userpilot) */
function DesignThree() {
  const tasks = [{t:'Tour the Command Center', d:true}, {t:'Create a work order', d:true}, {t:'Submit a field report', d:false}, {t:'Bill your first invoice', d:false}];
  return (
    <div className="w-[360px] h-[560px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
      <div className="p-4 flex items-start gap-3 border-b border-border">
        <Avatar size="h-11 w-11" />
        <div className="flex-1"><p className="font-heading text-lg font-bold leading-tight">Get set up with Sasha</p><p className="text-xs text-muted-foreground">2 of 4 done · about 6 minutes left</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full w-1/2 rounded-full bg-primary" /></div></div>
        <X className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-3 space-y-1.5 flex-1">
        {tasks.map(({t,d}, i) => (
          <div key={t} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i===2 ? 'border border-primary bg-primary/10' : ''}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${d ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>{d ? '✓' : i+1}</span>
            <p className={`flex-1 text-sm ${d ? 'line-through text-muted-foreground' : 'font-semibold'}`}>{t}</p>
            {i===2 && <PlayCircle className="h-5 w-5 text-primary" />}
          </div>))}
        <div className="mt-3 rounded-xl bg-muted p-3 flex items-center gap-2 text-sm"><Hammer className="h-4 w-4 text-primary" />Next up: <b>Submit a field report</b></div>
      </div>
      <div className="flex items-center gap-2 border-t border-border p-3">
        <FileText className="h-4 w-4 text-muted-foreground" /><div className="flex-1 text-sm text-muted-foreground">Or ask a question…</div><Mic className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function SashaPopupDesignsPreview() {
  return (
    <div className="min-h-screen bg-background p-8">
      <p className="mb-6 text-sm text-muted-foreground">Presentation-only · Sasha pop-up concepts · nothing is read or saved</p>
      <div className="flex flex-wrap gap-10">
        <div><Label n={1} title="Navy welcome card" from="Intercom Fin, Procore" /><DesignOne /></div>
        <div><Label n={2} title="Docked side panel with tabs" from="Notion AI, Linear, Copilot" /><DesignTwo /></div>
        <div><Label n={3} title="Setup checklist" from="Pendo, WalkMe, Userpilot" /><DesignThree /></div>
      </div>
    </div>
  );
}
