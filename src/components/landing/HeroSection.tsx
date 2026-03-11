export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-[120px] pb-20 px-[5%] overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #fff 0%, #F6F8FD 50%, #FFF8EC 100%)' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 dot-grid pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 80% 70% at 62% 40%, black 30%, transparent 100%)' }}
      />
      {/* Accent orbs */}
      <div className="absolute -top-[100px] -right-[60px] w-[640px] h-[640px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--amber) / 0.09), transparent 65%)' }}
      />
      <div className="absolute -bottom-[200px] -left-[80px] w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--navy) / 0.05), transparent 65%)' }}
      />

      {/* Eyebrow */}
      <div className="animate-fade-up inline-flex items-center gap-2 border px-3.5 py-[5px] rounded-full text-[0.73rem] font-bold tracking-[1.2px] uppercase mb-6 w-fit"
        style={{ background: 'hsl(var(--amber-pale))', borderColor: 'hsl(var(--amber) / 0.25)', color: 'hsl(var(--amber-d))' }}
      >
        <div className="w-[7px] h-[7px] rounded-full animate-pulse-dot" style={{ background: 'hsl(var(--amber))' }} />
        Construction Operations Platform
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up-delay-1 font-heading font-black text-[clamp(3.2rem,7.5vw,7rem)] leading-[0.93] tracking-[-2.5px] uppercase max-w-[860px]" style={{ color: 'hsl(var(--ink))' }}>
        Every Order.<br />
        Every Job.<br />
        <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>One System.</em>
      </h1>

      {/* Sub */}
      <p className="animate-fade-up-delay-2 text-[clamp(0.95rem,1.8vw,1.12rem)] max-w-[540px] leading-[1.78] mt-6 mb-10 font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Ontime.Build connects General Contractors, Trade Contractors, Field Crews, and Suppliers
        in one unified platform — eliminating the spreadsheets, phone calls, and disconnected
        tools that cost you money every day.
      </p>

      {/* Actions */}
      <div className="animate-fade-up-delay-3 flex gap-3.5 items-center flex-wrap">
        <a
          href="/signup"
          className="px-8 py-3.5 rounded-[5px] text-[0.98rem] font-bold shadow-amber-lg hover:brightness-110 hover:-translate-y-px transition-all no-underline"
          style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
        >
          Start Free Demo
        </a>
        <a href="#how" className="flex items-center gap-2.5 text-[0.9rem] font-medium no-underline transition-colors group" style={{ color: 'hsl(var(--ink2))' }}>
          <div className="w-[44px] h-[44px] rounded-full border-[1.5px] flex items-center justify-center text-[0.8rem] bg-white shadow-sm transition-all flex-shrink-0"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--amber-d))' }}
          >
            ▶
          </div>
          See How It Works
        </a>
      </div>

      {/* Trust */}
      <div className="animate-fade-up-delay-4 flex items-center gap-4 mt-11">
        <div className="flex">
          {[
            { initials: 'DK', bg: 'hsl(var(--amber-d))' },
            { initials: 'ML', bg: 'hsl(var(--navy))' },
            { initials: 'AT', bg: 'hsl(153, 82%, 31%)' },
            { initials: 'SR', bg: 'hsl(210, 76%, 44%)' },
          ].map((a, i) => (
            <div
              key={a.initials}
              className="w-[34px] h-[34px] rounded-full border-2 border-white flex items-center justify-center text-[0.62rem] font-bold text-white"
              style={{ background: a.bg, marginLeft: i > 0 ? '-10px' : 0 }}
            >
              {a.initials}
            </div>
          ))}
        </div>
        <div className="text-[0.82rem]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Trusted across <strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>2,400+ active projects</strong> — $18B in construction value managed
        </div>
      </div>

      {/* Dashboard Mock */}
      <div className="animate-fade-up-delay-5 mt-16 relative">
        <div className="absolute -inset-x-5 -inset-y-8 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--amber) / 0.06), transparent 70%)' }} />
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px rgba(0,0,0,.04), 0 24px 60px hsl(var(--navy) / 0.1), 0 0 0 1px hsl(var(--amber) / 0.07)' }}>
          {/* Browser bar */}
          <div className="px-[18px] py-[11px] flex items-center gap-2" style={{ background: 'hsl(var(--surface))', borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
            <div className="flex-1 text-center text-[0.75rem] font-medium tracking-[0.5px]" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'Barlow, sans-serif' }}>
              Ontime.Build — 5 Cherry Hills Park · Operations Dashboard
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-[196px_1fr_244px] min-h-[400px]">
            {/* Sidebar — navy */}
            <div className="hidden lg:block py-4" style={{ background: 'hsl(var(--navy))', borderRight: '1px solid hsl(var(--amber) / 0.1)' }}>
              {[
                { icon: '▦', label: 'Dashboard', active: true },
                { icon: '📦', label: 'Purchase Orders' },
                { icon: '🔨', label: 'Work Orders' },
                { icon: '📄', label: 'Change Orders' },
                { icon: '💰', label: 'Invoices' },
                { icon: '↩', label: 'Returns' },
                { icon: '📊', label: 'Project Budget' },
                { icon: '👥', label: 'Crew Tasks' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`px-4 py-[9px] flex items-center gap-[9px] text-[0.73rem] cursor-pointer transition-all ${
                    item.active
                      ? 'font-semibold'
                      : ''
                  }`}
                  style={{
                    fontFamily: 'Barlow, sans-serif',
                    color: item.active ? 'hsl(var(--amber))' : 'rgba(255,255,255,.35)',
                    background: item.active ? 'hsl(var(--amber) / 0.08)' : 'transparent',
                    borderLeft: item.active ? '2.5px solid hsl(var(--amber))' : '2.5px solid transparent',
                  }}
                >
                  <span className="w-[14px] text-center">{item.icon}</span>
                  {item.label}
                </div>
              ))}
              <div className="px-4 pt-3 pb-1.5 text-[0.58rem] text-white/[0.18] tracking-[1.2px] uppercase">Projects</div>
              {['🏗 Cherry Hills Park', '🏢 Tower 14 — Ph.2', '🏨 Mesa Logistics Hub'].map((p) => (
                <div key={p} className="px-4 py-[9px] flex items-center gap-[9px] text-[0.73rem] text-white/[0.35] cursor-pointer" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  {p}
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="p-[22px] bg-white">
              <div className="flex items-center justify-between mb-[18px]">
                <div className="font-heading text-[1.1rem] font-extrabold tracking-[0.3px]" style={{ color: 'hsl(var(--ink))' }}>5 CHERRY HILLS PARK — LIVE OVERVIEW</div>
                <div className="px-2.5 py-1 rounded-full text-[0.66rem] font-bold" style={{ background: '#E6F7F2', color: 'hsl(153, 82%, 31%)', border: '1px solid rgba(12,146,104,.2)' }}>82% WITHIN PLAN ✓</div>
              </div>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2.5 mb-[18px]">
                {[
                  { label: 'Contract Value', val: '$420K', colorVar: '--amber-d', delta: 'Framing contract', deltaHL: 'Active' },
                  { label: 'Invoices Paid', val: '$150K', color: 'hsl(153, 82%, 31%)', delta: 'GC approved', deltaHL: '↑ On Track' },
                  { label: 'Open Approvals', val: '4', colorVar: '--navy', delta: '1 invoice · 2 WOs · 1 CO' },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg p-3.5" style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
                    <div className="text-[0.62rem] uppercase tracking-[0.8px] mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{kpi.label}</div>
                    <div className="font-heading text-[1.8rem] font-black leading-none" style={{ color: kpi.color || `hsl(var(${kpi.colorVar}))` }}>{kpi.val}</div>
                    <div className="text-[0.62rem] mt-[3px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {kpi.delta} {kpi.deltaHL && <span style={{ color: 'hsl(153, 82%, 31%)' }}>{kpi.deltaHL}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Progress */}
              <div className="rounded-lg p-3.5" style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
                <div className="text-[0.66rem] font-bold uppercase tracking-[0.8px] mb-2.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Material Budget vs Orders</div>
                {[
                  { label: 'Lumber Package', pct: 84, gradient: 'linear-gradient(90deg, hsl(var(--amber-d)), hsl(var(--amber)))' },
                  { label: 'Hardware', pct: 63, gradient: 'linear-gradient(90deg, hsl(var(--amber)), hsl(var(--amber-l)))' },
                  { label: 'Sheathing', pct: 76, gradient: 'linear-gradient(90deg, hsl(var(--amber-d)), hsl(var(--amber)))' },
                  { label: 'Returns Closed', pct: 41, color: 'hsl(153, 82%, 31%)' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2 mb-[7px]">
                    <div className="text-[0.66rem] w-[90px] flex-shrink-0 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{row.label}</div>
                    <div className="flex-1 h-[6px] rounded-[3px] overflow-hidden" style={{ background: 'hsl(var(--surface2))' }}>
                      <div className="h-full rounded-[3px]" style={{ width: `${row.pct}%`, background: row.gradient || row.color }} />
                    </div>
                    <div className="text-[0.62rem] font-semibold flex-shrink-0 ml-[6px] w-[26px] text-right" style={{ color: row.color || 'hsl(var(--amber-d))' }}>{row.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="hidden lg:flex flex-col p-[18px] bg-white" style={{ borderLeft: '1px solid hsl(var(--border))' }}>
              <div className="text-[0.63rem] font-bold uppercase tracking-[0.8px] mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>Urgent Items</div>
              {[
                { initials: 'INV', bg: 'hsl(var(--amber-pale))', color: 'hsl(var(--amber-d))', text: <><strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>Invoice #1048</strong> — $18,400 waiting GC approval</>, flag: 'Pending', flagClass: '' },
                { initials: 'PO', bg: '#FEF3C7', color: '#92400E', text: <><strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>PO-2213</strong> — Lumber delivery confirmed tomorrow</>, flag: 'Delivery', flagClass: '' },
                { initials: 'CO', bg: '#E6F7F2', color: 'hsl(153, 82%, 31%)', text: <><strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>Change Order #8</strong> — Level 3 scope approved</>, flag: 'Approved', flagClass: 'green' },
                { initials: 'RET', bg: '#FEF3C7', color: '#92400E', text: <><strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>Return Request</strong> — 84 LF excess framing lumber</>, flag: 'Review', flagClass: '' },
                { initials: 'WO', bg: 'hsl(var(--surface2))', color: 'hsl(var(--navy))', text: <><strong className="font-semibold" style={{ color: 'hsl(var(--ink))' }}>Crew Task</strong> — Level 2 framing update needed</>, flag: 'Crew', flagClass: 'navy' },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-[9px] pb-2.5 mb-2.5 ${i < 4 ? '' : ''}`} style={{ borderBottom: i < 4 ? '1px solid hsl(var(--border))' : 'none' }}>
                  <div
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[0.58rem] font-bold flex-shrink-0 mt-[1px]"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-[0.7rem] leading-[1.45]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {item.text}
                      <span className="inline-block ml-1 rounded-[3px] text-[0.55rem] font-bold px-[5px] py-px"
                        style={{
                          background: item.flagClass === 'green' ? '#E6F7F2' : item.flagClass === 'navy' ? 'hsl(var(--surface2))' : 'hsl(var(--amber-pale))',
                          color: item.flagClass === 'green' ? 'hsl(153, 82%, 31%)' : item.flagClass === 'navy' ? 'hsl(var(--navy))' : 'hsl(var(--amber-d))',
                        }}
                      >{item.flag}</span>
                    </div>
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
