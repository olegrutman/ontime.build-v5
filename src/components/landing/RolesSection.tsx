const roles = [
  {
    icon: '🏗️', name: 'General Contractors',
    desc: 'Control project costs, approve invoices and change orders, track supplier activity, and keep every trade aligned from one dashboard.',
    tags: ['Budget Control', 'Approvals', 'Trade Oversight', 'Material Visibility'],
  },
  {
    icon: '🔧', name: 'Trade Contractors',
    desc: 'Run framing operations with tighter labor control, cleaner invoicing, faster supplier coordination, and full visibility into change order status.',
    tags: ['Change Orders', 'Invoicing', 'Crew Management', 'Contract Tracking'],
  },
  {
    icon: '👷', name: 'Field Crews',
    desc: 'See exactly what work is assigned, submit field updates, attach jobsite proof, and keep the office informed without endless phone calls.',
    tags: ['Assigned Tasks', 'Field Updates', 'Photo Proof', 'Simple Mobile'],
  },
  {
    icon: '📦', name: 'Suppliers',
    desc: 'Receive clean purchase orders, price estimates, confirm deliveries, and manage returns — all tied to live project demand without back-and-forth calls.',
    tags: ['Material Orders', 'Delivery Confirm', 'Returns Workflow', 'Estimate Upload'],
  },
];

export function RolesSection() {
  return (
    <section id="roles" className="py-24 px-[5%]" style={{ background: 'hsl(var(--navy))' }}>
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber) / 0.6)' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber) / 0.4)' }} />
        Role-Based by Design
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-white">
        Built for Every Company<br /><em className="not-italic" style={{ color: 'hsl(var(--amber))' }}>On the Project.</em>
      </h2>
      <p className="text-white/[0.35] max-w-[500px] text-base leading-[1.75] mt-3">
        Each role gets a view built for what they actually own — not a one-size-fits-all screen that nobody uses correctly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden mt-12"
        style={{ background: 'hsl(var(--amber) / 0.08)', border: '1px solid hsl(var(--amber) / 0.1)' }}
      >
        {roles.map((role) => (
          <div
            key={role.icon}
            className="group p-8 transition-colors relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {/* Hover top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"
              style={{ background: 'linear-gradient(90deg, hsl(var(--amber-d)), hsl(var(--amber)), hsl(var(--amber-l)))' }}
            />
            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center font-heading text-[1.1rem] font-black mb-4"
              style={{ background: 'hsl(var(--amber) / 0.1)', border: '1px solid hsl(var(--amber) / 0.2)', color: 'hsl(var(--amber))' }}
            >
              {role.icon}
            </div>
            <div className="font-heading text-[1.15rem] font-extrabold uppercase text-white mb-2">{role.name}</div>
            <p className="text-[0.84rem] text-white/[0.36] leading-[1.72] mb-3.5">{role.desc}</p>
            <div className="flex flex-wrap gap-1">
              {role.tags.map((tag) => (
                <span key={tag} className="text-[0.62rem] text-white/[0.26] border border-white/[0.07] px-2 py-[2px] rounded-[3px]">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
