import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import { ArrowRight, Check, FileText, PackageCheck, Smartphone, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/landing-jobsite-hero.jpg';
import generalContractor from '@/assets/landing-character-general-contractor.png';
import subcontractor from '@/assets/landing-character-subcontractor.png';
import crew from '@/assets/landing-character-crew.png';
import supplier from '@/assets/landing-character-supplier.png';

const roles = [
  {
    name: 'Crew',
    action: 'Captures the field issue',
    detail: 'Photos, location, and scope leave the jobsite together.',
    image: crew,
    icon: Smartphone,
    href: '/for/field-crews',
  },
  {
    name: 'Subcontractor',
    action: 'Builds the price',
    detail: 'Labor, materials, equipment, and markup stay connected.',
    image: subcontractor,
    icon: FileText,
    href: '/for/trade-contractors',
  },
  {
    name: 'General Contractor',
    action: 'Reviews and approves',
    detail: 'Scope, cost, and contract impact appear in one decision.',
    image: generalContractor,
    icon: Check,
    href: '/for/general-contractors',
  },
  {
    name: 'Supplier',
    action: 'Prices and fulfills',
    detail: 'The material order follows the approved work to delivery.',
    image: supplier,
    icon: PackageCheck,
    href: '/for/suppliers',
  },
];

const proof = [
  { value: '4', label: 'companies, one shared workflow' },
  { value: '1', label: 'financial trail from field to payment' },
  { value: '$89', label: 'per company, per month' },
  { value: '∞', label: 'projects and users included' },
];

function ProductProof() {
  return (
    <div className="landing-product-window" aria-label="Change order approval example">
      <div className="landing-window-bar">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-2 w-2 rounded-full bg-state-approved" />
        </div>
        <span>Cherry Hills Park · CO-014</span>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="landing-kicker">Change order ready</p>
            <h3 className="landing-display mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">
              Re-frame bearing wall — Unit 3B
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Alvarez Framing → Northline Builders
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.68rem] font-bold text-foreground">
            Awaiting approval
          </span>
        </div>
        <div className="mt-5 divide-y divide-border/70 border-y border-border/70">
          {[
            ['Labor · 3 carpenters × 14 hrs', '$3,780.00'],
            ['Materials · LVL beam, hangers, strap', '$1,412.65'],
            ['Equipment · telehandler, 1 day', '$385.00'],
            ['Markup · 12%', '$669.32'],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 items-start justify-between gap-4 py-2.5 text-xs sm:text-sm">
              <span className="min-w-0 break-words text-muted-foreground">{label}</span>
              <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-4 pt-4">
          <span className="landing-kicker text-foreground">Change order total</span>
          <span className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">$6,246.97</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-state-approved px-4 py-2 text-xs font-bold text-primary-foreground">Approve</span>
          <span className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground">Request revision</span>
        </div>
      </div>
    </div>
  );
}

export function ConnectedJobsiteStory() {
  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <img
          src={heroImage}
          alt="An active timber-frame construction project at sunrise"
          className="landing-hero-photo"
          width={1920}
          height={1200}
          fetchPriority="high"
        />
        <div className="landing-hero-shade" />
        <div className="relative z-10 mx-auto flex min-h-[680px] max-w-7xl flex-col justify-center px-5 pb-20 pt-28 sm:min-h-[820px] sm:px-[5%] sm:pb-28 sm:pt-36">
          <div className="max-w-3xl animate-fade-up">
            <p className="landing-kicker text-primary">One job. Every company connected.</p>
            <h1 id="landing-title" className="landing-display landing-on-photo mt-5 max-w-[820px] text-[3rem] font-bold leading-[0.98] sm:text-[4.8rem] lg:text-[6rem]">
              The whole job.<br />Working together.
            </h1>
            <p className="landing-on-photo-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Orders, changes, labor, materials, approvals, invoices, and payments move through one connected construction workflow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="landing-primary-cta">
                Create an Account <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <a href="#how" className="landing-secondary-cta">See the workflow</a>
            </div>
            <p className="landing-on-photo-soft mt-4 text-xs font-medium">No credit card · Unlimited users · Cancel anytime</p>
          </div>

          <div className="landing-hero-cast" aria-hidden="true">
            <img src={generalContractor} alt="" className="landing-hero-character" width={1024} height={1536} />
            <div className="landing-status-card">
              <span className="h-2 w-2 shrink-0 rounded-full bg-state-approved" />
              <span>Approved · budget updated</span>
            </div>
          </div>
        </div>
        <div className="landing-hero-proof">
          <span className="landing-kicker landing-on-photo-soft">From field issue to paid invoice</span>
          <span className="landing-proof-rule hidden h-px flex-1 sm:block" />
          <span className="landing-on-photo text-sm font-semibold">One record. No re-entry.</span>
        </div>
      </section>

      <section id="how" className="bg-background px-5 py-20 sm:px-[5%] sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="landing-kicker text-muted-foreground">One connected handoff</p>
            <h2 className="landing-display mt-4 text-4xl font-bold leading-tight text-foreground sm:text-6xl">
              Work moves forward.<br />Nothing gets lost between companies.
            </h2>
          </div>

          <div className="landing-role-track mt-14 sm:mt-20">
            <div className="landing-track-line" aria-hidden="true"><span /></div>
            {roles.map((role, index) => {
              const Icon = role.icon;
              return (
                <Link key={role.name} to={role.href} className="landing-role-scene group">
                  <div className="landing-role-number">0{index + 1}</div>
                  <div className="landing-character-stage">
                    <img src={role.image} alt={`${role.name} professional`} loading="lazy" width={1024} height={1536} />
                    <span className="landing-role-icon"><Icon className="h-4 w-4" /></span>
                  </div>
                  <div className="min-w-0 border-t border-border pt-5">
                    <p className="landing-kicker text-muted-foreground">{role.name}</p>
                    <h3 className="landing-display mt-2 text-xl font-bold text-foreground">{role.action}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.detail}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                      Explore this company <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="overflow-hidden bg-foreground px-5 py-20 text-primary-foreground sm:px-[5%] sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div>
            <p className="landing-kicker text-primary">The record follows the work</p>
            <h2 className="landing-display mt-4 text-4xl font-bold leading-tight sm:text-6xl">See the decision.<br />See the dollars.</h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-primary-foreground/70">
              The field note, scope, price, approval, contract change, invoice, and payment stay attached to the same work—so every company sees what it owns without exposing private margins.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary-foreground/15">
              {proof.map((item) => (
                <div key={item.label} className="bg-foreground p-5 sm:p-6">
                  <div className="landing-display text-3xl font-bold text-primary sm:text-4xl">{item.value}</div>
                  <div className="mt-2 text-xs leading-relaxed text-primary-foreground/60">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <ProductProof />
        </div>
      </section>

      <section id="roles" className="bg-accent px-5 py-20 sm:px-[5%] sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="landing-kicker text-muted-foreground">Built around responsibility</p>
              <h2 className="landing-display mt-4 text-4xl font-bold leading-tight text-foreground sm:text-6xl">One project.<br />The right view for each company.</h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground lg:justify-self-end">
              General Contractors control approvals and project financials. Subcontractors price and coordinate work. Crews report from the field. Suppliers fulfill project demand. Everyone shares progress—not private business data.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <Link key={role.name} to={role.href} className="group flex min-h-44 flex-col justify-between bg-card p-6 no-underline transition-colors hover:bg-background">
                <span className="landing-kicker text-muted-foreground">{role.name}</span>
                <div>
                  <p className="landing-display text-xl font-bold text-foreground">{role.action}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-foreground">See their workflow <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background px-5 py-20 sm:px-[5%] sm:py-28">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 border-y border-border py-12 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-foreground"><WalletCards className="h-6 w-6" /></span>
            <div>
              <p className="landing-kicker text-muted-foreground">Straightforward pricing</p>
              <p className="landing-display mt-1 text-3xl font-bold text-foreground">$89 per company / month</p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Unlimited users. Unlimited projects. All four company workflows. No per-seat tax.</p>
          <Link to="/signup" className="landing-primary-cta shrink-0">Start free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}