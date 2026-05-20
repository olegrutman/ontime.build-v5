const rows = [
  { dim: 'Connects GC, TC, FC, and Suppliers in one project', spreadsheet: false, generic: 'Partial', ontime: true },
  { dim: 'SOV invoicing with auto-revision tracking', spreadsheet: false, generic: 'Partial', ontime: true },
  { dim: 'Change Orders with financial trail to budget', spreadsheet: false, generic: true, ontime: true },
  { dim: 'Closed-loop material returns + credit memos', spreadsheet: false, generic: false, ontime: true },
  { dim: 'T&M / Remodel mode (Work Order driven)', spreadsheet: false, generic: false, ontime: true },
  { dim: 'GCs can\'t see TC labor margins (privacy default)', spreadsheet: false, generic: false, ontime: true },
  { dim: 'AI estimate PDF → POs', spreadsheet: false, generic: false, ontime: true },
  { dim: 'Flat price · unlimited users · unlimited projects', spreadsheet: true, generic: false, ontime: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="font-bold text-[1.1rem]" style={{ color: 'hsl(153, 82%, 31%)' }}>✓</span>;
  if (value === false) return <span className="font-bold text-[1.1rem]" style={{ color: 'hsl(var(--border))' }}>—</span>;
  return <span className="text-[0.72rem] font-semibold px-2 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>{value}</span>;
}

export function ComparisonTable() {
  return (
    <section className="py-24 px-[5%]" style={{ background: 'hsl(var(--surface))' }}>
      <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
        <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
        Compare
      </div>
      <h2 className="font-heading text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[0.96] tracking-[-1.3px] uppercase mb-3" style={{ color: 'hsl(var(--ink))' }}>
        Why teams switch.
      </h2>
      <p className="max-w-[520px] text-[0.95rem] leading-[1.78] mb-10" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Honest comparison against what most teams use today.
      </p>

      <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr style={{ background: 'hsl(var(--navy))' }}>
              <th className="px-5 py-4 text-[0.7rem] font-bold uppercase tracking-[1.2px] text-white/60 w-[44%]">Capability</th>
              <th className="px-5 py-4 text-[0.7rem] font-bold uppercase tracking-[1.2px] text-white/60 text-center">Spreadsheets + email</th>
              <th className="px-5 py-4 text-[0.7rem] font-bold uppercase tracking-[1.2px] text-white/60 text-center">Generic PM tool</th>
              <th className="px-5 py-4 text-[0.7rem] font-bold uppercase tracking-[1.2px] text-center" style={{ color: 'hsl(var(--amber))' }}>Ontime.Build</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.dim} style={{ background: i % 2 === 0 ? 'white' : 'hsl(var(--surface))' }}>
                <td className="px-5 py-3.5 text-[0.86rem] font-medium" style={{ color: 'hsl(var(--ink2))' }}>{row.dim}</td>
                <td className="px-5 py-3.5 text-center"><Cell value={row.spreadsheet} /></td>
                <td className="px-5 py-3.5 text-center"><Cell value={row.generic} /></td>
                <td className="px-5 py-3.5 text-center" style={{ background: 'hsl(var(--amber-pale) / 0.4)' }}><Cell value={row.ontime} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
