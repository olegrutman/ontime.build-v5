const features = [
  {
    num: '01', icon: '📅', title: 'Smart Scheduling',
    desc: 'Gantt charts, lookahead schedules, and critical path analysis built for construction crews. Syncs with P6, MS Project, and ASTA. Real-time updates push to every device instantly.',
    tags: ['Lookahead', 'Critical Path', 'P6 Import', 'Baseline'],
  },
  {
    num: '02', icon: '📋', title: 'RFIs & Submittals',
    desc: 'Create, route, and close RFIs in minutes not days. Auto-link submittals to spec sections and drawings. Full ball-in-court tracking and audit trail for disputes and closeout.',
    tags: ['Auto-routing', 'Spec Linking', 'Ball-in-Court', 'Closeout'],
  },
  {
    num: '03', icon: '💰', title: 'Cost Management',
    desc: 'Track budgets, commitments, and actuals in real time. Manage change orders, PCOs, and potential change events. Forecast cash flow and catch overruns before they compound.',
    tags: ['Change Orders', 'Cash Flow', 'Cost Codes', 'Forecasting'],
  },
  {
    num: '04', icon: '👷', title: 'Field Management',
    desc: 'Daily logs, safety observations, time tracking, and photo documentation from any jobsite — even offline. Crews log from phones. The office sees it instantly. Zero paper, zero lag.',
    tags: ['Daily Logs', 'Offline Mode', 'Photo Docs', 'Safety Forms'],
  },
  {
    num: '05', icon: '📁', title: 'Document Control',
    desc: 'One source of truth for drawings, specs, contracts, and correspondence. Version control ensures everyone works from the latest set. Hyperlinks keep everything connected in context.',
    tags: ['Version Control', 'Hyperlinks', 'Markup', 'Distribution'],
  },
  {
    num: '06', icon: '✅', title: 'Punch List & QA',
    desc: 'Create punch items in the field with photos and location pins. Track resolution live. Auto-generate closeout packages. Hand over a complete, organized digital record owners actually value.',
    tags: ['Mobile Punch', 'Location Pin', 'Auto Closeout', 'Owner Portal'],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-[5%] bg-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-10">
        <div>
          <div className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[2px] uppercase text-[#E85A00] mb-3.5">
            <span className="block w-5 h-[2px] bg-[#E85A00]" />
            Platform Features
          </div>
          <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-[hsl(220,22%,15%)]">
            Everything Your<br />Crew <em className="text-[#E85A00] not-italic">Actually</em> Needs
          </h2>
        </div>
        <p className="text-[hsl(220,5%,42%)] max-w-[320px] text-[0.92rem] leading-[1.75] md:text-right">
          Built by people who've worn the hard hat, not just the hoodie. Every tool purpose-built for the realities of construction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[hsl(220,13%,91%)] border border-[hsl(220,13%,91%)] rounded-xl overflow-hidden">
        {features.map((f) => (
          <div
            key={f.num}
            className="group bg-white p-[36px_32px] transition-colors relative overflow-hidden hover:bg-[#F5F6F8]"
          >
            {/* Hover top border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E85A00] to-[#FF6F1A] scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
            {/* Number */}
            <div className="absolute top-6 right-6 font-heading text-[3rem] font-black text-black/[0.04] leading-none">{f.num}</div>
            {/* Icon */}
            <div className="w-12 h-12 bg-[#FFF0E6] border border-[rgba(232,90,0,.15)] rounded-[10px] flex items-center justify-center text-[1.3rem] mb-5">
              {f.icon}
            </div>
            <div className="font-heading text-[1.3rem] font-extrabold tracking-[0.3px] uppercase mb-2.5 text-[hsl(220,22%,15%)]">{f.title}</div>
            <div className="text-[0.87rem] text-[hsl(220,5%,42%)] leading-[1.7]">{f.desc}</div>
            <div className="flex flex-wrap gap-[5px] mt-[18px]">
              {f.tags.map((t) => (
                <span key={t} className="text-[0.68rem] text-[hsl(220,5%,42%)] border border-[hsl(220,13%,82%)] px-[9px] py-[3px] rounded-[3px] bg-[#F5F6F8] font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
