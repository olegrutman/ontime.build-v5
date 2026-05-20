const integrations = [
  'QuickBooks', 'Procore', 'Buildertrend', 'Sage 300',
  'DocuSign', 'MS Project', 'Viewpoint', 'Bluebeam Revu',
  'Trimble', 'Xero', 'ASTA Powerproject', 'Autodesk BIM 360',
];

export function IntegrationsStrip() {
  return (
    <div className="py-[56px] px-[5%] text-center" style={{ background: 'hsl(var(--navy-xd))' }}>
      <div className="font-heading text-[1.1rem] font-bold uppercase tracking-[1.5px] text-white/[0.5] mb-3">
        On the integration roadmap
      </div>
      <div className="text-[0.78rem] text-white/[0.4] mb-7 max-w-[520px] mx-auto">
        We're building toward the stack construction teams already use. Want one prioritized? <a href="mailto:hello@ontime.build?subject=Integration%20request" className="underline hover:text-white/70">Tell us which.</a>
      </div>
      <div className="flex gap-2.5 flex-wrap justify-center">
        {integrations.map((name) => (
          <div
            key={name}
            className="bg-white/[0.04] border border-white/[0.07] px-[18px] py-[9px] rounded-[5px] text-[0.8rem] font-medium text-white/[0.36] flex items-center gap-[7px] transition-all cursor-default"
          >
            <div className="w-[5px] h-[5px] rounded-full opacity-50" style={{ background: 'hsl(var(--amber))' }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
