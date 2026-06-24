import { 
  FileStack, 
  Receipt, 
  MapPin, 
  Package, 
  Eye, 
  Bell,
  ArrowUpDown
} from 'lucide-react';
import { AnimatedSection, StaggeredChildren } from '@/components/ui/animated-section';

const features = [
  {
    icon: FileStack,
    title: 'Change Order Management',
    description: 'Full FC → TC → GC approval flow with complete audit trail',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Receipt,
    title: 'Invoice Tracking',
    description: 'Clear status workflow: Submitted, Approved, Paid',
    color: 'bg-success/10 text-success',
  },
  {
    icon: MapPin,
    title: 'Location-Based COs',
    description: 'Track by building, floor, unit, and room',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    icon: Package,
    title: 'Material & Equipment',
    description: 'Detailed cost breakdowns with responsibility tracking',
    color: 'bg-warning/10 text-warning',
  },
  {
    icon: Eye,
    title: 'Role-Based Visibility',
    description: 'Control who sees what costs and markups',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    icon: Bell,
    title: 'Approval Notifications',
    description: 'Instant alerts when items need your attention',
    color: 'bg-pink-500/10 text-pink-500',
  },
];

export function CoreFeatures() {
  return (
    <section className="py-20 md:py-28 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <ArrowUpDown className="h-4 w-4" />
            Core Features
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything you need to get paid
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built tools for construction billing that actually work the way you do.
          </p>
        </AnimatedSection>

        {/* Feature Grid */}
        <StaggeredChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={80}>
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </StaggeredChildren>
      </div>
    </section>
  );
}
