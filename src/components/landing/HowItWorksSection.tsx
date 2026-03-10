const steps = [
  { num: '01', title: 'Import Plans & Team', desc: 'Upload drawings, schedule, and budget. Invite your GC, subs, and owner reps in minutes. Role-based permissions set automatically.', active: true },
  { num: '02', title: 'Connect Field & Office', desc: 'Field crews log daily reports, issues, and photos from phones. The office sees everything live. RFIs route, submittals review — all in context.' },
  { num: '03', title: 'Track, Forecast & Decide', desc: 'Live dashboards surface schedule threats and budget variances before they become problems. AI forecasting shows where you\'ll be in 30, 60, 90 days.' },
  { num: '04', title: 'Close Out with Confidence', desc: 'Auto-generate O&M manuals, warranties, and as-built packages. Hand off a complete digital record. Done right, the first time.' },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-[5%] bg-[#F5F6F8]">
      <div className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[2px] uppercase text-[#E85A00] mb-3.5">
        <span className="block w-5 h-[2px] bg-[#E85A00]" />
        How It Works
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-[hsl(220,22%,15%)]">
        Groundbreak to<br /><em className="text-[#E85A00] not-italic">Closeout</em> — In One Place
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[72px] items-center mt-14">
        {/* Steps */}
        <div className="flex flex-col">
          {steps.map((step) => (
            <div key={step.num} className={`flex gap-5 py-6 border-b border-[hsl(220,13%,91%)] last:border-b-0`}>
              <div className={`font-heading text-[2.5rem] font-black leading-none flex-shrink-0 w-11 text-right ${step.active ? 'text-[#E85A00]' : 'text-black/[0.07]'}`}>
                {step.num}
              </div>
              <div>
                <div className={`font-heading text-[1.2rem] font-extrabold tracking-[0.3px] uppercase mb-1.5 ${step.active ? 'text-[#E85A00]' : 'text-[hsl(220,22%,15%)]'}`}>
                  {step.title}
                </div>
                <div className="text-[0.87rem] text-[hsl(220,5%,42%)] leading-[1.7]">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual */}
        <div className="bg-white border border-[hsl(220,13%,91%)] rounded-xl p-7 shadow-[0_4px_24px_rgba(0,0,0,.06)] relative">
          <div className="absolute -top-px left-10 right-10 h-[3px] bg-gradient-to-r from-transparent via-[#E85A00] to-transparent rounded" />
          <div className="text-[0.68rem] font-bold uppercase tracking-[1px] text-[hsl(220,5%,62%)] mb-[18px]">Field + Office · Live View</div>

          <div className="flex gap-[18px] items-start">
            {/* Phone */}
            <div className="w-[130px] flex-shrink-0 bg-[hsl(220,22%,15%)] rounded-[18px] border border-white/[0.08] p-2">
              <div className="bg-[#1a1f2e] rounded-xl min-h-[220px] p-3">
                <div className="h-[3px] w-9 bg-white/[0.12] rounded mx-auto mb-3" />
                <div className="text-center p-2.5 bg-[rgba(232,90,0,.15)] border border-[rgba(232,90,0,.2)] rounded-[7px] mb-2">
                  <div className="font-heading text-[1.5rem] font-black text-[#E85A00]">Day 94</div>
                  <div className="text-[0.55rem] text-white/40">Hyatt Studios L2</div>
                </div>
                {[
                  { color: '#0D9A6A', text: 'MEP complete — A-D' },
                  { color: '#E85A00', text: 'Drywall in progress' },
                  { color: '#2563EB', text: 'EIFS — mobilizing' },
                  { color: 'rgba(255,255,255,.15)', text: 'Finishes — not started' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-[5px] py-[5px] ${i < 3 ? 'border-b border-white/[0.06]' : ''}`}>
                    <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <div className="text-[0.55rem] text-white/45">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed */}
            <div className="flex-1">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.8px] text-[hsl(220,5%,62%)] mb-2">Office Live Feed</div>
              {[
                { type: 'ok', time: '📍 Level 2 · MEP · 8:42 AM', text: 'Zones A, B, C passed inspection — signed off' },
                { type: 'alert', time: '⚠ Budget Alert · 9:15 AM', text: 'Electrical T&M overage $12,400 — review required' },
                { type: 'ok', time: '📋 RFI #47 Closed · 10:03 AM', text: 'Use Type 3B wall at grid C-7 per sheet A-7' },
                { type: '', time: '📷 14 Photos · 11:20 AM', text: 'J. Torres — drywall framing unit A-K12' },
              ].map((item, i) => (
                <div key={i} className={`bg-[#F5F6F8] border border-[hsl(220,13%,91%)] rounded-md p-2.5 mb-2 text-[0.72rem] ${
                  item.type === 'alert' ? 'border-l-[2.5px] border-l-[#E85A00]' : item.type === 'ok' ? 'border-l-[2.5px] border-l-[#0D9A6A]' : ''
                }`}>
                  <div className="text-[hsl(220,5%,62%)] text-[0.62rem] mb-[2px]">{item.time}</div>
                  <div className="text-[hsl(220,22%,15%)]">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-5 pt-[18px] border-t border-[hsl(220,13%,91%)] flex gap-6">
            {[
              { num: '1.8d', color: '#E85A00', label: 'Avg RFI Response', sub: 'Industry avg: 7.2 days' },
              { num: '98%', color: '#0D9A6A', label: 'Daily Log Rate', sub: 'vs 61% paper-based' },
              { num: '3.4×', color: '#2563EB', label: 'Early Issue Detection', sub: 'before they cost money' },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-heading text-[1.5rem] font-black leading-none" style={{ color: m.color }}>{m.num}</div>
                <div className="text-[0.62rem] text-[hsl(220,5%,62%)] uppercase tracking-[0.5px] mt-[2px]">{m.label}</div>
                <div className="text-[0.6rem] text-[hsl(220,5%,62%)]">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
