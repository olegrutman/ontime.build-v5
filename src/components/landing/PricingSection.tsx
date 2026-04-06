const plans = [
  {
    tier: 'Essentials',
    price: '$89',
    period: '/mo',
    desc: 'For small trade contractors starting to bring operations into one platform.',
    features: [
      { text: 'Unlimited projects' },
      { text: 'Unlimited users' },
      { text: 'Purchase orders' },
      { text: 'Change orders' },
      { text: 'Invoicing & approvals' },
      { text: 'Material returns tracking' },
      { text: 'Change orders', dim: true },
      { text: 'Project budget dashboard', dim: true },
      { text: 'Supplier portal', dim: true },
    ],
    cta: 'Start Free Demo',
    featured: false,
  },
  {
    tier: 'Operations',
    price: '$89',
    period: '/mo',
    desc: 'Full platform access for GCs and TCs running complex multi-trade projects.',
    features: [
      { text: 'Everything in Essentials' },
      { text: 'Change orders' },
      { text: 'Live project budget dashboard' },
      { text: 'Supplier collaboration portal' },
      { text: 'Role-based crew access' },
      { text: 'Sasha AI onboarding assistant' },
      { text: 'Multi-project overview' },
      { text: 'Cost code tracking' },
      { text: 'Priority support' },
    ],
    cta: 'Start Free Demo',
    featured: true,
    badge: 'Most Popular',
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large GC organizations, developers, and CM firms managing full portfolios.',
    features: [
      { text: 'Everything in Operations' },
      { text: 'Portfolio-level reporting' },
      { text: 'API & custom integrations' },
      { text: 'Dedicated account manager' },
      { text: 'SSO / SAML support' },
      { text: 'Custom onboarding + SLA' },
      { text: 'White-label option' },
      { text: 'Volume pricing available' },
    ],
    cta: 'Talk to Sales',
    featured: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-[5%]" style={{ background: 'hsl(var(--surface))' }}>
      <div className="mb-14">
        <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
          <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
          Pricing
        </div>
        <h2 className="font-heading text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-1.5px] uppercase" style={{ color: 'hsl(var(--ink))' }}>
          Simple Pricing.<br /><em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>No Surprises.</em>
        </h2>
        <p className="max-w-[500px] text-base leading-[1.75] mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          One flat price. Unlimited projects. Unlimited users. The whole platform — not a feature-gated tier system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' }}>
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`p-[40px_34px] relative ${
              plan.featured ? 'text-white' : 'bg-white'
            }`}
            style={plan.featured ? { background: 'hsl(var(--navy))', borderTop: '3px solid hsl(var(--amber))' } : {}}
          >
            {plan.badge && (
              <div className="absolute top-[18px] right-[18px] text-[0.6rem] font-bold tracking-[1px] uppercase px-2.5 py-1 rounded-full"
                style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
              >
                {plan.badge}
              </div>
            )}
            <div className={`text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5 ${plan.featured ? 'text-white/[0.38]' : ''}`}
              style={!plan.featured ? { color: 'hsl(var(--muted-foreground))' } : {}}
            >
              {plan.tier}
            </div>
            <div className={`font-heading font-black leading-none tracking-[-1px] mb-1 ${
              plan.price === 'Custom' ? 'text-[2.2rem]' : 'text-[3.2rem]'
            } ${plan.featured ? 'text-white' : ''}`}
              style={!plan.featured ? { color: 'hsl(var(--ink))' } : {}}
            >
              {plan.price}
              {plan.period && <span className={`text-[1.3rem] font-normal ${plan.featured ? 'text-white/[0.32]' : ''}`} style={!plan.featured ? { color: 'hsl(var(--muted-foreground))' } : {}}>{plan.period}</span>}
            </div>
            <div className={`text-[0.83rem] mb-6 pb-6 border-b ${plan.featured ? 'text-white/[0.38] border-white/[0.08]' : ''}`}
              style={!plan.featured ? { color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' } : {}}
            >
              {plan.desc}
            </div>
            <ul className="flex flex-col gap-[11px] mb-7">
              {plan.features.map((f) => (
                <li
                  key={f.text}
                  className={`flex items-start gap-[9px] text-[0.84rem] ${
                    f.dim ? 'opacity-35' : plan.featured ? 'text-white/[0.52]' : ''
                  }`}
                  style={!f.dim && !plan.featured ? { color: 'hsl(var(--muted-foreground))' } : {}}
                >
                  <span className="flex-shrink-0 font-bold" style={{ color: f.dim ? 'hsl(var(--muted-foreground))' : 'hsl(var(--amber-d))' }}>
                    {f.dim ? '—' : '✓'}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            {plan.featured ? (
              <a
                href="/signup"
                className="block text-center py-3 px-6 rounded-[5px] text-[0.88rem] font-bold transition-all no-underline shadow-amber-lg hover:brightness-110"
                style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
              >
                {plan.cta}
              </a>
            ) : (
              <a
                href={plan.cta === 'Talk to Sales' ? '#' : '/signup'}
                className="block text-center py-3 px-6 border-[1.5px] rounded-[5px] text-[0.88rem] font-medium transition-all no-underline"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--ink2))' }}
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
