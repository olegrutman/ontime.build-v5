import { HardHat, Briefcase, Building2 } from 'lucide-react';
import { AnimatedSection, StaggeredChildren } from '@/components/ui/animated-section';

const roles = [
  {
    icon: HardHat,
    role: 'Field Crews',
    color: 'bg-warning/10 text-warning border-warning/20',
    benefits: [
      'Log change orders on-site with your phone',
      'Attach photos and location details instantly',
      'Track your labor hours and materials',
      'Get notified when COs are approved',
    ],
  },
  {
    icon: Briefcase,
    role: 'Trade Contractors',
    color: 'bg-primary/10 text-primary border-primary/20',
    benefits: [
      'Review and price field crew submissions',
      'Add your markup before sending to GC',
      'Generate invoices from approved COs',
      'Full visibility into your project pipeline',
    ],
  },
  {
    icon: Building2,
    role: 'General Contractors',
    color: 'bg-success/10 text-success border-success/20',
    benefits: [
      'Approve or reject COs with one tap',
      'See only the pricing layer meant for you',
      'Track all pending approvals in one dashboard',
      'Complete audit trail for every change',
    ],
  },
];

export function RoleBenefits() {
  return (
    <section className="py-20 md:py-28 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built for your role
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every team member gets the tools they need, with the visibility they should have
          </p>
        </AnimatedSection>

        {/* Role Cards */}
        <StaggeredChildren className="grid md:grid-cols-3 gap-6" staggerDelay={150}>
          {roles.map((item, i) => (
            <div 
              key={i} 
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300"
            >
              {/* Role Header */}
              <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl ${item.color} border mb-6`}>
                <item.icon className="h-5 w-5" />
                <span className="font-semibold">{item.role}</span>
              </div>

              {/* Benefits List */}
              <ul className="space-y-3">
                {item.benefits.map((benefit, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </StaggeredChildren>
      </div>
    </section>
  );
}
