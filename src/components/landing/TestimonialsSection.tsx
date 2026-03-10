const testimonials = [
  {
    quote: 'We cut RFI response time from 11 days to under 2. On our last hotel project alone, that saved us six figures in delay claims. OnTime is the first platform that works the way a job site actually works.',
    name: 'Derek Kowalski', role: 'VP Construction — Baywood Hotels', initials: 'DK', bg: '#E85A00',
  },
  {
    quote: "My field crews are not tech people. But they're using OnTime every single day. The mobile daily log is dead simple — they log, I see it instantly. No more chasing someone for a report at end of day.",
    name: 'Maria Linden', role: 'Project Executive — Silverton GC', initials: 'ML', bg: '#0D9A6A',
  },
  {
    quote: "Wrong drawing rev on site, subs working off old specs — that was our nightmare. Since OnTime, that problem is gone. One set, always current, everyone has it. I can't overstate how much stress that removes.",
    name: 'Andre Torres', role: 'Senior PM — Phillips Consultant Group', initials: 'AT', bg: '#2563EB',
  },
];

const logos = ['Baywood Hotels', 'Silverton GC', 'Mesa Pacific', 'Ironclad Dev', 'Apex Structures', 'RidgeLine Build', 'ClearSpan', 'Summit CM'];

export function TestimonialsSection() {
  return (
    <section id="proof" className="py-24 px-[5%] bg-white">
      <div className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[2px] uppercase text-[#E85A00] mb-3.5">
        <span className="block w-5 h-[2px] bg-[#E85A00]" />
        Customer Stories
      </div>
      <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-[hsl(220,22%,15%)]">
        Built for the People<br />Who <em className="text-[#E85A00] not-italic">Build</em> Things
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[hsl(220,13%,91%)] border border-[hsl(220,13%,91%)] rounded-xl overflow-hidden mt-14">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white p-[36px_30px] hover:bg-[#F5F6F8] transition-colors">
            <div className="text-[#E85A00] text-[0.9rem] tracking-[3px] mb-3">★★★★★</div>
            <div className="text-[0.95rem] text-[hsl(220,15%,26%)] leading-[1.75] mb-6 italic relative pt-1">
              <span className="font-heading text-[4rem] leading-[0.5] text-[#E85A00] opacity-25 block mb-2.5 not-italic">"</span>
              {t.quote}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-[0.85rem] text-white flex-shrink-0"
                style={{ background: t.bg }}
              >
                {t.initials}
              </div>
              <div>
                <div className="font-semibold text-[0.88rem] text-[hsl(220,22%,15%)]">{t.name}</div>
                <div className="text-[0.75rem] text-[hsl(220,5%,62%)]">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logos */}
      <div className="mt-14 pt-10 border-t border-[hsl(220,13%,91%)]">
        <div className="text-center text-[0.7rem] uppercase tracking-[1.5px] text-[hsl(220,5%,62%)] mb-6">
          Trusted by teams building across the country
        </div>
        <div className="flex gap-9 flex-wrap justify-center items-center">
          {logos.map((l) => (
            <div key={l} className="font-heading text-[1.05rem] font-bold text-[hsl(220,13%,82%)] tracking-[0.5px] uppercase hover:text-[hsl(220,5%,42%)] transition-colors cursor-default">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
