export function TMModeSection() {
  return (
    <section className="py-24 px-[5%] bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        {/* Copy */}
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            T&M / Remodel Mode
          </div>
          <h2 className="font-heading text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[0.96] tracking-[-1.3px] uppercase mb-5" style={{ color: 'hsl(var(--ink))' }}>
            Remodel jobs work nothing like new builds.<br />
            <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>So we built a second mode.</em>
          </h2>
          <p className="text-[0.95rem] leading-[1.78] mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Switch a project into T&M mode and the whole interface adapts. SOV invoicing
            is replaced by Work Order driven billing. Fixed KPIs swap for actuals tracking.
            Change Orders become Work Orders — each one its own mini-project with scope,
            budget, team, procurement, and close-out.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-7">
            {[
              { label: 'Fixed-bid mode', desc: 'SOV % billing · committed vs actual · phase-based KPIs' },
              { label: 'T&M mode', desc: 'WO-driven invoicing · hours + materials · per-WO P&L' },
            ].map((m, i) => (
              <div
                key={m.label}
                className="p-4 rounded-lg border"
                style={{
                  background: i === 1 ? 'hsl(var(--navy))' : 'hsl(var(--surface))',
                  borderColor: i === 1 ? 'hsl(var(--amber) / 0.3)' : 'hsl(var(--border))',
                  color: i === 1 ? 'white' : 'inherit',
                }}
              >
                <div className="text-[0.65rem] font-bold uppercase tracking-[1px] mb-1.5" style={{ color: i === 1 ? 'hsl(var(--amber))' : 'hsl(var(--muted-foreground))' }}>
                  {m.label}
                </div>
                <div className="text-[0.78rem] leading-[1.6]" style={{ color: i === 1 ? 'rgba(255,255,255,0.65)' : 'hsl(var(--ink2))' }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>

          <a
            href="/signup"
            className="inline-block px-6 py-3 rounded-[5px] text-[0.9rem] font-bold no-underline transition-all hover:brightness-110"
            style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
          >
            Try T&M Mode →
          </a>
        </div>

        {/* Visual — WO mini-project mock */}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'hsl(var(--border))', boxShadow: '0 20px 50px hsl(var(--navy) / 0.1)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'hsl(var(--navy))' }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.7rem] font-bold px-2 py-1 rounded" style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}>WO-082</span>
              <span className="text-[0.78rem] font-semibold text-white">Kitchen demo + reframe</span>
            </div>
            <span className="text-[0.6rem] font-bold uppercase tracking-[1px] px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'hsl(var(--amber))' }}>In Progress</span>
          </div>
          <div className="bg-white p-5">
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Hours Logged', val: '47.5', color: 'hsl(var(--amber-d))' },
                { label: 'Materials', val: '$2,140', color: 'hsl(153, 82%, 31%)' },
                { label: 'Billable', val: '$8,930', color: 'hsl(var(--navy))' },
              ].map((k) => (
                <div key={k.label} className="rounded-lg p-3 border" style={{ background: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))' }}>
                  <div className="text-[0.58rem] font-bold uppercase tracking-[0.8px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{k.label}</div>
                  <div className="font-heading text-[1.4rem] font-black mt-1" style={{ color: k.color }}>{k.val}</div>
                </div>
              ))}
            </div>
            <div className="text-[0.6rem] font-bold uppercase tracking-[1px] mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Pipeline</div>
            {[
              { stage: 'Scope', done: true },
              { stage: 'Budget', done: true },
              { stage: 'Procurement', done: true },
              { stage: 'Field Work', done: false, active: true },
              { stage: 'Approval', done: false },
              { stage: 'Invoice', done: false },
            ].map((s) => (
              <div key={s.stage} className="flex items-center gap-2.5 py-1.5 text-[0.78rem]">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[0.55rem] font-bold"
                  style={{
                    background: s.done ? 'hsl(153, 82%, 31%)' : s.active ? 'hsl(var(--amber))' : 'hsl(var(--surface2))',
                    color: s.done || s.active ? 'white' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {s.done ? '✓' : s.active ? '●' : ''}
                </span>
                <span style={{ color: s.done ? 'hsl(var(--ink))' : s.active ? 'hsl(var(--amber-d))' : 'hsl(var(--muted-foreground))', fontWeight: s.active ? 600 : 400 }}>
                  {s.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
