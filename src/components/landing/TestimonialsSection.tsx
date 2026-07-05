import { Hammer, ShieldCheck, MessagesSquare } from 'lucide-react';

const pillars = [
  {
    icon: Hammer,
    title: 'Built with the trade, not at it',
    body: 'Every workflow — SOV invoicing, closed-loop returns, change-order routing — was drafted from real GC and framing-crew job walks. If it does not survive a Monday morning on site, it does not ship.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data, your margins',
    body: 'Role-based privacy is enforced at the database. GCs never see your labor rates. Trades never see the owner budget. Suppliers never see downstream markup. Not a promise — a policy.',
  },
  {
    icon: MessagesSquare,
    title: 'Founding Yard Program',
    body: 'We are onboarding a small group of GCs, trades, and suppliers as design partners. Direct line to the team, priority feature build, locked founding pricing. When you talk, the roadmap moves.',
  },
];

export function TestimonialsSection() {
  return (
    <section id="proof" className="py-24 px-[5%] bg-white">
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
        Why teams pick us
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
        Built for the People<br />Who <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>Build</em> Things
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl overflow-hidden mt-14" style={{ background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' }}>
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="bg-white p-[36px_30px] hover:bg-[hsl(var(--surface))] transition-colors">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
                style={{ background: 'hsl(var(--amber) / 0.12)', color: 'hsl(var(--amber-d))' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="font-heading font-bold uppercase tracking-[0.5px] text-[1.05rem] mb-3" style={{ color: 'hsl(var(--ink))' }}>
                {p.title}
              </div>
              <div className="text-[0.93rem] leading-[1.7]" style={{ color: 'hsl(var(--ink2))' }}>
                {p.body}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
