import { useState } from 'react';

const steps = [
  { num: '01', title: 'Set Up the Project', desc: 'Create the project, add scope, upload estimates, and invite your GC, trade contractors, crews, and suppliers. Role-based access is set automatically — everyone sees only what they need.' },
  { num: '02', title: 'Order Materials & Assign Work', desc: 'Generate purchase orders directly from estimates. Create change orders for crews and trade contractors with clear scope. Everything connects to the project budget from day one.' },
  { num: '03', title: 'Track, Approve & Adjust', desc: 'Field crews update work. Suppliers confirm deliveries. Invoices and change orders route for approval. The financial picture updates automatically — no manual reconciliation.' },
  { num: '04', title: 'Close Out with Confidence', desc: 'Return unused materials, close open invoices, and see final project profitability in one screen. Every job ends with a complete, accurate financial record.' },
];

const docs = [
  { section: 'Purchase Orders', items: [
    { id: 'PO-2211', desc: 'Framing lumber — Phase 1', amt: '$24,600', status: 'Ordered', statusClass: 'approved' },
    { id: 'PO-2213', desc: 'Hardware & fasteners', amt: '$8,400', status: 'In Transit', statusClass: 'review' },
  ]},
  { section: 'Change Orders', items: [
    { id: 'CO-044', desc: 'Level 2 framing — full floor', amt: '$18,200', status: 'Approved', statusClass: 'approved' },
    { id: 'CO-045', desc: 'Roof sheathing — Bldg A', amt: '$9,800', status: 'Pending', statusClass: 'pending' },
  ]},
  { section: 'Invoices', items: [
    { id: 'INV-1048', desc: 'Phase 1 labor billing', amt: '$18,400', status: 'GC Review', statusClass: 'pending' },
    { id: 'INV-1041', desc: 'Materials & install complete', amt: '$31,200', status: 'Paid', statusClass: 'approved' },
  ]},
];

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#FEF3C7', color: '#92400E' },
  approved: { bg: '#E6F7F2', color: 'hsl(153, 82%, 31%)' },
  review: { bg: 'hsl(var(--amber-pale))', color: 'hsl(var(--amber-d))' },
};

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how" className="py-24 px-[5%]" style={{ background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
        How It Works
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
        From Project Setup to<br /><em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>Full Profitability</em> — In One Flow
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[72px] items-center mt-14">
        {/* Steps */}
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="flex gap-5 py-6 cursor-pointer"
              style={{ borderBottom: i < steps.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
              onMouseEnter={() => setActiveStep(i)}
            >
              <div className="font-heading text-[2.5rem] font-black leading-none flex-shrink-0 w-11 text-right transition-colors"
                style={{ color: i === activeStep ? 'hsl(var(--amber))' : 'rgba(0,0,0,.07)' }}
              >
                {step.num}
              </div>
              <div>
                <div className="font-heading text-[1.2rem] font-extrabold tracking-[0.3px] uppercase mb-1.5 transition-colors"
                  style={{ color: i === activeStep ? 'hsl(var(--amber-d))' : 'hsl(var(--ink))' }}
                >
                  {step.title}
                </div>
                <div className="text-[0.87rem] leading-[1.72]" style={{ color: 'hsl(var(--muted-foreground))' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual — Document View */}
        <div className="bg-white rounded-xl p-7 relative" style={{ border: '1px solid hsl(var(--border))', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
          <div className="absolute -top-px left-10 right-10 h-[3px] rounded" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--amber)), transparent)' }} />
          <div className="text-[0.66rem] font-bold uppercase tracking-[1px] mb-[18px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Live Document View — 5 Cherry Hills Park</div>
          <div className="flex flex-col gap-[7px]">
            {docs.map((section) => (
              <div key={section.section}>
                <div className="text-[0.6rem] font-bold uppercase tracking-[0.8px] mb-[3px] mt-2.5 first:mt-0" style={{ color: 'hsl(var(--muted-foreground))' }}>{section.section}</div>
                {section.items.map((item) => {
                  const st = statusStyles[item.statusClass];
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-[7px] px-[13px] py-[9px] text-[0.72rem] cursor-default transition-colors mb-[3px]"
                      style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}
                    >
                      <div className="font-bold w-[68px] flex-shrink-0" style={{ color: 'hsl(var(--ink))', }}>{item.id}</div>
                      <div className="flex-1 mx-2.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{item.desc}</div>
                      <div className="font-semibold w-16 text-right flex-shrink-0" style={{ color: 'hsl(var(--ink2))' }}>{item.amt}</div>
                      <div className="text-[0.6rem] font-bold px-[7px] py-[2px] rounded-[3px] flex-shrink-0 ml-2" style={{ background: st.bg, color: st.color }}>{item.status}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Metrics */}
          <div className="mt-5 pt-[18px] flex gap-6" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            {[
              { num: '$89', color: 'hsl(var(--amber-d))', label: 'Per Company / Mo', sub: 'Unlimited projects + users' },
              { num: '4', color: 'hsl(153, 82%, 31%)', label: 'Roles Connected', sub: 'GC · TC · Crew · Supplier' },
              { num: '0', color: 'hsl(var(--navy))', label: 'Spreadsheets Needed', sub: 'Everything lives here' },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-heading text-[1.5rem] font-black leading-none" style={{ color: m.color }}>{m.num}</div>
                <div className="text-[0.62rem] uppercase tracking-[0.5px] mt-[2px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{m.label}</div>
                <div className="text-[0.6rem]" style={{ color: 'hsl(var(--muted-foreground))' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
