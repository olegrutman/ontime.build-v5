const logos = [
  { name: 'Turner Construction', initials: 'TC' },
  { name: 'Skanska', initials: 'SK' },
  { name: 'Bechtel', initials: 'BE' },
  { name: 'AECOM', initials: 'AE' },
  { name: 'Fluor', initials: 'FL' },
  { name: 'Kiewit', initials: 'KW' },
  { name: 'Clark Construction', initials: 'CC' },
  { name: 'Mortenson', initials: 'MO' },
];

export function LogoMarquee() {
  return (
    <section className="py-12 border-y bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by leading construction companies
        </p>
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/30 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/30 to-transparent z-10" />
          
          <div className="flex gap-12 animate-marquee">
            {[...logos, ...logos].map((logo, i) => (
              <div 
                key={`${logo.name}-${i}`}
                className="flex items-center gap-3 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground/70">{logo.initials}</span>
                </div>
                <span className="text-sm font-medium text-foreground/70 whitespace-nowrap">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
