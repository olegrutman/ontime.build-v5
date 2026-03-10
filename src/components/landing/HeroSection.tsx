export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-[120px] pb-20 px-[5%] overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #F8F9FC 50%, #FFF3ED 100%)' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 dot-grid pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 80% 70% at 60% 40%, black 30%, transparent 100%)' }}
      />
      {/* Accent orbs */}
      <div className="absolute -top-[120px] -right-[80px] w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(232,90,0,.09), transparent 65%)' }}
      />
      <div className="absolute -bottom-[200px] -left-[100px] w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,.05), transparent 65%)' }}
      />

      {/* Eyebrow */}
      <div className="animate-fade-up inline-flex items-center gap-2 bg-[#FFF0E6] border border-[rgba(232,90,0,.2)] text-[#E85A00] px-3.5 py-[5px] rounded-full text-[0.75rem] font-bold tracking-[1.2px] uppercase mb-6 w-fit">
        <div className="w-[7px] h-[7px] bg-[#E85A00] rounded-full animate-pulse-dot" />
        Construction Project Management
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up-delay-1 font-heading font-black text-[clamp(3.2rem,7.5vw,7rem)] leading-[0.93] tracking-[-2.5px] uppercase max-w-[860px] text-[hsl(220,22%,15%)]">
        Every Project.<br />
        <em className="text-[#E85A00] not-italic">On Time.</em><br />
        <span className="text-transparent" style={{ WebkitTextStroke: '2.5px hsl(220,22%,15%)' }}>
          Every Time.
        </span>
      </h1>

      {/* Sub */}
      <p className="animate-fade-up-delay-2 text-[clamp(0.95rem,1.8vw,1.15rem)] text-[hsl(220,5%,42%)] max-w-[540px] leading-[1.75] mt-6 mb-10 font-normal">
        OnTime.build connects your field crews, office teams, and subcontractors
        in one platform built for how construction actually works —
        not how software companies think it does.
      </p>

      {/* Actions */}
      <div className="animate-fade-up-delay-3 flex gap-3.5 items-center flex-wrap">
        <a
          href="/signup"
          className="px-[30px] py-3.5 bg-[#E85A00] text-white rounded-[5px] text-[0.98rem] font-semibold shadow-orange hover:bg-[#FF6F1A] hover:-translate-y-px transition-all no-underline"
        >
          Start Free — 14 Days
        </a>
        <a href="#" className="flex items-center gap-2.5 text-[hsl(220,15%,26%)] text-[0.9rem] font-medium no-underline hover:text-[#E85A00] transition-colors group">
          <div className="w-[42px] h-[42px] rounded-full border-[1.5px] border-[hsl(220,13%,82%)] flex items-center justify-center text-[0.8rem] bg-white shadow-sm group-hover:border-[#E85A00] group-hover:text-[#E85A00] transition-all flex-shrink-0">
            ▶
          </div>
          Watch 2-min Demo
        </a>
      </div>

      {/* Trust */}
      <div className="animate-fade-up-delay-4 flex items-center gap-4 mt-11">
        <div className="flex">
          {[
            { initials: 'DK', bg: '#E85A00' },
            { initials: 'ML', bg: '#2563EB' },
            { initials: 'AT', bg: '#0D9A6A' },
            { initials: 'SR', bg: '#7C3AED' },
          ].map((a, i) => (
            <div
              key={a.initials}
              className="w-[34px] h-[34px] rounded-full border-2 border-white flex items-center justify-center text-[0.65rem] font-bold text-white"
              style={{ background: a.bg, marginLeft: i > 0 ? '-10px' : 0 }}
            >
              {a.initials}
            </div>
          ))}
        </div>
        <div className="text-[0.82rem] text-[hsl(220,5%,42%)]">
          Trusted by <strong className="text-[hsl(220,22%,15%)] font-semibold">2,400+ projects</strong> across the US — $18B in value managed
        </div>
      </div>

      {/* Dashboard Mock */}
      <div className="animate-fade-up-delay-5 mt-16 relative">
        <div className="absolute -inset-x-5 -inset-y-8 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(232,90,0,.06), transparent 70%)' }} />
        <div className="bg-white border border-[hsl(220,13%,91%)] rounded-[14px] overflow-hidden shadow-[0_4px_6px_rgba(0,0,0,.04),0_20px_60px_rgba(0,0,0,.1),0_0_0_1px_rgba(232,90,0,.06)]">
          {/* Browser bar */}
          <div className="bg-[#F5F6F8] px-[18px] py-[11px] flex items-center gap-2 border-b border-[hsl(220,13%,91%)]">
            <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
            <div className="flex-1 text-center text-[0.75rem] text-[hsl(220,5%,62%)] font-medium tracking-[0.5px]" style={{ fontFamily: 'Barlow, sans-serif' }}>
              OnTime.build — Hyatt Studios Denver · Level 2 Dashboard
            </div>
          </div>
          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_240px] min-h-[400px]">
            {/* Sidebar */}
            <div className="hidden lg:block bg-[#F5F6F8] border-r border-[hsl(220,13%,91%)] py-4">
              {[
                { icon: '▦', label: 'Dashboard', active: true },
                { icon: '📅', label: 'Schedule' },
                { icon: '📋', label: 'RFIs' },
                { icon: '📄', label: 'Submittals' },
                { icon: '💰', label: 'Budget' },
                { icon: '⚠', label: 'Issues' },
                { icon: '📁', label: 'Documents' },
                { icon: '👷', label: 'Field Logs' },
                { icon: '✅', label: 'Punch List' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`px-4 py-[9px] flex items-center gap-[9px] text-[0.75rem] cursor-pointer transition-all ${
                    item.active
                      ? 'text-[#E85A00] bg-[#FFF0E6] border-l-[2.5px] border-[#E85A00] font-semibold'
                      : 'text-[hsl(220,5%,42%)]'
                  }`}
                  style={{ fontFamily: 'Barlow, sans-serif' }}
                >
                  <span className="w-[14px] text-center">{item.icon}</span>
                  {item.label}
                </div>
              ))}
              <div className="px-4 pt-4 pb-1.5 text-[0.6rem] text-[hsl(220,5%,62%)] tracking-[1px] uppercase">Projects</div>
              {['🏨 Hyatt Studios DEN', '🏢 Tower 14 — Ph.2', '🏗 Mesa Logistics Hub'].map((p) => (
                <div key={p} className="px-4 py-[9px] flex items-center gap-[9px] text-[0.75rem] text-[hsl(220,5%,42%)] cursor-pointer" style={{ fontFamily: 'Barlow, sans-serif' }}>
                  {p}
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="p-[22px] bg-white">
              <div className="flex items-center justify-between mb-[18px]">
                <div className="font-heading text-[1.15rem] font-extrabold tracking-[0.3px] text-[hsl(220,22%,15%)]">HYATT STUDIOS DEN — LEVEL 2</div>
                <div className="bg-[#ECFDF5] text-[#0D9A6A] px-2.5 py-1 rounded-full text-[0.68rem] font-bold border border-[rgba(13,154,106,.2)]">ON SCHEDULE ✓</div>
              </div>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2.5 mb-[18px]">
                {[
                  { label: 'Budget Used', val: '68%', color: 'text-[#E85A00]', delta: '$3.2M of $4.7M', deltaHighlight: '▲ On Track' },
                  { label: 'Schedule', val: '94%', color: 'text-[#0D9A6A]', delta: '+2 days ahead', deltaHighlight: '↑' },
                  { label: 'Open RFIs', val: '12', color: 'text-[#2563EB]', delta: '3 need response today', deltaHighlight: '' },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-[#F5F6F8] border border-[hsl(220,13%,91%)] rounded-lg p-3.5">
                    <div className="text-[0.65rem] text-[hsl(220,5%,62%)] uppercase tracking-[0.8px] mb-1">{kpi.label}</div>
                    <div className={`font-heading text-[1.8rem] font-black leading-none ${kpi.color}`}>{kpi.val}</div>
                    <div className="text-[0.65rem] text-[hsl(220,5%,62%)] mt-[3px]">
                      {kpi.delta} {kpi.deltaHighlight && <span className="text-[#0D9A6A]">{kpi.deltaHighlight}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Gantt */}
              <div className="bg-[#F5F6F8] border border-[hsl(220,13%,91%)] rounded-lg p-3.5">
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.8px] text-[hsl(220,5%,42%)] mb-2.5">Phase Progress — Level 2</div>
                {[
                  { label: 'Structural', pct: 100, color: '#0D9A6A', text: 'Done' },
                  { label: 'MEP Rough-In', pct: 78, color: '#E85A00', text: '78%' },
                  { label: 'Framing/DW', pct: 55, color: '#2563EB', text: '55%' },
                  { label: 'Ext. EIFS', pct: 30, color: '#7C3AED', text: '30%' },
                  { label: 'Finishes', pct: 8, color: '#D0D4DE', text: '8%' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2 mb-[7px]">
                    <div className="text-[0.68rem] text-[hsl(220,5%,42%)] w-20 flex-shrink-0 truncate">{row.label}</div>
                    <div className="flex-1 h-[7px] bg-[#ECEEF2] rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${row.pct}%`, background: row.color }} />
                    </div>
                    <div className="text-[0.65rem] font-semibold flex-shrink-0 ml-[7px]" style={{ color: row.color }}>{row.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="hidden lg:flex flex-col border-l border-[hsl(220,13%,91%)] p-[18px] bg-white">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.8px] text-[hsl(220,5%,62%)] mb-3">Live Activity</div>
              {[
                { initials: 'MR', bg: '#FFF0E6', color: '#E85A00', text: <><strong className="text-[hsl(220,22%,15%)] font-semibold">Mike R.</strong> submitted RFI #47 — Wall type clarification at grid C-7</>, time: '4 min ago' },
                { initials: 'SP', bg: '#ECFDF5', color: '#0D9A6A', text: <><strong className="text-[hsl(220,22%,15%)] font-semibold">Sarah P.</strong> approved submittal — EIFS FS-2 Balanced Beige</>, time: '22 min ago' },
                { initials: 'JT', bg: '#EFF6FF', color: '#2563EB', text: <><strong className="text-[hsl(220,22%,15%)] font-semibold">J. Torres</strong> uploaded 14 photos — MEP inspection Level 2</>, time: '1 hr ago' },
                { initials: '⚠', bg: '#FFF0E6', color: '#E85A00', text: <><strong className="text-[hsl(220,22%,15%)] font-semibold">Budget Alert:</strong> Electrical subcontract T&M variance $12,400</>, time: '2 hr ago' },
                { initials: '✓', bg: '#ECFDF5', color: '#0D9A6A', text: <><strong className="text-[hsl(220,22%,15%)] font-semibold">Punch #23 closed</strong> — Fire door hardware unit 2B resolved</>, time: '3 hr ago' },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-[9px] pb-2.5 mb-2.5 ${i < 4 ? 'border-b border-[hsl(220,13%,91%)]' : ''}`}>
                  <div
                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0 mt-[1px]"
                    style={{ background: item.bg, color: item.color }}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-[0.7rem] text-[hsl(220,5%,42%)] leading-[1.4]">{item.text}</div>
                    <div className="text-[0.62rem] text-[hsl(220,5%,62%)] mt-[2px]">{item.time}</div>
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
