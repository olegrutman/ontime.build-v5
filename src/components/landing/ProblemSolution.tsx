import { XCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { AnimatedSection, StaggeredChildren } from '@/components/ui/animated-section';

const problems = [
  {
    problem: 'Lost change orders',
    solution: 'Every CO tracked with full approval history',
  },
  {
    problem: 'Delayed approvals',
    solution: 'Instant notifications and one-tap approvals',
  },
  {
    problem: 'Billing confusion',
    solution: 'Clear invoice workflow: Draft → Submitted → Paid',
  },
  {
    problem: 'Scattered spreadsheets',
    solution: 'One platform for your entire project team',
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20 md:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Construction billing is broken
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built Ontime to fix the chaos of change orders, approvals, and payments.
          </p>
        </AnimatedSection>

        {/* Problem → Solution Cards */}
        <StaggeredChildren className="grid md:grid-cols-2 gap-6" staggerDelay={100}>
          {problems.map((item, i) => (
            <div 
              key={i} 
              className="group relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                {/* Problem */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-destructive/70" />
                    <span className="text-sm font-medium text-destructive/70 line-through">
                      {item.problem}
                    </span>
                  </div>
                  
                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 my-2" />
                  
                  {/* Solution */}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-base font-medium text-foreground">
                      {item.solution}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Hover accent */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl" />
            </div>
          ))}
        </StaggeredChildren>
      </div>
    </section>
  );
}
