import { ReactNode, useEffect } from 'react';
import { LandingHeader, Footer } from '@/components/landing';

interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  updated: string;
  children: ReactNode;
}

export function LegalLayout({ title, description, path, updated, children }: LegalLayoutProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} — Ontime.Build`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    metaDesc?.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.href ?? '';
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://pm.ontime.build${path}`;

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      if (canonical && prevCanonical) canonical.href = prevCanonical;
    };
  }, [title, description, path]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <LandingHeader />
      <main className="flex-1 px-[5%] py-16 md:py-24">
        <article className="mx-auto max-w-3xl">
          <div className="mb-10">
            <div className="text-[0.7rem] font-bold tracking-[2px] uppercase mb-3" style={{ color: 'hsl(var(--amber))' }}>
              Legal
            </div>
            <h1 className="font-heading text-[clamp(2.2rem,4.5vw,3.4rem)] font-black leading-[0.95] tracking-[-1px] uppercase text-slate-900">
              {title}
            </h1>
            <div className="mt-4 text-[0.82rem] text-slate-500">Last updated: {updated}</div>
          </div>
          <div className="text-slate-700 text-[0.95rem] leading-[1.78] space-y-6 [&_h2]:font-heading [&_h2]:text-[1.4rem] [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:tracking-[0.3px] [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-heading [&_h3]:text-[1.05rem] [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-[0.5px] [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:underline [&_a]:text-slate-900 hover:[&_a]:opacity-70 [&_strong]:text-slate-900">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
