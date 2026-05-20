import { lazy, Suspense } from 'react';
import {
  LandingHeader,
  HeroSection,
  StatsStrip,
  PersonaSwitcher,
  Footer,
  StickyMobileCTA,
} from '@/components/landing';

// Below-the-fold sections — lazy loaded
const FeaturesSection = lazy(() => import('@/components/landing/FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const AISection = lazy(() => import('@/components/landing/AISection').then(m => ({ default: m.AISection })));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const TMModeSection = lazy(() => import('@/components/landing/TMModeSection').then(m => ({ default: m.TMModeSection })));
const RolesSection = lazy(() => import('@/components/landing/RolesSection').then(m => ({ default: m.RolesSection })));
const SecurityPrivacySection = lazy(() => import('@/components/landing/SecurityPrivacySection').then(m => ({ default: m.SecurityPrivacySection })));
const ComparisonTable = lazy(() => import('@/components/landing/ComparisonTable').then(m => ({ default: m.ComparisonTable })));
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
const IntegrationsStrip = lazy(() => import('@/components/landing/IntegrationsStrip').then(m => ({ default: m.IntegrationsStrip })));
const CTASection = lazy(() => import('@/components/landing/CTASection').then(m => ({ default: m.CTASection })));

const Fallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsStrip />
        <PersonaSwitcher />
        <Suspense fallback={<Fallback />}>
          <FeaturesSection />
          <AISection />
          <HowItWorksSection />
          <TMModeSection />
          <RolesSection />
          <SecurityPrivacySection />
          <ComparisonTable />
          <TestimonialsSection />
          <PricingSection />
          <FAQSection />
          <IntegrationsStrip />
          <CTASection />
        </Suspense>
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
