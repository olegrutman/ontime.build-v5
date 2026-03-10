const integrations = [
  'Procore', 'Autodesk BIM 360', 'Primavera P6', 'MS Project',
  'QuickBooks', 'Sage 300', 'Viewpoint', 'DocuSign',
  'Bluebeam Revu', 'Trimble', 'ASTA Powerproject', 'Xero',
];

export function IntegrationsStrip() {
  return (
    <div className="bg-[hsl(220,22%,15%)] py-[60px] px-[5%] text-center">
      <div className="font-heading text-[1.1rem] font-bold uppercase tracking-[1.5px] text-white/[0.35] mb-7">
        Connects with your existing stack
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        {integrations.map((name) => (
          <div
            key={name}
            className="bg-white/[0.05] border border-white/[0.08] px-[18px] py-[9px] rounded-md text-[0.8rem] font-medium text-white/45 flex items-center gap-[7px] hover:bg-[rgba(232,90,0,.1)] hover:border-[rgba(232,90,0,.25)] hover:text-white/80 transition-all cursor-default"
          >
            <div className="w-[6px] h-[6px] rounded-full bg-[#E85A00] opacity-50" />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
