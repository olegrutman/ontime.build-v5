import { Sparkles, FileSearch, MessageSquareCode, ListTree } from 'lucide-react';

const aiCapabilities = [
  {
    icon: FileSearch,
    title: 'Estimate PDFs → POs',
    desc: 'Drop a supplier estimate PDF. We parse line items, quantities, and pricing with Gemini, then generate POs tied to the right project scope. No re-typing.',
    chip: 'Gemini-powered',
  },
  {
    icon: ListTree,
    title: 'AI SOV Generation',
    desc: 'Answer 5 setup questions about the building. We generate an industry-standard Schedule of Values — phased, weighted, summing to exactly 100%.',
    chip: 'Setup wizard',
  },
  {
    icon: MessageSquareCode,
    title: 'Sasha — Onboarding Copilot',
    desc: "An on-screen guide that explains where you are, why a button matters, and what to do next. Built for crews who don't read manuals.",
    chip: 'Always-on assist',
  },
  {
    icon: Sparkles,
    title: 'Scope Descriptions',
    desc: 'CO and WO scope written in 1–3 plain sentences from the items and locations you selected. No invented details, no padding.',
    chip: 'Locked to source',
  },
];

export function AISection() {
  return (
    <section className="py-24 px-[5%] relative overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(var(--surface)) 0%, white 100%)' }}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            AI built for construction ops
          </div>
          <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
            Less typing.<br />
            <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>More building.</em>
          </h2>
        </div>
        <p className="max-w-[360px] text-[0.93rem] leading-[1.78]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          AI you can actually use on a jobsite — bounded, source-locked, and tied to live project data. No hallucinated SOVs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-xl overflow-hidden" style={{ background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' }}>
        {aiCapabilities.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="bg-white p-8 group relative overflow-hidden hover:bg-[hsl(var(--surface))] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'hsl(var(--amber-pale))', border: '1px solid hsl(var(--amber) / 0.2)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'hsl(var(--amber-d))' }} aria-hidden="true" />
                </div>
                <span className="text-[0.6rem] font-bold uppercase tracking-[1px] px-2 py-1 rounded" style={{ color: 'hsl(var(--amber-d))', background: 'hsl(var(--amber-pale))' }}>
                  {c.chip}
                </span>
              </div>
              <div className="font-heading text-[1.25rem] font-extrabold uppercase tracking-[0.3px] mb-2" style={{ color: 'hsl(var(--ink))' }}>{c.title}</div>
              <p className="text-[0.88rem] leading-[1.72]" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
