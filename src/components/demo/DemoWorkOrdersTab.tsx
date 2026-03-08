import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, CheckCircle2, Circle, Clock, FileText, ArrowRight } from 'lucide-react';
import { useDemoProjectData } from '@/hooks/useDemoData';
import { useDemo } from '@/contexts/DemoContext';
import { type DemoWorkOrder } from '@/data/demoData';
import { WorkOrderWizard } from '@/components/work-order-wizard/WorkOrderWizard';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

interface Props {
  projectId: string;
  projectName: string;
}

export function DemoWorkOrdersTab({ projectId, projectName }: Props) {
  const data = useDemoProjectData();
  const { demoRole, addWorkOrder, updateWorkOrderStatus } = useDemo();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<DemoWorkOrder | null>(null);

  if (!data) return null;

  const { workOrders, workOrderDetails } = data;
  const canCreate = demoRole === 'GC' || demoRole === 'TC' || demoRole === 'FC';

  const detail = selectedWO
    ? workOrderDetails.find(d => d.id === selectedWO.id) || null
    : null;

  const checkedCount = detail?.checklist.filter(c => c.done).length || 0;
  const totalChecklist = detail?.checklist.length || 1;

  const handleCreateWO = () => {
    const num = workOrders.length + 1;
    const newWO: DemoWorkOrder = {
      id: `demo-wo-new-${Date.now()}`,
      project_id: projectId,
      title: `New Work Order #${num}`,
      description: 'Created in interactive demo',
      status: 'draft',
      pricing_mode: 'fixed',
      work_type: 'general',
      created_at: new Date().toISOString(),
      final_price: null,
      labor_total: null,
      material_total: null,
    };
    addWorkOrder(newWO, {
      id: newWO.id,
      location: 'TBD',
      work_type_label: 'General',
      checklist: [
        { label: 'Scope defined', done: false },
        { label: 'Location set', done: false },
        { label: 'TC assigned', done: false },
        { label: 'Pricing complete', done: false },
        { label: 'GC approved', done: false },
      ],
    });
    toast.success('Work Order created! 🎉 It appears as "draft" — a TC would now price it.');
    setWizardOpen(false);
  };

  const handleStatusChange = (wo: DemoWorkOrder, newStatus: string) => {
    if (newStatus === 'active' && wo.status === 'draft') {
      updateWorkOrderStatus(wo.id, 'active', { final_price: 15000, labor_total: 9500, material_total: 5500 });
      toast.success('Work Order priced & activated! 💰 Labor: $9,500 · Materials: $5,500');
    } else if (newStatus === 'completed') {
      updateWorkOrderStatus(wo.id, 'completed');
      toast.success('Work Order marked complete! ✅');
    }
    setSelectedWO(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Work Orders</h2>
        {canCreate && (
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Work Order
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {['draft', 'active', 'completed'].map(status => {
          const count = workOrders.filter(wo => wo.status === status).length;
          if (count === 0) return null;
          return (
            <Badge key={status} variant="outline" className="text-xs">
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {workOrders.map(wo => (
          <Card
            key={wo.id}
            className="cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setSelectedWO(wo)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{wo.title}</CardTitle>
                <Badge className={STATUS_STYLES[wo.status] || 'bg-muted'}>
                  {wo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>{wo.description}</p>
              <div className="flex gap-4 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {wo.pricing_mode === 'tm' ? 'T&M' : 'Fixed'}
                </span>
                {wo.final_price != null && (
                  <span className="font-medium text-foreground">
                    ${wo.final_price.toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedWO} onOpenChange={(open) => !open && setSelectedWO(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedWO && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedWO.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <Badge className={STATUS_STYLES[selectedWO.status] || 'bg-muted'}>
                  {selectedWO.status}
                </Badge>

                <p className="text-sm text-muted-foreground">{selectedWO.description}</p>

                {detail && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{detail.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{detail.work_type_label}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Completion Checklist</span>
                        <span className="text-muted-foreground">{checkedCount}/{totalChecklist}</span>
                      </div>
                      <Progress value={(checkedCount / totalChecklist) * 100} className="h-2" />
                      <div className="space-y-1">
                        {detail.checklist.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {item.done ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Pricing Mode</p>
                      <p className="text-sm font-semibold">{selectedWO.pricing_mode === 'tm' ? 'T&M' : 'Fixed'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold">
                        {selectedWO.final_price != null ? `$${selectedWO.final_price.toLocaleString()}` : '—'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Labor</p>
                      <p className="text-sm font-semibold">
                        {selectedWO.labor_total != null ? `$${selectedWO.labor_total.toLocaleString()}` : '—'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Materials</p>
                      <p className="text-sm font-semibold">
                        {selectedWO.material_total != null ? `$${selectedWO.material_total.toLocaleString()}` : '—'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Action buttons based on status */}
                <div className="flex gap-2 pt-2">
                  {selectedWO.status === 'draft' && (demoRole === 'GC' || demoRole === 'TC') && (
                    <Button className="flex-1" onClick={() => handleStatusChange(selectedWO, 'active')}>
                      <ArrowRight className="h-4 w-4 mr-1" /> Price & Activate
                    </Button>
                  )}
                  {selectedWO.status === 'active' && demoRole === 'GC' && (
                    <Button className="flex-1" onClick={() => handleStatusChange(selectedWO, 'completed')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <WorkOrderWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
        projectName={projectName}
        isSubmitting={false}
        onComplete={async () => {
          handleCreateWO();
        }}
      />
    </div>
  );
}
