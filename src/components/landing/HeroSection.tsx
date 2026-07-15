import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section
      className="relative flex flex-col justify-center pt-[104px] pb-16 sm:pt-[128px] sm:pb-24 px-5 sm:px-[5%] overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #fff 0%, #F6F8FD 55%, #FFF4DC 100%)' }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 dot-grid pointer-events-none opacity-70"
        style={{ maskImage: 'radial-gradient(ellipse 90% 70% at 60% 35%, black 30%, transparent 100%)' }}
      />
      <div
        className="absolute -top-24 -right-24 w-[420px] h-[420px] sm:w-[640px] sm:h-[640px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--amber) / 0.14), transparent 65%)' }}
      />
      <div
        className="absolute -bottom-40 -left-20 w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--navy) / 0.05), transparent 65%)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* Eyebrow */}
        <div
          className="animate-fade-up inline-flex items-center gap-2 border px-3 py-[5px] rounded-full text-[0.72rem] sm:text-[0.73rem] font-bold tracking-[1px] sm:tracking-[1.2px] uppercase mb-5 w-fit"
          style={{
            background: 'hsl(var(--amber-pale))',
            borderColor: 'hsl(var(--amber) / 0.25)',
            color: 'hsl(var(--amber-d))',
          }}
        >
          <div className="w-[7px] h-[7px] rounded-full animate-pulse-dot" style={{ background: 'hsl(var(--amber))' }} />
          Construction Operations Platform
        </div>

        {/* Headline — mobile-first sizing */}
        <h1
          className="animate-fade-up-delay-1 font-heading font-black uppercase text-balance
                     text-[2.6rem] leading-[0.95] tracking-[-1.5px]
                     sm:text-[4rem] sm:leading-[0.93] sm:tracking-[-2px]
                     lg:text-[6rem] lg:tracking-[-2.5px] max-w-[860px]"
          style={{ color: 'hsl(var(--ink))' }}
        >
          Every Order.<br />
          Every Job.<br />
          <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>One System.</em>
        </h1>

        {/* Sub */}
        <p
          className="animate-fade-up-delay-2 mt-5 sm:mt-6 mb-9 sm:mb-10 max-w-[560px] font-normal
                     text-[1rem] leading-[1.7]
                     sm:text-[1.08rem] sm:leading-[1.75]"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          Stop reconciling SOVs by hand, chasing change orders over text, and finding
          $40k of unreturned material at closeout. Ontime.Build connects <strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>GCs, Trade Contractors, Field Crews, and Suppliers</strong> in one financial loop.
        </p>

        {/* Actions — full-width on mobile */}
        <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <Link
            to="/signup"
            className="text-center px-7 py-4 sm:py-3.5 rounded-[6px] text-[0.98rem] font-bold shadow-amber-lg hover:brightness-110 hover:-translate-y-px transition-all no-underline"
            style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
          >
            Create an Account — Free
          </Link>
          <a
            href="#how"
            className="flex items-center justify-center sm:justify-start gap-2.5 text-[0.9rem] font-medium no-underline transition-colors group py-2"
            style={{ color: 'hsl(var(--ink2))' }}
          >
            <span
              aria-hidden="true"
              className="w-[40px] h-[40px] rounded-full border-[1.5px] flex items-center justify-center text-[0.75rem] bg-white shadow-sm flex-shrink-0"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--amber-d))' }}
            >
              ▶
            </span>
            See how it works
          </a>
        </div>

        {/* Trust row */}
        <div className="animate-fade-up-delay-4 flex items-center gap-3.5 mt-10">
          <div className="flex">
            {[
              { initials: 'GC', bg: 'hsl(var(--amber-d))' },
              { initials: 'TC', bg: 'hsl(var(--navy))' },
              { initials: 'FC', bg: 'hsl(153, 82%, 31%)' },
              { initials: 'SUP', bg: 'hsl(210, 76%, 44%)' },
            ].map((a, i) => (
              <div
                key={a.initials}
                className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full border-2 border-white flex items-center justify-center text-[0.58rem] sm:text-[0.62rem] font-bold text-white"
                style={{ background: a.bg, marginLeft: i > 0 ? '-10px' : 0 }}
              >
                {a.initials}
              </div>
            ))}
          </div>
          <div className="text-[0.88rem] sm:text-[0.82rem]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Built with real <strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>GCs, trades, crews & suppliers</strong>
          </div>
        </div>

        {/* Compact product "proof strip" — replaces oversized dashboard mock on mobile */}
        <div className="animate-fade-up-delay-5 mt-12 sm:mt-16 relative">
          <div
            className="absolute -inset-x-3 -inset-y-6 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--amber) / 0.08), transparent 70%)' }}
          />
          <div
            className="relative bg-white rounded-[14px] overflow-hidden"
            style={{
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 4px 6px rgba(0,0,0,.04), 0 24px 60px hsl(var(--navy) / 0.12), 0 0 0 1px hsl(var(--amber) / 0.07)',
            }}
          >
            {/* Browser bar */}
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ background: 'hsl(var(--surface))', borderBottom: '1px solid hsl(var(--border))' }}
            >
              <div className="w-[9px] h-[9px] rounded-full bg-[#FF5F57]" />
              <div className="w-[9px] h-[9px] rounded-full bg-[#FFBD2E]" />
              <div className="w-[9px] h-[9px] rounded-full bg-[#28C840]" />
              <div
                className="flex-1 text-center text-[0.75rem] sm:text-[0.75rem] font-medium tracking-[0.4px] truncate px-2"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                Cherry Hills Park — Live Overview
              </div>
            </div>

            {/* KPI strip — 3 tiles that stack tight on mobile */}
            <div className="grid grid-cols-3 gap-px" style={{ background: 'hsl(var(--border))' }}>
              {[
                { label: 'Contract', val: '$420K', color: 'hsl(var(--amber-d))', hint: 'Active' },
                { label: 'Paid', val: '$150K', color: 'hsl(153, 82%, 31%)', hint: 'On track' },
                { label: 'Approvals', val: '4', color: 'hsl(var(--navy))', hint: '1 INV · 2 WO · 1 CO' },
              ].map((k) => (
                <div key={k.label} className="bg-white p-3 sm:p-4">
                  <div className="text-[0.7rem] sm:text-[0.62rem] uppercase tracking-[0.6px] sm:tracking-[0.8px] mb-1.5 font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {k.label}
                  </div>
                  <div className="font-heading text-[1.6rem] sm:text-[1.8rem] font-black leading-none tabular-nums" style={{ color: k.color }}>
                    {k.val}
                  </div>
                  <div className="text-[0.7rem] sm:text-[0.62rem] mt-1.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {k.hint}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            <div className="p-4 sm:p-5 bg-white">
              <div className="text-[0.75rem] sm:text-[0.66rem] font-bold uppercase tracking-[0.6px] sm:tracking-[0.8px] mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Material budget vs orders
              </div>
              {[
                { label: 'Lumber', pct: 84 },
                { label: 'Hardware', pct: 63 },
                { label: 'Sheathing', pct: 76 },
                { label: 'Returns closed', pct: 41, color: 'hsl(153, 82%, 31%)' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5 mb-2 last:mb-0">
                  <div className="text-[0.68rem] w-[74px] sm:w-[100px] flex-shrink-0 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {row.label}
                  </div>
                  <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: 'hsl(var(--surface2))' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.pct}%`,
                        background: row.color || 'linear-gradient(90deg, hsl(var(--amber-d)), hsl(var(--amber)))',
                      }}
                    />
                  </div>
                  <div
                    className="text-[0.62rem] font-bold flex-shrink-0 w-[28px] text-right tabular-nums"
                    style={{ color: row.color || 'hsl(var(--amber-d))' }}
                  >
                    {row.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
