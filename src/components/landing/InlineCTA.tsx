import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface InlineCTAProps {
  eyebrow: string;
  headline: string;
  ctaText?: string;
}

export function InlineCTA({ eyebrow, headline, ctaText = 'Start free — 2 min setup' }: InlineCTAProps) {
  return (
    <section className="px-[5%] py-10 sm:py-14">
      <div
        className="max-w-6xl mx-auto rounded-2xl px-6 sm:px-10 py-8 sm:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        style={{
          background: 'linear-gradient(120deg, hsl(var(--navy)) 0%, #0B1830 100%)',
          border: '1px solid hsl(var(--amber) / 0.2)',
          boxShadow: '0 20px 60px hsl(var(--navy) / 0.18)',
        }}
      >
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: 'hsl(var(--amber))' }}>
            {eyebrow}
          </div>
          <div className="font-heading text-[1.5rem] sm:text-[1.9rem] font-black leading-[1.05] tracking-[-0.5px] uppercase text-white max-w-[560px]">
            {headline}
          </div>
        </div>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[6px] text-[0.95rem] font-bold no-underline shadow-amber-lg hover:brightness-110 hover:-translate-y-px transition-all flex-shrink-0 self-start md:self-auto"
          style={{ background: 'hsl(var(--amber))', color: 'hsl(var(--navy-d))' }}
        >
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
