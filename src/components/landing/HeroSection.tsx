import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-secondary-foreground">
              Now in public beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Construction billing
            <br />
            made{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">simple</span>
              <span className="absolute -inset-1 bg-primary/10 rounded-lg border-2 border-primary/30" />
              {/* Selection handles */}
              <span className="absolute -top-1.5 -left-1.5 w-3 h-3 border-2 border-primary bg-background rounded-sm" />
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 border-primary bg-background rounded-sm" />
              <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-2 border-primary bg-background rounded-sm" />
              <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-2 border-primary bg-background rounded-sm" />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Streamline change orders, T&M tracking, and SOV management. 
            From field to invoice in minutes, not days.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              asChild
              className="h-12 px-8 text-base shadow-purple hover:shadow-lg transition-all"
            >
              <a href="#auth">
                Start free trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-12 px-8 text-base group"
            >
              <Play className="mr-2 w-4 h-4 group-hover:text-primary transition-colors" />
              Watch demo
            </Button>
          </div>

          {/* Social proof */}
          <p className="mt-10 text-sm text-muted-foreground">
            Trusted by <span className="font-semibold text-foreground">500+</span> contractors nationwide
          </p>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="relative bg-card rounded-2xl border shadow-2xl overflow-hidden mx-auto max-w-5xl">
            <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-state-open/60" />
              <div className="w-3 h-3 rounded-full bg-state-approved/60" />
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-mono">app.ontime.build</span>
              </div>
            </div>
            <div className="aspect-[16/9] bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Dashboard preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
