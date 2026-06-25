import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    q: 'How is Ontime.Build priced?',
    a: 'Flat price per company per month — unlimited projects and unlimited users. No per-seat tax, no feature-gated tiers that hide the things you actually need. Enterprise has a custom quote for portfolio reporting, SSO, and dedicated support.',
  },
  {
    q: 'Who owns the project data?',
    a: 'You do. Every organization owns its own data and can export project records (POs, invoices, COs, SOVs, returns) to PDF or CSV at any time. Cancellation gives you a full export window.',
  },
  {
    q: 'Can a GC see my labor margins as a Trade Contractor?',
    a: 'No — by default, your labor cost and markup are invisible to the GC. Per-project markup disclosure can be set to hidden, summary, or detailed if you want to share more. The default is privacy.',
  },
  {
    q: 'Does it work on a phone or tablet in the field?',
    a: 'Yes. The Field Crew interface is mobile-first with a Today / Up Next / Done task board, photo + voice capture, and offline-tolerant submissions. Install it as a PWA — no app store required.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most teams set up their first project in under 30 minutes using the 5-step project wizard. The AI-generated SOV gets you to a working budget on day one. Sasha walks new users through what they\'re looking at.',
  },
  {
    q: 'Do you integrate with QuickBooks, Procore, or other tools?',
    a: 'Native integrations are on the roadmap. Today you can export clean PDFs/CSVs of POs, invoices, and SOVs to push into your accounting system. Tell us which integration to prioritize and it moves up the queue.',
  },
  {
    q: 'Is it really one platform for all four roles?',
    a: 'Yes. The GC, Trade Contractor, Field Crew, and Supplier each have purpose-built views — they\'re not the same screen with different permissions. Each role sees what they own; nothing more, nothing less.',
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 px-[5%] bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-14">
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] font-bold tracking-[2px] uppercase mb-3.5" style={{ color: 'hsl(var(--amber-d))' }}>
            <span className="block w-5 h-[2px]" style={{ background: 'hsl(var(--amber))' }} />
            FAQ
          </div>
          <h2 className="font-heading text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[0.96] tracking-[-1.3px] uppercase mb-5" style={{ color: 'hsl(var(--ink))' }}>
            Questions before<br /><em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>you switch.</em>
          </h2>
          <p className="text-[0.92rem] leading-[1.75] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Don't see yours? Email{' '}
            <a href="mailto:hello@ontime.build" className="font-semibold underline" style={{ color: 'hsl(var(--amber-d))' }}>
              hello@ontime.build
            </a>{' '}
            and we'll get back same day.
          </p>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'hsl(var(--border))' }}>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} style={{ borderBottom: i < faqs.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-[hsl(var(--surface))]"
                  aria-expanded={isOpen}
                >
                  <span className="text-[0.98rem] font-semibold" style={{ color: 'hsl(var(--ink))' }}>{f.q}</span>
                  <span className="flex-shrink-0">
                    {isOpen ? (
                      <Minus className="w-4 h-4" style={{ color: 'hsl(var(--amber-d))' }} />
                    ) : (
                      <Plus className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-[0.9rem] leading-[1.78]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
