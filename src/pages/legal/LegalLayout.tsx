import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { LandingHeader, Footer } from '@/components/landing';

interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  updated: string;
  children: ReactNode;
}

export function LegalLayout({ title, description, path, updated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>{title} — Ontime.Build</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://pm.ontime.build${path}`} />
        <meta property="og:title" content={`${title} — Ontime.Build`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://pm.ontime.build${path}`} />
        <meta property="og:type" content="website" />
      </Helmet>
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
          <div className="legal-prose text-slate-700 text-[0.95rem] leading-[1.78] space-y-6">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
