const stats = [
  { num: '2,400+', label: 'Active Construction Projects' },
  { num: '$18B', label: 'Project Value Managed' },
  { num: '94%', label: 'On-Time Delivery Rate' },
  { num: '34%', label: 'Avg. Rework Reduction' },
];

export function StatsStrip() {
  return (
    <div className="bg-[hsl(220,22%,15%)] text-white py-[52px] px-[5%] grid grid-cols-2 lg:grid-cols-4 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid-light pointer-events-none" style={{ backgroundSize: '28px 28px' }} />
      {stats.map((s, i) => (
        <div
          key={s.num}
          className={`px-4 lg:px-10 py-4 lg:py-0 relative ${i < stats.length - 1 ? 'lg:border-r lg:border-white/10' : ''}`}
        >
          <div className="font-heading text-[clamp(2.2rem,4.5vw,3.8rem)] font-black text-[#E85A00] leading-none tracking-[-1.5px]">
            {s.num}
          </div>
          <div className="text-[0.85rem] text-white/50 mt-1.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
