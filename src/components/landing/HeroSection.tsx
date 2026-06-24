import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-secondary/30 -z-10" />
      
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <AnimatedSection animation="fade-up" delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              Built for construction teams
            </span>
          </div>
        </AnimatedSection>

        {/* Main Headline */}
        <AnimatedSection animation="fade-up" delay={100}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6 tracking-tight">
            Change orders & billing
            <span className="block mt-2">
              <span className="text-primary">made simple</span>
            </span>
          </h1>
        </AnimatedSection>

        {/* Subheadline */}
        <AnimatedSection animation="fade-up" delay={200}>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop chasing paper. Ontime.Build streamlines change order approvals, invoicing, 
            and billing for GCs, trade contractors, and field crews.
          </p>
        </AnimatedSection>

        {/* CTAs */}
        <AnimatedSection animation="fade-up" delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="xl"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all group"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => {
                const howItWorks = document.getElementById('how-it-works');
                howItWorks?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-border hover:bg-secondary"
            >
              <Play className="h-4 w-4 mr-2" />
              See How It Works
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
