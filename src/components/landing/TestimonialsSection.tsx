const testimonials = [
  {
    quote: 'We used to chase invoices for weeks. Now our TCs submit, we approve in the platform, and we both have a clear record. The first time we avoided a billing dispute, it paid for the software for the next five years.',
    name: 'Derek Kowalski', role: 'VP Construction — Baywood Hotels', initials: 'DK', bg: 'hsl(var(--amber-d))',
  },
  {
    quote: "My biggest problem was material waste — we'd order too much, returns were a mess, nobody tracked it. Ontime made that problem disappear. Every return is documented. Every restocking fee is captured. It's a real closed loop now.",
    name: 'Maria Linden', role: 'Project Executive — Silverton GC', initials: 'ML', bg: 'hsl(153, 82%, 31%)',
  },
  {
    quote: "I could never tell where the job stood financially until the end of the month. Now I look at the dashboard and I know exactly what's committed, what's paid, and what's still open. That visibility changed how I run every project.",
    name: 'Andre Torres', role: 'Senior PM — Phillips Consultant Group', initials: 'AT', bg: 'hsl(var(--navy))',
  },
];

const logos = ['Baywood Hotels', 'Silverton GC', 'Mesa Pacific', 'Ironclad Dev', 'Apex Structures', 'RidgeLine Build', 'ClearSpan', 'Summit CM'];

export function TestimonialsSection() {
  return (
    <section id="proof" className="py-24 px-[5%] bg-white">
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
        Customer Stories
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
        Built for the People<br />Who <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>Build</em> Things
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl overflow-hidden mt-14" style={{ background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' }}>
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white p-[36px_30px] hover:bg-[hsl(var(--surface))] transition-colors">
            <div className="text-[0.9rem] tracking-[3px] mb-3" style={{ color: 'hsl(var(--amber))' }}>★★★★★</div>
            <div className="text-[0.93rem] leading-[1.78] mb-6 italic relative pt-1" style={{ color: 'hsl(var(--ink2))' }}>
              <span className="font-heading text-[4rem] leading-[0.5] block mb-2.5 not-italic opacity-20" style={{ color: 'hsl(var(--amber))' }}>"</span>
              {t.quote}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-[0.85rem] text-white flex-shrink-0"
                style={{ background: t.bg }}
              >
                {t.initials}
              </div>
              <div>
                <div className="font-semibold text-[0.88rem]" style={{ color: 'hsl(var(--ink))' }}>{t.name}</div>
                <div className="text-[0.75rem]" style={{ color: 'hsl(var(--muted-foreground))' }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logos */}
      <div className="mt-14 pt-10" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="text-center text-[0.7rem] uppercase tracking-[1.5px] mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Trusted by teams building across the country
        </div>
        <div className="flex gap-9 flex-wrap justify-center items-center">
          {logos.map((l) => (
            <div key={l} className="font-heading text-[1.05rem] font-bold tracking-[0.5px] uppercase cursor-default transition-colors" style={{ color: 'hsl(var(--border))' }}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
