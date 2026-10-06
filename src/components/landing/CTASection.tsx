import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-foreground px-5 py-24 text-center sm:px-[5%] sm:py-32">
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-7xl bg-primary-foreground/15" />
      <p className="landing-kicker relative text-primary">Bring the whole job together</p>
      <h2 className="landing-display relative mx-auto mt-5 max-w-4xl text-4xl font-bold leading-tight text-primary-foreground sm:text-7xl">
        Start with the next job.<br />Keep every handoff connected.
      </h2>
      <p className="relative mx-auto mb-9 mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/65">
        Replace scattered texts, spreadsheets, and paper trails with one shared record from field issue to final payment.
      </p>
      <div className="relative flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/signup" className="landing-primary-cta">Create an Account <ArrowRight className="h-4 w-4" /></Link>
        <a
          href="mailto:hello@ontime.build?subject=Ontime.Build%20demo%20request"
          className="landing-secondary-cta"
        >
          Talk to Sales
        </a>
      </div>
      <div className="relative mx-auto mt-6 grid max-w-[440px] grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:max-w-none sm:justify-center sm:gap-6">
        {['No credit card required', 'Full platform access', 'Setup in under 30 min', '$89 / company / month'].map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-[0.75rem] text-primary-foreground/45">
            <span className="font-bold text-primary">✓</span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
