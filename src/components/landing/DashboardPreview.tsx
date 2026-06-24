import { AnimatedSection } from '@/components/ui/animated-section';

export function DashboardPreview() {
  return (
    <section className="px-4 pb-20 -mt-8 relative z-10">
      <div className="max-w-5xl mx-auto">
        <AnimatedSection animation="scale" delay={200}>
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-secondary border-b border-border px-4 py-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-warning/40" />
                <div className="w-3 h-3 rounded-full bg-success/40" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
                  app.ontime.build/dashboard
                </div>
              </div>
            </div>
            
            {/* Dashboard content */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-card to-secondary/20">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-background border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Active Projects</div>
                  <div className="text-2xl font-bold text-foreground">12</div>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Pending Invoices</div>
                  <div className="text-2xl font-bold text-primary">$142,850</div>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Pending COs</div>
                  <div className="text-2xl font-bold text-warning">8</div>
                </div>
              </div>

              {/* Activity list */}
              <div className="space-y-2">
                {[
                  { text: 'Riverside Apartments — Invoice #7 Ready', status: 'success' },
                  { text: 'Oak Street Townhomes — CO Approved', status: 'success' },
                  { text: 'Downtown Hotel — Awaiting GC Approval', status: 'warning' },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="p-3 rounded-lg bg-background border border-border flex items-center justify-between hover:border-primary/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">{item.text}</span>
                    <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-success' : 'bg-warning'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
