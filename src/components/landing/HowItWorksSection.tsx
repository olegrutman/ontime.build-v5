import { CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Create Work Items',
    description: 'Set up your project structure with SOV items, change orders, and T&M work. Define scope and invite participants.',
  },
  {
    number: '02',
    title: 'Track in the Field',
    description: 'Field staff log labor hours and materials daily. Everything syncs in real-time to the project dashboard.',
  },
  {
    number: '03',
    title: 'Review & Approve',
    description: 'PMs review submissions, add markups, and approve for billing. Full audit trail at every step.',
  },
  {
    number: '04',
    title: 'Generate Invoices',
    description: 'Approved items roll up to SOV. Export billing-ready reports and keep cash flow moving.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      {/* Curved top */}
      <div className="absolute left-0 right-0 -translate-y-full overflow-hidden">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full h-20">
          <path 
            d="M0 80L1440 80L1440 0C1440 0 1080 80 720 80C360 80 0 0 0 0L0 80Z" 
            className="fill-muted/30"
          />
        </svg>
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get from field work to invoice in four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
              )}
              
              <div className="text-center">
                <div className="relative inline-flex">
                  <span className="text-5xl font-bold text-primary/20">{step.number}</span>
                  <CheckCircle2 className="absolute -right-2 -top-2 w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
