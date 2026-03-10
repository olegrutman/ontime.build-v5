const plans = [
  {
    tier: 'Starter',
    price: '$299',
    period: '/mo',
    desc: 'For small contractors managing up to 3 active projects.',
    features: [
      { text: 'Up to 3 active projects' },
      { text: 'Unlimited users' },
      { text: 'RFIs & Submittals' },
      { text: 'Document control' },
      { text: 'Daily logs & field reports' },
      { text: 'Mobile app (iOS & Android)' },
      { text: 'Budget & cost management', dim: true },
      { text: 'Advanced analytics', dim: true },
      { text: 'API access', dim: true },
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    tier: 'Professional',
    price: '$699',
    period: '/mo',
    desc: 'For growing GCs managing multiple commercial or hospitality projects.',
    features: [
      { text: 'Up to 15 active projects' },
      { text: 'Unlimited users' },
      { text: 'Everything in Starter' },
      { text: 'Budget & cost management' },
      { text: 'Change order management' },
      { text: 'Punch list & closeout' },
      { text: 'Gantt scheduling' },
      { text: 'Advanced analytics' },
      { text: 'API access', dim: true },
    ],
    cta: 'Start Free Trial',
    featured: true,
    badge: 'Most Popular',
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large GCs, CMs, and developers managing full portfolios.',
    features: [
      { text: 'Unlimited projects' },
      { text: 'Unlimited users' },
      { text: 'Everything in Professional' },
      { text: 'Portfolio analytics' },
      { text: 'API & custom integrations' },
      { text: 'Dedicated CSM' },
      { text: 'SSO / SAML' },
      { text: 'Custom onboarding & SLA' },
    ],
    cta: 'Talk to Sales',
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-[5%] bg-[#F5F6F8]">
      <div className="mb-14">
        <div className="flex items-center gap-2 text-[0.72rem] font-bold tracking-[2px] uppercase text-[#E85A00] mb-3.5">
          <span className="block w-5 h-[2px] bg-[#E85A00]" />
          Pricing
        </div>
        <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase text-[hsl(220,22%,15%)]">
          Simple Pricing.<br /><em className="text-[#E85A00] not-italic">No Surprises.</em>
        </h2>
        <p className="text-[hsl(220,5%,42%)] max-w-[500px] text-base leading-[1.75] mt-4">
          Unlimited users on every plan. Pay per project, not per seat. Cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[hsl(220,13%,91%)] border border-[hsl(220,13%,91%)] rounded-xl overflow-hidden">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`p-[40px_34px] relative ${
              plan.featured
                ? 'bg-[hsl(220,22%,15%)] text-white border-t-[3px] border-t-[#E85A00]'
                : 'bg-white'
            }`}
          >
            {plan.badge && (
              <div className="absolute top-[18px] right-[18px] bg-[#E85A00] text-white text-[0.62rem] font-bold tracking-[1px] uppercase px-2.5 py-1 rounded-full">
                {plan.badge}
              </div>
            )}
            <div className={`text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5 ${plan.featured ? 'text-white/45' : 'text-[hsl(220,5%,62%)]'}`}>
              {plan.tier}
            </div>
            <div className={`font-heading font-black leading-none tracking-[-1px] mb-1 ${
              plan.price === 'Custom' ? 'text-[2.2rem]' : 'text-[3.2rem]'
            } ${plan.featured ? 'text-white' : 'text-[hsl(220,22%,15%)]'}`}>
              {plan.price}
              {plan.period && <span className={`text-[1.3rem] font-normal ${plan.featured ? 'text-white/40' : 'text-[hsl(220,5%,62%)]'}`}>{plan.period}</span>}
            </div>
            <div className={`text-[0.83rem] mb-6 pb-6 border-b ${plan.featured ? 'text-white/45 border-white/[0.08]' : 'text-[hsl(220,5%,42%)] border-[hsl(220,13%,91%)]'}`}>
              {plan.desc}
            </div>
            <ul className="flex flex-col gap-[11px] mb-7">
              {plan.features.map((f) => (
                <li
                  key={f.text}
                  className={`flex items-start gap-[9px] text-[0.85rem] ${
                    f.dim
                      ? 'opacity-35'
                      : plan.featured
                        ? 'text-white/60'
                        : 'text-[hsl(220,5%,42%)]'
                  }`}
                >
                  <span className={`flex-shrink-0 font-bold ${f.dim ? 'text-[hsl(220,5%,62%)]' : 'text-[#E85A00]'}`}>
                    {f.dim ? '—' : '✓'}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            {plan.featured ? (
              <a
                href="/signup"
                className="block text-center py-3 px-6 bg-[#E85A00] text-white rounded-[5px] text-[0.88rem] font-semibold shadow-[0_4px_14px_rgba(232,90,0,.35)] hover:bg-[#FF6F1A] transition-all no-underline"
              >
                {plan.cta}
              </a>
            ) : (
              <a
                href={plan.cta === 'Talk to Sales' ? '#' : '/signup'}
                className="block text-center py-3 px-6 border-[1.5px] border-[hsl(220,13%,82%)] text-[hsl(220,15%,26%)] rounded-[5px] text-[0.88rem] font-medium hover:border-[#E85A00] hover:text-[#E85A00] transition-all no-underline"
              >
                {plan.cta}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
