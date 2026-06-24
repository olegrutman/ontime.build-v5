import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Building2 } from 'lucide-react';

// Landing page sections
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustBar } from '@/components/landing/TrustBar';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { CoreFeatures } from '@/components/landing/CoreFeatures';
import { ProductDemo } from '@/components/landing/ProductDemo';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { RoleBenefits } from '@/components/landing/RoleBenefits';
import { Testimonials } from '@/components/landing/Testimonials';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold text-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />
      
      <main className="flex-1">
        <HeroSection />
        <DashboardPreview />
        <TrustBar />
        <ProblemSolution />
        <div className="core-features">
          <CoreFeatures />
        </div>
        <ProductDemo />
        <HowItWorks />
        <RoleBenefits />
        <Testimonials />
        <FinalCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
