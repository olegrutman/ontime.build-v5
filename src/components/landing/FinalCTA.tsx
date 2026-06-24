import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <AnimatedSection animation="scale">
          <div className="relative p-8 md:p-12 lg:p-16 rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative text-center">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
                <Zap className="h-8 w-8 text-primary" />
              </div>

              {/* Headline */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Ready to get paid faster?
              </h2>
              
              {/* Subtext */}
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join contractors who've upgraded from spreadsheets to professional billing. 
                Start free, upgrade when you're ready.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="xl"
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all group"
                >
                  Get Started — It's Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="border-primary/30 hover:bg-primary/5 text-foreground"
                >
                  Request a Demo
                </Button>
              </div>

              {/* Trust note */}
              <p className="text-sm text-muted-foreground mt-6">
                No credit card required · Free plan available
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
