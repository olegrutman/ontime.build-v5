import { useState, useEffect, useCallback } from 'react';
import { 
  FileEdit, 
  Send, 
  CheckCircle, 
  Receipt, 
  ArrowRight,
  ArrowLeft,
  MapPin,
  DollarSign,
  Users,
  ClipboardCheck,
  Pause,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const workflows = [
  {
    id: 'change-order',
    title: 'Submit a Change Order',
    subtitle: 'From field to approval in minutes',
    steps: [
      {
        icon: FileEdit,
        label: 'Create CO',
        description: 'Field crew logs the change with photos and details',
        preview: {
          title: 'New Change Order',
          fields: [
            { label: 'Title', value: 'Add outlet in master bedroom' },
            { label: 'Location', value: 'Unit 204 → Floor 2 → Master BR' },
            { label: 'Scope', value: 'Addition' },
          ],
          status: 'draft',
        },
      },
      {
        icon: MapPin,
        label: 'Add Details',
        description: 'Specify location, materials, and labor hours',
        preview: {
          title: 'Cost Breakdown',
          fields: [
            { label: 'Labor', value: '2.5 hrs @ $65/hr = $162.50' },
            { label: 'Materials', value: 'Outlet + wiring = $45.00' },
            { label: 'Total', value: '$207.50', highlight: true },
          ],
          status: 'draft',
        },
      },
      {
        icon: Send,
        label: 'Submit',
        description: 'Route to Trade Contractor for review',
        preview: {
          title: 'CO #14 Submitted',
          fields: [
            { label: 'Submitted to', value: 'Trade Contractor' },
            { label: 'Waiting for', value: 'Review & Pricing' },
          ],
          status: 'pending',
        },
      },
      {
        icon: CheckCircle,
        label: 'Approved',
        description: 'TC prices and routes to GC for final approval',
        preview: {
          title: 'CO #14 Approved',
          fields: [
            { label: 'FC Price', value: '$207.50' },
            { label: 'TC Price to GC', value: '$285.00' },
            { label: 'Approved by', value: 'Summit Construction' },
          ],
          status: 'approved',
        },
      },
    ],
  },
  {
    id: 'invoice',
    title: 'Generate an Invoice',
    subtitle: 'Professional billing in one click',
    steps: [
      {
        icon: ClipboardCheck,
        label: 'Select Items',
        description: 'Choose SOV line items and approved COs to bill',
        preview: {
          title: 'Invoice Items',
          fields: [
            { label: 'Framing — 45%', value: '$42,750.00', checked: true },
            { label: 'Rough Electrical — 30%', value: '$28,500.00', checked: true },
            { label: 'CO #14 — Outlet', value: '$285.00', checked: true },
          ],
          status: 'draft',
        },
      },
      {
        icon: DollarSign,
        label: 'Review Totals',
        description: 'Automatic retention and previous billing calculations',
        preview: {
          title: 'Invoice Summary',
          fields: [
            { label: 'This Period', value: '$71,535.00' },
            { label: 'Less 10% Retainage', value: '-$7,153.50' },
            { label: 'Amount Due', value: '$64,381.50', highlight: true },
          ],
          status: 'draft',
        },
      },
      {
        icon: Send,
        label: 'Submit',
        description: 'Send to GC for approval',
        preview: {
          title: 'Invoice #7 Submitted',
          fields: [
            { label: 'Submitted', value: 'Jan 12, 2026' },
            { label: 'Awaiting', value: 'GC Approval' },
          ],
          status: 'pending',
        },
      },
      {
        icon: Receipt,
        label: 'Get Paid',
        description: 'Track payment status to completion',
        preview: {
          title: 'Invoice #7 Paid',
          fields: [
            { label: 'Amount', value: '$64,381.50' },
            { label: 'Paid on', value: 'Jan 28, 2026' },
            { label: 'Status', value: 'Complete ✓' },
          ],
          status: 'approved',
        },
      },
    ],
  },
  {
    id: 'team',
    title: 'Manage Your Team',
    subtitle: 'Role-based access and visibility',
    steps: [
      {
        icon: Users,
        label: 'Add Members',
        description: 'Invite team members with specific roles',
        preview: {
          title: 'Project Team',
          fields: [
            { label: 'Mike R.', value: 'Field Crew', role: 'fc' },
            { label: 'Sarah T.', value: 'Trade Contractor', role: 'tc' },
            { label: 'James L.', value: 'General Contractor', role: 'gc' },
          ],
          status: 'draft',
        },
      },
      {
        icon: MapPin,
        label: 'Set Visibility',
        description: 'Control who sees what pricing layers',
        preview: {
          title: 'Cost Visibility',
          fields: [
            { label: 'FC sees', value: 'Their own costs' },
            { label: 'TC sees', value: 'FC costs + markup' },
            { label: 'GC sees', value: 'TC pricing only' },
          ],
          status: 'draft',
        },
      },
      {
        icon: Send,
        label: 'Notify',
        description: 'Automatic alerts for pending approvals',
        preview: {
          title: 'Notifications',
          fields: [
            { label: 'Email', value: 'On submission & approval' },
            { label: 'Dashboard', value: 'Real-time updates' },
          ],
          status: 'pending',
        },
      },
      {
        icon: CheckCircle,
        label: 'Collaborate',
        description: 'Everyone stays in sync automatically',
        preview: {
          title: 'Team Synced',
          fields: [
            { label: 'Active projects', value: '12' },
            { label: 'Pending items', value: '3' },
            { label: 'This month', value: '$428,500 billed' },
          ],
          status: 'approved',
        },
      },
    ],
  },
];

const AUTOPLAY_INTERVAL = 3000; // 3 seconds per step

export function ProductDemo() {
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const workflow = workflows[activeWorkflow];
  const step = workflow.steps[activeStep];

  // Auto-advance to next step or workflow
  const autoAdvance = useCallback(() => {
    setActiveStep((prevStep) => {
      const currentWorkflow = workflows[activeWorkflow];
      if (prevStep < currentWorkflow.steps.length - 1) {
        return prevStep + 1;
      } else {
        // Move to next workflow and reset step
        setActiveWorkflow((prevWorkflow) => 
          prevWorkflow < workflows.length - 1 ? prevWorkflow + 1 : 0
        );
        return 0;
      }
    });
  }, [activeWorkflow]);

  // Autoplay effect
  useEffect(() => {
    if (isPaused || isHovered) return;

    const interval = setInterval(autoAdvance, AUTOPLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, isHovered, autoAdvance]);

  const nextStep = () => {
    if (activeStep < workflow.steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const selectWorkflow = (index: number) => {
    setActiveWorkflow(index);
    setActiveStep(0);
  };

  return (
    <section className="py-20 md:py-28 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <ClipboardCheck className="h-4 w-4" />
            Interactive Demo
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            See how it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Walk through real workflows and see how Ontime simplifies your day
          </p>
        </div>

        {/* Workflow Tabs with Pause Control */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-10">
          {workflows.map((wf, i) => (
            <button
              key={wf.id}
              onClick={() => selectWorkflow(i)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                activeWorkflow === i
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              )}
            >
              {wf.title}
            </button>
          ))}
          
          {/* Pause/Play Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isPaused 
                ? "bg-primary text-primary-foreground" 
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            )}
            title={isPaused ? "Resume autoplay" : "Pause autoplay"}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>

        {/* Demo Container */}
        <div 
          className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Workflow Header with Progress */}
          <div className="bg-secondary/50 border-b border-border px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{workflow.title}</h3>
                <p className="text-sm text-muted-foreground">{workflow.subtitle}</p>
              </div>
              {isHovered && !isPaused && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded animate-fade-in">
                  Paused on hover
                </span>
              )}
            </div>
            {/* Autoplay Progress Bar */}
            {!isPaused && !isHovered && (
              <div className="h-1 bg-border rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    animation: `progress ${AUTOPLAY_INTERVAL}ms linear infinite`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left: Step Navigation */}
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-border">
              {/* Progress Steps */}
              <div className="space-y-4 mb-8">
                {workflow.steps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={cn(
                      "w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all",
                      activeStep === i
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    {/* Step indicator */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                      activeStep === i
                        ? "bg-primary text-primary-foreground"
                        : i < activeStep
                        ? "bg-success/20 text-success"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {i < activeStep ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <s.icon className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium mb-0.5",
                        activeStep === i ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {s.label}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  disabled={activeStep === workflow.steps.length - 1}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="p-6 bg-secondary/20 flex items-center justify-center min-h-[400px]">
              <div className="w-full max-w-sm animate-fade-in" key={`${activeWorkflow}-${activeStep}`}>
                {/* Mock UI Card */}
                <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-foreground">{step.preview.title}</span>
                    <div className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      step.preview.status === 'draft' && "bg-secondary text-muted-foreground",
                      step.preview.status === 'pending' && "bg-warning/10 text-warning",
                      step.preview.status === 'approved' && "bg-success/10 text-success"
                    )}>
                      {step.preview.status === 'draft' && 'Draft'}
                      {step.preview.status === 'pending' && 'Pending'}
                      {step.preview.status === 'approved' && 'Approved'}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    {step.preview.fields.map((field, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          field.highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
                        )}
                      >
                        <span className={cn(
                          "text-sm",
                          field.highlight ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {field.checked !== undefined && (
                            <CheckCircle className="h-4 w-4 text-success inline mr-2" />
                          )}
                          {field.label}
                        </span>
                        <span className={cn(
                          "text-sm font-medium",
                          field.highlight ? "text-primary" : "text-foreground",
                          field.role === 'fc' && "text-warning",
                          field.role === 'tc' && "text-primary",
                          field.role === 'gc' && "text-success"
                        )}>
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  {step.preview.status !== 'approved' && (
                    <div className="px-5 pb-5">
                      <div className="h-9 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                        {step.preview.status === 'draft' ? 'Continue →' : 'Waiting for action...'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step indicator dots */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {workflow.steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        activeStep === i
                          ? "bg-primary w-6"
                          : "bg-border hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
