const integrations = [
  'QuickBooks', 'Procore', 'Buildertrend', 'Sage 300',
  'DocuSign', 'MS Project', 'Viewpoint', 'Bluebeam Revu',
  'Trimble', 'Xero', 'ASTA Powerproject', 'Autodesk BIM 360',
];

export function IntegrationsStrip() {
  return (
    <div className="py-[56px] px-[5%] text-center" style={{ background: 'hsl(var(--navy-xd))' }}>
      <div className="font-heading text-[1.1rem] font-bold uppercase tracking-[1.5px] text-white/[0.28] mb-7">
        Connects with your existing stack
      </div>
      <div className="flex gap-2.5 flex-wrap justify-center">
        {integrations.map((name) => (
          <div
            key={name}
            className="bg-white/[0.04] border border-white/[0.07] px-[18px] py-[9px] rounded-[5px] text-[0.8rem] font-medium text-white/[0.36] flex items-center gap-[7px] transition-all cursor-default"
            style={{ }}
          >
            <div className="w-[5px] h-[5px] rounded-full opacity-50" style={{ background: 'hsl(var(--amber))' }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
