import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    q: 'Do I have to migrate my existing projects to try it?',
    a: 'No. Start with one active or upcoming job. The 5-step wizard builds a working SOV in about 20 minutes. Bring the rest over when you\'re ready — nothing forces a big-bang migration.',
  },
  {
    q: "What if my sub-contractor or supplier doesn't have an account?",
    a: "They don't need one. You can send change orders and invoices as external approval links — the recipient opens the link, downloads the PDF, and approves or rejects with one click. No sign-up, no app to install.",
  },
  {
    q: 'Does it actually work on a phone on the jobsite?',
    a: 'Yes. The Field Crew interface is mobile-first with a Today / Up Next / Done task board, photo + voice capture, and offline-tolerant submissions. Install it as a PWA — no app store required. Push notifications work on both iOS and Android.',
  },
  {
    q: 'How is this different from Procore?',
    a: "Flat $89 per company per month — not $$$ per seat. All four roles (GC, Trade, Field Crew, Supplier) included. Purpose-built for change orders, SOV reconciliation, and material returns — the three things that quietly cost teams the most money. And it's actually usable on a phone.",
  },
  {
    q: 'Is my QuickBooks or financial data safe?',
    a: 'We never store your QuickBooks credentials. Integrations use OAuth on a per-user basis, and every organization owns its own data. Row-level security means a GC never sees a Trade\'s labor margins unless the Trade opts in.',
  },
  {
    q: 'Can I cancel? What happens to my data?',
    a: 'Yes, cancel anytime from Settings — no phone call, no retention team. You get a full export window for POs, invoices, COs, SOVs, and returns as PDFs and CSVs. Your data is yours.',
  },
  {
    q: 'Can a GC see my labor margins as a Trade Contractor?',
    a: 'No — by default your labor cost and markup are invisible to the GC. Per-project markup disclosure can be set to hidden, summary, or detailed if you want to share more. The default is privacy.',
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
            The questions<br />that stop <em className="not-italic" style={{ color: 'hsl(var(--amber-d))' }}>sign-ups.</em>
          </h2>
          <p className="text-[0.92rem] leading-[1.75] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Straight answers — no marketing hedge. Don't see yours? Email{' '}
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
