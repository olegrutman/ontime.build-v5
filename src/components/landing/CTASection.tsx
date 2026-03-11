export function CTASection() {
  return (
    <section className="py-[100px] px-[5%] text-center relative overflow-hidden"
      style={{ background: 'linear-gradient(150deg, hsl(var(--navy)) 0%, #0B1830 100%)' }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none dot-grid-amber" />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--amber) / 0.08), transparent 70%)' }}
      />

      <h2 className="font-heading text-[clamp(2.8rem,6vw,5.5rem)] font-black leading-[0.93] tracking-[-2px] uppercase text-white max-w-[800px] mx-auto mb-[22px] relative">
        Stop Losing Money<br />to <em className="not-italic" style={{ color: 'hsl(var(--amber))' }}>Disconnected Systems.</em>
      </h2>
      <p className="text-white/[0.44] text-[1.05rem] max-w-[460px] mx-auto mb-9 relative">
        Join construction teams that replaced scattered spreadsheets, phone calls, and paper invoices with one platform built for real job sites.
      </p>
      <div className="flex justify-center gap-3.5 flex-wrap relative">
        <a
          href="/signup"
          className="px-9 py-4 text-base font-bold rounded-[5px] no-underline shadow-amber-lg hover:brightness-110 hover:-translate-y-0.5 transition-all"
          style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
        >
          Start Free Demo
        </a>
        <a
          href="#"
          className="px-9 py-4 text-base font-semibold bg-transparent text-white/55 border-[1.5px] border-white/[0.14] rounded-[5px] no-underline hover:border-white/35 hover:text-white transition-all"
        >
          Book a Live Demo
        </a>
      </div>
      <div className="mt-[22px] flex justify-center gap-6 flex-wrap relative">
        {['No credit card required', 'Full platform access', 'Setup in under 30 min', '$89 / company / month'].map((t) => (
          <span key={t} className="text-[0.8rem] text-white/30 flex items-center gap-[5px]">
            <span className="font-bold" style={{ color: 'hsl(var(--amber))' }}>✓</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
