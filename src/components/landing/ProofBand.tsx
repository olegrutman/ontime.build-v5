export function ProofBand() {
  const stats = [
    { num: '12+', label: 'General Contractors' },
    { num: '40+', label: 'Trade Contractors' },
    { num: '180+', label: 'Field Crews' },
    { num: '$4.2M', label: 'reconciled in COs' },
  ];
  return (
    <section
      className="px-[5%] py-8 sm:py-10 border-y"
      style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center text-[0.68rem] sm:text-[0.7rem] font-bold uppercase tracking-[1.6px] mb-5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Live on real jobsites this week
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-heading text-[1.7rem] sm:text-[2rem] font-black leading-none tabular-nums" style={{ color: 'hsl(var(--amber-d))' }}>
                {s.num}
              </div>
              <div className="text-[0.72rem] sm:text-[0.78rem] mt-1.5 uppercase tracking-[0.6px]" style={{ color: 'hsl(var(--ink2))' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
