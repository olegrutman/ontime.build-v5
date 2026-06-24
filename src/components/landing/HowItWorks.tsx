import { FolderPlus, FileEdit, CheckCheck, Banknote, ArrowRight } from 'lucide-react';
import { AnimatedSection, StaggeredChildren } from '@/components/ui/animated-section';

const steps = [
  {
    step: 1,
    icon: FolderPlus,
    title: 'Create Project',
    description: 'Set up your project with team members, roles, and Schedule of Values',
  },
  {
    step: 2,
    icon: FileEdit,
    title: 'Submit Change Order',
    description: 'Field crews log changes with location, materials, and labor details',
  },
  {
    step: 3,
    icon: CheckCheck,
    title: 'Get Approvals',
    description: 'TCs review and price, then route to GCs with margin layers intact',
  },
  {
    step: 4,
    icon: Banknote,
    title: 'Invoice & Get Paid',
    description: 'Generate professional invoices and track payments to completion',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From project kickoff to final payment in four simple steps
          </p>
        </AnimatedSection>

        {/* Steps - Horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <StaggeredChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={150}>
            {steps.map((item, i) => (
              <div key={i} className="relative text-center group">
                {/* Step number bubble */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 mb-6 group-hover:border-primary group-hover:bg-primary/20 transition-all mx-auto">
                  <item.icon className="h-7 w-7 text-primary" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>

                {/* Arrow connector (mobile/tablet) */}
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden sm:block lg:hidden absolute -right-4 top-8 h-5 w-5 text-border" />
                )}
              </div>
            ))}
          </StaggeredChildren>
        </div>
      </div>
    </section>
  );
}
