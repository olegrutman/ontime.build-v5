import { Star, Quote } from 'lucide-react';
import { AnimatedSection, StaggeredChildren } from '@/components/ui/animated-section';

const testimonials = [
  {
    quote: "Finally, a billing system that understands how construction actually works. Change orders flow seamlessly from field to office.",
    author: "Mike R.",
    role: "Framing Contractor",
    company: "Summit Framing LLC",
  },
  {
    quote: "We cut our invoice processing time in half. The approval workflow is exactly what we needed.",
    author: "Sarah T.",
    role: "Project Manager",
    company: "Coastal Construction",
  },
  {
    quote: "My field crews can submit COs from their phones. No more lost paperwork, no more delays.",
    author: "James L.",
    role: "Trade Contractor",
    company: "Precision MEP",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <AnimatedSection className="text-center mb-16">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-warning text-warning" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Contractors love Ontime
          </h2>
          <p className="text-lg text-muted-foreground">
            Join hundreds of teams getting paid faster
          </p>
        </AnimatedSection>

        {/* Testimonial Cards */}
        <StaggeredChildren className="grid md:grid-cols-3 gap-6" staggerDelay={120}>
          {testimonials.map((item, i) => (
            <div 
              key={i} 
              className="relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              {/* Quote text */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{item.quote}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {item.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{item.author}</p>
                  <p className="text-xs text-muted-foreground">{item.role} · {item.company}</p>
                </div>
              </div>
            </div>
          ))}
        </StaggeredChildren>
      </div>
    </section>
  );
}
