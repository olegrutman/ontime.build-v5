import { useState } from 'react';

const personas = [
  {
    id: 'gc',
    label: 'General Contractor',
    short: 'GC',
    headline: 'See every dollar committed before it leaves the building.',
    bullets: [
      'Approve invoices, COs and POs from one inbox',
      'Live budget — committed vs actual, no spreadsheets',
      'GCs never see TC labor margins — privacy is default',
    ],
  },
  {
    id: 'tc',
    label: 'Trade Contractor',
    short: 'TC',
    headline: 'Get paid faster, lose less material, stop chasing approvals.',
    bullets: [
      'SOV invoicing with auto-revision tracking',
      'Crew tasks routed to Field Crews — no group texts',
      'Closed-loop returns recover real money each project',
    ],
  },
  {
    id: 'fc',
    label: 'Field Crew',
    short: 'FC',
    headline: 'See what to build, log hours, attach photos — that\'s it.',
    bullets: [
      'Mobile-first task board — Today / Up Next / Done',
      'Photo + voice capture from the jobsite',
      'No budgets, no margins — just the work you own',
    ],
  },
  {
    id: 'sup',
    label: 'Supplier',
    short: 'SUP',
    headline: 'Clean POs in, confirmed deliveries out, returns handled.',
    bullets: [
      'Receive POs tied to live project demand',
      'Confirm deliveries, flag substitutions',
      'Returns + restocking captured automatically',
    ],
  },
];

export function PersonaSwitcher() {
  const [active, setActive] = useState('gc');
  const p = personas.find((x) => x.id === active)!;

  return (
    <section className="py-20 px-[5%] bg-white">
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
        Pick your seat
      </div>
      <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] font-black leading-[0.98] tracking-[-1.2px] uppercase mb-8" style={{ color: 'hsl(var(--ink))' }}>
        One platform, <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>four very different views.</em>
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {personas.map((persona) => {
          const isActive = persona.id === active;
          return (
            <button
              key={persona.id}
              onClick={() => setActive(persona.id)}
              className="px-4 py-2.5 rounded-full text-[0.85rem] font-semibold transition-all border-[1.5px]"
              style={{
                background: isActive ? 'hsl(var(--navy))' : 'white',
                color: isActive ? 'hsl(var(--amber))' : 'hsl(var(--ink2))',
                borderColor: isActive ? 'hsl(var(--navy))' : 'hsl(var(--border))',
              }}
            >
              <span className="font-mono text-[0.7rem] opacity-70 mr-2">{persona.short}</span>
              {persona.label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        <div>
          <div className="font-heading text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight mb-6" style={{ color: 'hsl(var(--ink))' }}>
            {p.headline}
          </div>
          <ul className="flex flex-col gap-3.5 mb-7">
            {p.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[0.95rem]" style={{ color: 'hsl(var(--ink2))' }}>
                <span className="font-bold mt-px" style={{ color: 'hsl(var(--amber-d))' }}>✓</span>
                {b}
              </li>
            ))}
          </ul>
          <a
            href="/signup"
            className="inline-block px-6 py-3 rounded-[5px] text-[0.9rem] font-bold no-underline transition-all hover:brightness-110"
            style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
          >
            Start as {p.label} →
          </a>
        </div>

        {/* Visual stub */}
        <div className="rounded-xl p-6 border" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
          <div className="text-[0.6rem] font-bold uppercase tracking-[1px] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {p.label} — what you see first
          </div>
          {p.id === 'gc' && (
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Committed', val: '$1.84M', pct: 78, color: 'hsl(var(--amber-d))' },
                { label: 'Invoiced', val: '$1.12M', pct: 47, color: 'hsl(153, 82%, 31%)' },
                { label: 'Paid', val: '$0.94M', pct: 39, color: 'hsl(var(--navy))' },
                { label: 'Pending Approvals', val: '6 items', pct: 100, color: 'hsl(var(--amber))' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-[0.75rem] mb-1.5" style={{ color: 'hsl(var(--ink2))' }}>
                    <span>{row.label}</span>
                    <span className="font-mono font-semibold">{row.val}</span>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'hsl(var(--surface2))' }}>
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {p.id === 'tc' && (
            <div className="flex flex-col gap-2">
              {[
                { id: 'INV-1048', desc: 'Phase 1 labor', amt: '$18,400', st: 'Approved', stColor: 'hsl(153, 82%, 31%)' },
                { id: 'INV-1049', desc: 'Phase 2 partial', amt: '$22,100', st: 'GC Review', stColor: 'hsl(var(--amber-d))' },
                { id: 'CO-045', desc: 'Roof sheathing', amt: '$9,800', st: 'Submitted', stColor: 'hsl(var(--amber-d))' },
                { id: 'RET-12', desc: 'Excess lumber', amt: '+$1,240', st: 'Credit', stColor: 'hsl(153, 82%, 31%)' },
              ].map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md px-3 py-2.5 text-[0.75rem] border" style={{ background: 'white', borderColor: 'hsl(var(--border))' }}>
                  <span className="font-mono font-bold" style={{ color: 'hsl(var(--ink))' }}>{r.id}</span>
                  <span className="flex-1 ml-2 mr-2 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.desc}</span>
                  <span className="font-mono font-semibold mr-2" style={{ color: 'hsl(var(--ink2))' }}>{r.amt}</span>
                  <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded" style={{ color: r.stColor, background: 'hsl(var(--surface2))' }}>{r.st}</span>
                </div>
              ))}
            </div>
          )}
          {p.id === 'fc' && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { col: 'TODAY', items: ['Frame L2 west', 'Sheathe roof B'] },
                { col: 'UP NEXT', items: ['Hardware install', 'Cleanup L1'] },
                { col: 'DONE', items: ['Frame L1', 'Layout L2'] },
              ].map((c) => (
                <div key={c.col} className="rounded-md p-2 border" style={{ background: 'white', borderColor: 'hsl(var(--border))' }}>
                  <div className="text-[0.55rem] font-bold tracking-[1px] mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{c.col}</div>
                  {c.items.map((i) => (
                    <div key={i} className="text-[0.7rem] mb-1.5 px-1.5 py-1 rounded" style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--ink2))' }}>{i}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {p.id === 'sup' && (
            <div className="flex flex-col gap-2">
              {[
                { id: 'PO-2213', desc: 'Lumber package · 5 Cherry Hills', st: 'Confirm delivery', stColor: 'hsl(var(--amber-d))' },
                { id: 'PO-2215', desc: 'Hardware · Tower 14', st: 'In transit', stColor: 'hsl(var(--navy))' },
                { id: 'RET-09', desc: '84 LF framing lumber return', st: 'Credit memo', stColor: 'hsl(153, 82%, 31%)' },
                { id: 'EST-44', desc: 'Sheathing estimate request', st: 'Pricing', stColor: 'hsl(var(--amber-d))' },
              ].map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md px-3 py-2.5 text-[0.75rem] border" style={{ background: 'white', borderColor: 'hsl(var(--border))' }}>
                  <span className="font-mono font-bold" style={{ color: 'hsl(var(--ink))' }}>{r.id}</span>
                  <span className="flex-1 ml-2 mr-2 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.desc}</span>
                  <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded" style={{ color: r.stColor, background: 'hsl(var(--surface2))' }}>{r.st}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
