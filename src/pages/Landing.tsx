import {
  LandingHeader,
  Footer,
  StickyMobileCTA,
  ConnectedJobsiteStory,
  PricingSection,
  FAQSection,
  CTASection,
} from '@/components/landing';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <ConnectedJobsiteStory />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
