import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-8">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to streamline your billing?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join hundreds of contractors who have simplified their change order and T&M workflow. Start your free trial today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="h-14 px-10 text-lg shadow-purple hover:shadow-lg transition-all"
            >
              Start free trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-10 text-lg"
            >
              Talk to sales
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
