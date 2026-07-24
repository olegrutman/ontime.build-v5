import { lazy, Suspense } from 'react';
import {
  LandingHeader,
  HeroSection,
  StatsStrip,
  Footer,
  StickyMobileCTA,
} from '@/components/landing';
import { ProblemSolutionSection } from '@/components/landing/ProblemSolutionSection';
import { ProofBand } from '@/components/landing/ProofBand';
import { InlineCTA } from '@/components/landing/InlineCTA';

// Below-the-fold — lazy loaded so mobile hero paints fast
const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const RolesSection = lazy(() => import('@/components/landing/RolesSection').then(m => ({ default: m.RolesSection })));
const AISection = lazy(() => import('@/components/landing/AISection').then(m => ({ default: m.AISection })));
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
const CTASection = lazy(() => import('@/components/landing/CTASection').then(m => ({ default: m.CTASection })));

const Fallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        {/* Above the fold — mobile-first, fast */}
        <HeroSection />
        <ProofBand />
        <StatsStrip />

        {/* Problem → solution: strongest conversion angle */}
        <ProblemSolutionSection />

        {/* Mid-scroll CTA #1 — capture the "I get it" buyer */}
        <InlineCTA
          eyebrow="Ready when you are"
          headline="Fix the loop between office, field, and supplier — today."
        />

        <Suspense fallback={<Fallback />}>
          <FeaturesSection />
          <HowItWorksSection />
          <RolesSection />
          <AISection />

          {/* Mid-scroll CTA #2 — after AI + roles proof */}
          <InlineCTA
            eyebrow="One flat price · Unlimited users"
            headline="$89 per company. All four roles included. No per-seat tax."
            ctaText="See pricing & sign up"
          />

          {/* Pricing raised above testimonials — it's the wedge vs Procore */}
          <PricingSection />
          <TestimonialsSection />
          <FAQSection />
          <CTASection />
        </Suspense>
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
