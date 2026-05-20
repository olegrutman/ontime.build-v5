import { Shield, EyeOff, Lock, Layers } from 'lucide-react';

const tenets = [
  {
    icon: EyeOff,
    title: 'GCs don\'t see TC labor margins',
    desc: 'Trade Contractor cost breakdowns and labor markup are invisible to the GC by default. Per-project markup disclosure can be set to hidden, summary, or detailed.',
  },
  {
    icon: Layers,
    title: 'TCs don\'t see supplier pricing when GC procures',
    desc: 'When materials are procured by the GC, supplier estimates and PO pricing are masked from downstream Trade Contractors. Responsibility resolution is enforced in the database.',
  },
  {
    icon: Lock,
    title: 'Row-Level Security on every table',
    desc: 'Access is gated by the authoritative project_participants table. RLS policies use a security-definer helper to prevent recursion — nothing leaks across orgs.',
  },
  {
    icon: Shield,
    title: 'Storage buckets are private by default',
    desc: 'Field photos, COs, invoices, and exports live in private buckets with signed URLs scoped to the requesting org. No public links unless you explicitly publish.',
  },
];

export function SecurityPrivacySection() {
  return (
    <section className="py-24 px-[5%] relative overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="absolute inset-0 dot-grid-light pointer-events-none opacity-50" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber))' }}>
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            Security & Privacy
          </div>
          <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-white">
            Multi-party platforms<br />
            <em className="not-italic" style={{ color: 'hsl(var(--amber))' }}>need real privacy.</em>
          </h2>
        </div>
        <p className="max-w-[400px] text-[0.95rem] leading-[1.78] text-white/70">
          Procore and Buildertrend put everyone in one room. We separate the rooms — and prove it at the database layer, not just in the UI.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-px rounded-xl overflow-hidden" style={{ background: 'hsl(var(--amber) / 0.1)', border: '1px solid hsl(var(--amber) / 0.15)' }}>
        {tenets.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title} className="p-8" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-4" style={{ background: 'hsl(var(--amber) / 0.1)', border: '1px solid hsl(var(--amber) / 0.25)' }}>
                <Icon className="w-5 h-5" style={{ color: 'hsl(var(--amber))' }} aria-hidden="true" />
              </div>
              <div className="font-heading text-[1.15rem] font-extrabold uppercase tracking-[0.3px] text-white mb-2">{t.title}</div>
              <p className="text-[0.86rem] leading-[1.72] text-white/65">{t.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
