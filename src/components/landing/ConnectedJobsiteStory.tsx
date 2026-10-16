import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import { ArrowRight, Check, FileText, PackageCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/landing-photo-jobsite.webp';
import officePhoto from '@/assets/landing-photo-office.webp';
import yardPhoto from '@/assets/landing-photo-yard.webp';
import salesPhoto from '@/assets/landing-photo-sales.webp';
import generalContractor from '@/assets/landing-person-gc.webp';
import subcontractor from '@/assets/landing-person-sub.webp';
import crew from '@/assets/landing-person-crew.webp';
import supplier from '@/assets/landing-person-supplier.webp';

const scenes = [
  { image: officePhoto, alt: 'A contractor team reviewing a project schedule and plans together', label: 'In the office', text: 'Budgets, schedules, and approvals reviewed together.' },
  { image: yardPhoto, alt: 'A supplier and a contractor checking a material order in a lumber yard', label: 'At the yard', text: 'Material orders confirmed against the approved work.' },
  { image: salesPhoto, alt: 'A supplier sales representative on the phone at his desk', label: 'At the desk', text: 'Quotes, deliveries, and invoices handled without re-typing.' },
];

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
            <p className="landing-kicker">Illustrative approval example</p>
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
        <div className="mt-5 border-y border-border py-4 text-sm leading-relaxed text-muted-foreground">
          Re-frame the bearing wall at Unit 3B. Review the submitted scope and quoted total, with each company's private costs kept separate.
        </div>
        <div className="flex items-end justify-between gap-4 pt-4">
          <span className="landing-kicker text-foreground">Change order total</span>
          <span className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">$6,246.97</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-state-approved px-4 py-2 text-xs font-bold text-secondary-foreground">Approve</span>
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
          alt="A superintendent directing his team on an active timber-frame jobsite"
          className="landing-hero-photo"
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="landing-hero-shade" />
        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-5 pb-20 pt-28 sm:min-h-[720px] sm:px-[5%] sm:pb-28 sm:pt-36">
          <div className="max-w-3xl animate-fade-up">
            <p className="landing-kicker text-primary">OnTime.Build · Construction collaboration</p>
            <h1 id="landing-title" className="landing-display landing-on-photo mt-5 max-w-[820px] text-[2.5rem] font-bold leading-[0.98] sm:text-[4rem] lg:text-[4.5rem]">
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
            <p className="landing-on-photo-soft mt-4 text-xs font-medium">$89 per company / month · Unlimited users and projects</p>
          </div>

          <div className="landing-hero-cast" aria-hidden="true">
            <div className="landing-status-card landing-on-photo">
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
              Work moves forward.<br />Nothing gets lost.
            </h2>
          </div>

          <div id="roles" className="landing-connected-track mt-14 sm:mt-20">
            {roles.map((role, index) => {
              const Icon = role.icon;
              return (
                <article key={role.name} className="landing-connected-scene">
                  <div className="landing-connected-image">
                    <span className="landing-connected-number">0{index + 1}</span>
                    <img src={role.image} alt={`${role.name} professional`} loading="lazy" width={640} height={800} />
                    <span className="landing-role-icon"><Icon className="h-5 w-5" /></span>
                  </div>
                  <div className="landing-connected-copy">
                    <p className="landing-kicker text-muted-foreground">{role.name}</p>
                    <h3 className="landing-display mt-3 text-2xl font-bold text-foreground sm:text-4xl">{role.action}</h3>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{role.detail}</p>
                    <Button asChild variant="link" className="mt-5 h-auto p-0 text-foreground"><Link to={role.href}>Explore {role.name === 'Crew' ? 'the crew' : role.name.toLowerCase()} workflow <ArrowRight className="h-4 w-4 shrink-0" /></Link></Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted px-5 py-20 sm:px-[5%] sm:py-24" aria-labelledby="landing-scenes-title">
        <div className="mx-auto max-w-7xl">
          <p className="landing-kicker text-muted-foreground">Field, office, and yard</p>
          <h2 id="landing-scenes-title" className="landing-display mt-4 max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-5xl">
            Everyone on the job sees the same record.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {scenes.map((scene) => (
              <figure key={scene.label} className="landing-scene-card">
                <img src={scene.image} alt={scene.alt} loading="lazy" />
                <figcaption className="p-5">
                  <p className="landing-kicker text-muted-foreground">{scene.label}</p>
                  <p className="mt-2 text-base font-medium leading-relaxed text-foreground">{scene.text}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="landing-dark overflow-hidden bg-foreground px-5 py-20 text-primary-foreground sm:px-[5%] sm:py-28">
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

    </>
  );
}
