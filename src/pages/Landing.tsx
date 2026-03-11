import {
  LandingHeader,
  HeroSection,
  StatsStrip,
  FeaturesSection,
  HowItWorksSection,
  RolesSection,
  IntegrationsStrip,
  TestimonialsSection,
  PricingSection,
  CTASection,
  Footer,
} from '@/components/landing';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <RolesSection />
        <IntegrationsStrip />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
