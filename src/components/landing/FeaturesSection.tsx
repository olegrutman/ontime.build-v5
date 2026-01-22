import { FileText, Clock, Receipt, Users, Shield, Zap } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Change Order Management',
    description: 'Create, price, and track change orders with full audit trails. Automated approval workflows keep projects moving.',
    color: 'bg-type-change/10 text-type-change',
  },
  {
    icon: Clock,
    title: 'T&M Period Tracking',
    description: 'Daily and weekly time & material tracking. Field crews log hours, materials flow to billable slices automatically.',
    color: 'bg-type-tm/10 text-type-tm',
  },
  {
    icon: Receipt,
    title: 'SOV Dashboard',
    description: 'Real-time schedule of values with aggregated contract amounts, approved changes, and billing status.',
    color: 'bg-type-sov/10 text-type-sov',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'GC PMs, Trade Contractors, and Field Staff each see exactly what they need. Sensitive pricing stays protected.',
    color: 'bg-type-project/10 text-type-project',
  },
  {
    icon: Shield,
    title: 'Approval Workflows',
    description: 'Multi-level approval chains for estimates, orders, and invoices. Nothing slips through the cracks.',
    color: 'bg-state-approved/10 text-state-approved',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'Live collaboration across teams. See changes as they happen, from field to office.',
    color: 'bg-state-priced/10 text-state-priced',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to manage construction billing
          </h2>
          <p className="text-lg text-muted-foreground">
            From field to invoice, Ontime.Build streamlines your entire billing workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
