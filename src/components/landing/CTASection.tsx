export function CTASection() {
  return (
    <section className="bg-[#E85A00] py-[100px] px-[5%] text-center relative overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Accent glow */}
      <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,.12), transparent 65%)' }}
      />

      <h2 className="font-heading text-[clamp(2.8rem,6vw,5.5rem)] font-black leading-[0.93] tracking-[-2px] uppercase text-white max-w-[800px] mx-auto mb-[22px] relative">
        Stop Losing Money<br />to <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,.5)' }}>Miscommunication.</span>
      </h2>
      <p className="text-white/75 text-[1.05rem] max-w-[460px] mx-auto mb-9 relative">
        Join thousands of construction teams delivering projects on time, on budget — with less chaos and more confidence.
      </p>
      <div className="flex justify-center gap-3.5 flex-wrap relative">
        <a
          href="/signup"
          className="px-9 py-4 text-base font-bold bg-white text-[#E85A00] rounded-[5px] no-underline shadow-[0_4px_20px_rgba(0,0,0,.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,.2)] transition-all"
        >
          Start Free 14-Day Trial
        </a>
        <a
          href="#"
          className="px-9 py-4 text-base font-semibold bg-transparent text-white border-[1.5px] border-white/40 rounded-[5px] no-underline hover:border-white hover:bg-white/[0.08] transition-all"
        >
          Schedule a Demo
        </a>
      </div>
      <div className="mt-[22px] flex justify-center gap-6 flex-wrap relative">
        {['No credit card required', 'Full feature access', 'Setup in under 30 min', 'Live onboarding included'].map((t) => (
          <span key={t} className="text-[0.8rem] text-white/65 flex items-center gap-[5px]">
            <span className="font-bold text-white/90">✓</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
