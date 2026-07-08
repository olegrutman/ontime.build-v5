const pains = [
  {
    before: 'SOVs reconciled by hand in Excel every draw',
    after: 'Live SOV auto-rolls up from POs, WOs & invoices',
  },
  {
    before: 'Change orders chased in group texts & lost emails',
    after: 'CO wizard: scope → price → approve → billed',
  },
  {
    before: '$40k of unreturned material found at closeout',
    after: 'Returns tracked from field to supplier credit',
  },
  {
    before: 'GC, TC, Crew & Supplier stuck in 4 different apps',
    after: 'One shared project — role-based privacy baked in',
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      className="py-16 sm:py-24 px-5 sm:px-[5%]"
      style={{ background: 'hsl(var(--surface))' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 sm:mb-14 max-w-2xl">
          <div
            className="flex items-center gap-2 text-[0.68rem] sm:text-[0.7rem] font-bold tracking-[2px] uppercase mb-3"
            style={{ color: 'hsl(var(--amber-d))' }}
          >
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            The old way is bleeding money
          </div>
          <h2
            className="font-heading font-black uppercase text-balance
                       text-[2rem] leading-[0.95] tracking-[-1px]
                       sm:text-[3rem] sm:tracking-[-1.5px]
                       lg:text-[3.6rem]"
            style={{ color: 'hsl(var(--ink))' }}
          >
            Where projects leak.<br />
            <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>Where Ontime plugs it.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {pains.map((p) => (
            <div
              key={p.before}
              className="bg-white rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
              style={{ border: '1px solid hsl(var(--border))', boxShadow: '0 2px 8px -2px hsl(var(--navy) / 0.06)' }}
            >
              {/* Before */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold"
                  style={{ background: '#FEE2E2', color: '#B91C1C' }}
                >
                  ✕
                </div>
                <div className="text-[0.9rem] sm:text-[0.95rem] leading-[1.5] line-through decoration-[hsl(0_60%_60%/0.5)]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {p.before}
                </div>
              </div>
              {/* Divider */}
              <div className="border-t border-dashed" style={{ borderColor: 'hsl(var(--border))' }} />
              {/* After */}
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold"
                  style={{ background: 'hsl(var(--amber-pale))', color: 'hsl(var(--amber-d))' }}
                >
                  ✓
                </div>
                <div
                  className="text-[0.95rem] sm:text-[1rem] leading-[1.5] font-medium"
                  style={{ color: 'hsl(var(--ink))' }}
                >
                  {p.after}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
