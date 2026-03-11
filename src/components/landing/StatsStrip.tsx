const stats = [
  { num: '2,400+', label: 'Active Construction Projects' },
  { num: '$18B', label: 'Project Value Managed' },
  { num: '$89', label: 'Per Company / Month — Flat' },
  { num: '4', label: 'Roles — One Connected Platform' },
];

export function StatsStrip() {
  return (
    <div className="text-white py-[52px] px-[5%] grid grid-cols-2 lg:grid-cols-4 relative overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="absolute inset-0 dot-grid-light pointer-events-none" />
      {stats.map((s, i) => (
        <div
          key={s.num}
          className={`px-4 lg:px-10 py-4 lg:py-0 relative z-[1] ${i < stats.length - 1 ? 'lg:border-r lg:border-white/[0.08]' : ''}`}
        >
          <div className="font-heading text-[clamp(2.2rem,4.5vw,3.8rem)] font-black leading-none tracking-[-1.5px]" style={{ color: 'hsl(var(--amber))' }}>
            {s.num}
          </div>
          <div className="text-[0.83rem] text-white/[0.38] mt-1.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
