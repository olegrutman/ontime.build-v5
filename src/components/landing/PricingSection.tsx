import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  'Unlimited users and projects',
  'Change orders and work orders',
  'Purchase orders and supplier collaboration',
  'Invoices, approvals, and payment tracking',
  'Live project budgets and role-based access',
  'Field updates, photos, and material returns',
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-accent px-5 py-20 sm:px-[5%] sm:py-28">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[0.88fr_1.12fr]">
        <div className="flex flex-col justify-between bg-foreground p-7 text-primary-foreground sm:p-12">
          <div>
            <p className="landing-kicker text-primary">One flat price</p>
            <div className="landing-display mt-6 flex flex-wrap items-end gap-2">
              <span className="text-6xl font-bold sm:text-8xl">$89</span>
              <span className="pb-2 text-sm text-primary-foreground/60">per company / month</span>
            </div>
            <p className="mt-6 max-w-md text-base leading-relaxed text-primary-foreground/70">The complete connected workflow. No per-seat charge and no feature maze.</p>
          </div>
          <Link to="/signup" className="landing-primary-cta mt-10 w-fit">Create an Account <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="p-7 sm:p-12">
          <p className="landing-kicker text-muted-foreground">Everything your company needs</p>
          <h2 className="landing-display mt-4 max-w-xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">Every job. Every user. Every core workflow.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex min-w-0 items-start gap-3 border-t border-border pt-4 text-sm font-medium text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-state-approved" />
                <span className="min-w-0 break-words">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
