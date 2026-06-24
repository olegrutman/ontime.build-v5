import { Building, HardHat, Hammer, Wrench, Construction } from 'lucide-react';
import { AnimatedSection } from '@/components/ui/animated-section';

const trustItems = [
  { icon: Building, label: 'Commercial Builders' },
  { icon: HardHat, label: 'Residential Contractors' },
  { icon: Hammer, label: 'Framing Teams' },
  { icon: Wrench, label: 'MEP Contractors' },
  { icon: Construction, label: 'Specialty Trades' },
];

export function TrustBar() {
  return (
    <section className="py-12 border-y border-border bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection animation="fade-in">
          <p className="text-center text-sm font-medium text-muted-foreground mb-8">
            Trusted by contractors nationwide
          </p>
          
          {/* Scrolling logo marquee effect */}
          <div className="relative overflow-hidden">
            <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
              {trustItems.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
