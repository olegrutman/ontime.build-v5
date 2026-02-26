import {
  LandingHeader,
  HeroSection,
  LogoMarquee,
  FeaturesSection,
  HowItWorksSection,
  CTASection,
  Footer,
} from '@/components/landing';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <LogoMarquee />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
