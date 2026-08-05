import { Link } from 'react-router-dom';

const AMOUNTS = [
  { label: 'Labor — 3 carpenters × 14 hrs', val: '$3,780.00' },
  { label: 'Materials — LVL beam, hangers, strap', val: '$1,412.65' },
  { label: 'Equipment — telehandler, 1 day', val: '$385.00' },
  { label: 'Markup — 12%', val: '$669.32' },
];

export function HeroSection() {
  return (
    <section
      className="relative flex flex-col justify-center pt-[112px] pb-16 sm:pt-[150px] sm:pb-24 px-5 sm:px-[5%] overflow-hidden"
      style={{
        background:
          'linear-gradient(168deg, #FFF9EC 0%, #FDF3E0 26%, #F4F6FB 62%, #EEF1F8 100%)',
      }}
    >
      {/* Single warm-to-cool wash — no dot grid, no floating blobs */}
      <div
        className="absolute inset-x-0 top-0 h-[70%] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 0%, hsl(var(--amber) / 0.16), transparent 70%)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto w-full text-center sm:text-left">
        {/* Eyebrow — trust chips merged in */}
        <div
          className="animate-fade-up inline-flex items-center gap-2 border px-3.5 py-[6px] rounded-full text-[0.66rem] sm:text-[0.72rem] font-bold tracking-[0.8px] sm:tracking-[1.1px] uppercase mb-6 w-fit mx-auto sm:mx-0"
          style={{
            background: 'rgba(255,255,255,0.72)',
            borderColor: 'hsl(var(--amber) / 0.28)',
            color: 'hsl(var(--amber-d))',
          }}
        >
          <div className="w-[7px] h-[7px] rounded-full animate-pulse-dot flex-shrink-0" style={{ background: 'hsl(var(--amber))' }} />
          <span>No credit card · Cancel anytime · Export your data</span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up-delay-1 font-heading font-black uppercase text-balance
                     text-[2.75rem] leading-[0.94] tracking-[-1.5px]
                     sm:text-[4.2rem] sm:leading-[0.92] sm:tracking-[-2px]
                     lg:text-[6rem] lg:tracking-[-2.5px] max-w-[860px] mx-auto sm:mx-0"
          style={{ color: 'hsl(var(--ink))' }}
        >
          Every Order.<br />
          Every Job.<br />
          <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>One System.</em>
        </h1>

        {/* Sub */}
        <p
          className="animate-fade-up-delay-2 mt-5 sm:mt-6 mb-8 max-w-[560px] mx-auto sm:mx-0 font-normal
                     text-[1rem] leading-[1.7]
                     sm:text-[1.08rem] sm:leading-[1.75]"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          Stop reconciling SOVs by hand, chasing change orders over text, and finding
          $40k of unreturned material at closeout. One <strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>flat $89/month per company</strong> — unlimited users, unlimited projects, all four roles (GC, Trade, Field Crew, Supplier).
        </p>

        {/* Actions */}
        <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start">
          <Link
            to="/signup"
            className="text-center px-8 py-4 rounded-full text-[0.98rem] font-bold shadow-amber-lg hover:brightness-110 hover:-translate-y-px transition-all no-underline"
            style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
          >
            Start free — invite your crew in 2 min
          </Link>
          <a
            href="#how"
            className="text-center px-8 py-4 rounded-full text-[0.95rem] font-semibold no-underline transition-all border-[1.5px] hover:bg-white"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--ink2))', background: 'rgba(255,255,255,0.55)' }}
          >
            See how it works
          </a>
        </div>

        {/* Product proof — one real screen */}
        <div className="animate-fade-up-delay-4 mt-14 sm:mt-20 relative text-left max-w-[860px] mx-auto sm:mx-0">
          <div
            className="relative bg-white rounded-[18px] overflow-hidden"
            style={{
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 4px 6px rgba(0,0,0,.03), 0 30px 70px hsl(var(--navy) / 0.14)',
            }}
          >
            {/* Window chrome */}
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'hsl(var(--surface))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              <div className="w-[9px] h-[9px] rounded-full bg-[#FF5F57]" />
              <div className="w-[9px] h-[9px] rounded-full bg-[#FFBD2E]" />
              <div className="w-[9px] h-[9px] rounded-full bg-[#28C840]" />
              <div
                className="flex-1 text-center text-[0.72rem] font-medium tracking-[0.4px] truncate px-2"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                Cherry Hills Park — CO-014
              </div>
            </div>

            {/* CO header */}
            <div className="px-4 sm:px-6 pt-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[0.62rem] font-bold uppercase tracking-[1px] mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Change order
                  </div>
                  <h2 className="font-heading text-[1.35rem] sm:text-[1.6rem] font-black uppercase leading-none tracking-[-0.5px]" style={{ color: 'hsl(var(--ink))' }}>
                    Re-frame bearing wall — Unit 3B
                  </h2>
                  <div className="text-[0.78rem] mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Priced by <strong className="font-semibold" style={{ color: 'hsl(var(--ink2))' }}>Alvarez Framing</strong> → routed to <strong className="font-semibold" style={{ color: 'hsl(var(--ink2))' }}>Northline GC</strong>
                  </div>
                </div>
                <span
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-[0.7px] whitespace-nowrap"
                  style={{ background: 'hsl(var(--amber-pale))', color: 'hsl(var(--amber-d))', border: '1px solid hsl(var(--amber) / 0.3)' }}
                >
                  Awaiting GC
                </span>
              </div>
            </div>

            {/* Amount lines */}
            <div className="px-4 sm:px-6 py-3">
              {AMOUNTS.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border) / 0.55)' }}>
                  <span className="text-[0.8rem] truncate" style={{ color: 'hsl(var(--ink2))' }}>{row.label}</span>
                  <span className="font-mono text-[0.82rem] font-medium tabular-nums flex-shrink-0" style={{ color: 'hsl(var(--ink))' }}>{row.val}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-3.5 pb-1">
                <span className="font-heading text-[0.95rem] font-bold uppercase tracking-[0.5px]" style={{ color: 'hsl(var(--ink))' }}>
                  CO total
                </span>
                <span className="font-mono text-[1.35rem] font-bold tabular-nums leading-none" style={{ color: 'hsl(var(--amber-d))' }}>
                  $6,246.97
                </span>
              </div>
              <div className="text-[0.72rem] mt-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Revised contract sum <span className="font-mono tabular-nums">$426,246.97</span> · auto-added to SOV on approval
              </div>
            </div>

            {/* Actions row */}
            <div
              className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center gap-2.5"
              style={{ background: 'hsl(var(--surface))', borderTop: '1px solid hsl(var(--border))' }}
            >
              <span className="px-4 py-2 rounded-full text-[0.78rem] font-bold" style={{ background: 'hsl(153, 82%, 31%)', color: '#fff' }}>
                Approve
              </span>
              <span className="px-4 py-2 rounded-full text-[0.78rem] font-semibold border-[1.5px] bg-white" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--ink2))' }}>
                Request revision
              </span>
              <span className="ml-auto text-[0.7rem]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Submitted 8:41 AM
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
