const features = [
  {
    num: '01', icon: '📦', title: 'Purchase Orders',
    desc: 'Order materials directly from project estimates. Every PO ties back to scope, tracks delivery status, and updates the budget automatically — no double entry, no missed deliveries.',
    tags: ['Estimate-to-PO', 'Delivery Tracking', 'Supplier Portal', 'Budget Sync'],
  },
  {
    num: '02', icon: '🔨', title: 'Work Orders',
    desc: 'Assign fixed-price or T&M work with clear scope, clean approvals, and real field communication. Crews see their tasks. TCs track labor. GCs approve — all in one place.',
    tags: ['Fixed-price / T&M', 'Field Tasks', 'Approvals', 'Scope Control'],
  },
  {
    num: '03', icon: '📄', title: 'Change Orders',
    desc: 'Document and approve scope changes with a proper financial trail. Every change order flows directly into project cost tracking — no more verbal agreements that disappear.',
    tags: ['Scope Documentation', 'GC Approval', 'Cost Integration', 'Audit Trail'],
  },
  {
    num: '04', icon: '💰', title: 'Invoicing',
    desc: 'Move invoices through approval faster with a clear financial record for every company. Trade Contractors submit, GCs approve, and payment status updates in real time — no email chains.',
    tags: ['Fast Approvals', 'Payment Status', 'Financial Trail', 'Multi-party'],
  },
  {
    num: '05', icon: '↩', title: 'Material Returns',
    desc: 'Turn messy, untracked returns into a clean workflow. Document reasons, check returnability, apply pricing and restocking fees, and close the loop so nothing disappears from the budget.',
    tags: ['Return Reasons', 'Restocking Fees', 'Supplier Confirm', 'Closed Loop'],
  },
  {
    num: '06', icon: '📊', title: 'Project Budget',
    desc: 'See where money stands in real time. POs, work orders, change orders, and invoices all flow into one budget view — so you always know what was budgeted, committed, and spent.',
    tags: ['Live Cost View', 'Committed vs Actual', 'Budget Alerts', 'Profit Tracking'],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-[5%] bg-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-10">
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            Platform Features
          </div>
          <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
            The Tools That Actually<br /><em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>Move a Job Forward</em>
          </h2>
        </div>
        <p className="max-w-[320px] text-[0.92rem] leading-[1.75] md:text-right" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Built around how construction operations actually work — not how enterprise software companies think they do.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' }}>
        {features.map((f) => (
          <div
            key={f.num}
            className="group bg-white p-[36px_32px] transition-colors relative overflow-hidden hover:bg-[hsl(var(--surface))]"
          >
            {/* Hover top border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" style={{ background: 'linear-gradient(90deg, hsl(var(--amber-d)), hsl(var(--amber)), hsl(var(--amber-l)))' }} />
            {/* Number */}
            <div className="absolute top-[22px] right-[22px] font-heading text-[3rem] font-black text-black/[0.04] leading-none">{f.num}</div>
            {/* Icon */}
            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-[1.3rem] mb-5" style={{ background: 'hsl(var(--amber-pale))', border: '1px solid hsl(var(--amber) / 0.2)' }}>
              {f.icon}
            </div>
            <div className="font-heading text-[1.3rem] font-extrabold tracking-[0.3px] uppercase mb-2.5" style={{ color: 'hsl(var(--ink))' }}>{f.title}</div>
            <div className="text-[0.87rem] leading-[1.72]" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.desc}</div>
            <div className="flex flex-wrap gap-[5px] mt-[18px]">
              {f.tags.map((t) => (
                <span key={t} className="text-[0.67rem] px-[9px] py-[3px] rounded-[3px] font-medium" style={{ color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
