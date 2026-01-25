import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Wrench, 
  Home, 
  Building2, 
  Layers, 
  DoorOpen,
  Sparkles,
  Send,
  Loader2,
  Package,
  Truck,
  Users,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import {
  ChangeOrderWizardData,
  LocationData,
  ChangeOrderWorkType,
  CostResponsibility,
  WORK_TYPE_LABELS,
  LEVEL_OPTIONS,
  ROOM_AREA_OPTIONS,
} from '@/types/changeOrderProject';
import { cn } from '@/lib/utils';

interface ChangeOrderWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onComplete: (data: ChangeOrderWizardData & { project_id: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const WORK_TYPES: ChangeOrderWorkType[] = ['reframe', 'reinstall', 'addition', 'adjust', 'fixing'];

const REASON_OPTIONS = [
  'Owner Request',
  'Design Change',
  'Field Condition',
  'Code Requirement',
  'Coordination Issue',
  'Other',
];

const initialData: ChangeOrderWizardData = {
  location_data: {},
  title: '',
  work_type: null,
  description: '',
  requires_materials: false,
  material_cost_responsibility: null,
  requires_equipment: false,
  equipment_cost_responsibility: null,
};

// Section Card Component
function SectionCard({ 
  icon: Icon, 
  title, 
  children,
  className 
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border rounded-xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Toggle Button Component
function ToggleButton({
  selected,
  onClick,
  children,
  icon: Icon,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary/50 hover:bg-muted/50",
        className
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

// Work Type Button
function WorkTypeButton({
  type,
  selected,
  onClick,
}: {
  type: ChangeOrderWorkType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 rounded-lg border-2 font-medium transition-all text-sm",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary/50"
      )}
    >
      {WORK_TYPE_LABELS[type]}
    </button>
  );
}

export function ChangeOrderWizardDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onComplete,
  isSubmitting = false,
}: ChangeOrderWizardDialogProps) {
  const [formData, setFormData] = useState<ChangeOrderWizardData>(initialData);
  const [reason, setReason] = useState<string>('');
  const [isLocationEditing, setIsLocationEditing] = useState(true);
  const [unitIdType, setUnitIdType] = useState<string>('Number');
  const [laborHours, setLaborHours] = useState<string>('');
  const [laborRate, setLaborRate] = useState<string>('65');

  const updateFormData = <K extends keyof ChangeOrderWizardData>(
    field: K,
    value: ChangeOrderWizardData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLocationData = (field: keyof LocationData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      location_data: { ...prev.location_data, [field]: value },
    }));
  };

  // Generate location summary string
  const locationSummary = useMemo(() => {
    const parts: string[] = [];
    const loc = formData.location_data;
    if (loc.level) parts.push(loc.level);
    if (loc.unit) parts.push(`Unit ${loc.unit}`);
    if (loc.room_area) parts.push(loc.room_area);
    return parts.join(' → ');
  }, [formData.location_data]);

  const hasLocationData = formData.location_data.level || formData.location_data.room_area;

  const laborTotal = useMemo(() => {
    const hours = parseFloat(laborHours) || 0;
    const rate = parseFloat(laborRate) || 0;
    return hours * rate;
  }, [laborHours, laborRate]);

  const canSubmit = (): boolean => {
    // Require at minimum: location and work type
    const hasLocation = !!formData.location_data.level || !!formData.location_data.room_area;
    const hasWorkType = !!formData.work_type;
    const materialsValid = !formData.requires_materials || !!formData.material_cost_responsibility;
    const equipmentValid = !formData.requires_equipment || !!formData.equipment_cost_responsibility;
    return hasLocation && hasWorkType && materialsValid && equipmentValid;
  };

  const handleSubmit = async () => {
    await onComplete({ ...formData, project_id: projectId });
    setFormData(initialData);
    setReason('');
    setLaborHours('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setFormData(initialData);
    setReason('');
    setIsLocationEditing(true);
    setLaborHours('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetTitle className="text-lg">New Change Order</SheetTitle>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </SheetHeader>

        <div className="p-6 space-y-5 pb-32">
          {/* Location Section */}
          <SectionCard icon={MapPin} title="Location of Work">
            {hasLocationData && !isLocationEditing ? (
              // Summary view
              <div 
                className="border-2 border-primary rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsLocationEditing(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                    <p className="font-semibold">{locationSummary}</p>
                    <div className="flex gap-2 mt-2">
                      {formData.location_data.inside_outside && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {formData.location_data.inside_outside === 'inside' ? 'INSIDE' : 'OUTSIDE'}
                        </span>
                      )}
                      {formData.location_data.level && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">{formData.location_data.level}</span>
                      )}
                      {formData.location_data.unit && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Unit {formData.location_data.unit}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              // Edit form
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    Where is the work?
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleButton
                      selected={formData.location_data.inside_outside === 'inside'}
                      onClick={() => updateLocationData('inside_outside', 'inside')}
                      icon={Home}
                    >
                      Inside
                    </ToggleButton>
                    <ToggleButton
                      selected={formData.location_data.inside_outside === 'outside'}
                      onClick={() => updateLocationData('inside_outside', 'outside')}
                      icon={Building2}
                    >
                      Outside
                    </ToggleButton>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Layers className="w-4 h-4" />
                    Select level
                  </div>
                  <Select
                    value={formData.location_data.level || ''}
                    onValueChange={(value) => updateLocationData('level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground text-sm">Unit ID type</Label>
                    <Select value={unitIdType} onValueChange={setUnitIdType}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="Address">Address</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Unit ID</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="e.g., 101, A, 123 Main St"
                      value={formData.location_data.unit || ''}
                      onChange={(e) => updateLocationData('unit', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <DoorOpen className="w-4 h-4" />
                    Room / Area
                  </div>
                  <Select
                    value={formData.location_data.room_area || ''}
                    onValueChange={(value) => updateLocationData('room_area', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room or area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_AREA_OPTIONS.map((room) => (
                        <SelectItem key={room} value={room}>{room}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasLocationData && (
                  <div className="border-l-2 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r-lg">
                    <p className="text-xs text-muted-foreground">Current selection</p>
                    <p className="font-medium">{locationSummary || 'None'}</p>
                  </div>
                )}

                {hasLocationData && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsLocationEditing(false)}
                  >
                    Done
                  </Button>
                )}
              </div>
            )}
          </SectionCard>

          {/* Title Section */}
          <SectionCard icon={Sparkles} title="Title (optional)" className="border-dashed">
            <Input
              placeholder="Brief title for this change order"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave blank to use the location as the title
            </p>
          </SectionCard>

          {/* Scope of Work Section */}
          <SectionCard icon={Wrench} title="Scope of Work">
            <div className="grid grid-cols-3 gap-2">
              {WORK_TYPES.map((type) => (
                <WorkTypeButton
                  key={type}
                  type={type}
                  selected={formData.work_type === type}
                  onClick={() => updateFormData('work_type', type)}
                />
              ))}
            </div>
          </SectionCard>

          {/* Description Section */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Label className="font-semibold">Description of Work</Label>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                AI Generate
              </Button>
            </div>
            <Textarea
              placeholder="Describe the work to be done..."
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Reason Section */}
          <SectionCard icon={AlertTriangle} title="Reason">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SectionCard>

          {/* Send to Field Crew Section */}
          <SectionCard icon={Users} title="Send to Field Crew">
            <div className="flex items-center justify-between">
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select Field Crew..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fc1">Field Crew A</SelectItem>
                  <SelectItem value="fc2">Field Crew B</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-3 px-2 py-0.5 text-xs font-medium text-destructive border border-destructive/30 rounded">
                Required
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/50 rounded-lg">
              <strong>Note:</strong> This is a work request only. Field Crew will submit hours, then you can add pricing before converting to a Change Order.
            </p>
          </SectionCard>

          {/* Labor Section */}
          <SectionCard icon={Users} title="Labor">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Hours</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  placeholder="0"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Rate ($/hr)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <p className="text-sm font-medium">
                Labor Total: <span className="text-primary">${laborTotal.toLocaleString()}</span>
              </p>
            </div>
          </SectionCard>

          {/* Extra Materials Section */}
          <SectionCard icon={Package} title="Extra Materials">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Who is responsible for material costs?</p>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    selected={formData.material_cost_responsibility === 'TC'}
                    onClick={() => updateFormData('material_cost_responsibility', 'TC')}
                  >
                    Trade Contractor
                  </ToggleButton>
                  <ToggleButton
                    selected={formData.material_cost_responsibility === 'GC'}
                    onClick={() => updateFormData('material_cost_responsibility', 'GC')}
                  >
                    General Contractor
                  </ToggleButton>
                </div>
                {formData.material_cost_responsibility === 'GC' && (
                  <p className="text-xs text-primary mt-2">
                    GC will be notified they are responsible for material costs when this change order is submitted.
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Add extra materials?</p>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    selected={formData.requires_materials === true}
                    onClick={() => updateFormData('requires_materials', true)}
                  >
                    Yes
                  </ToggleButton>
                  <ToggleButton
                    selected={formData.requires_materials === false}
                    onClick={() => updateFormData('requires_materials', false)}
                  >
                    No
                  </ToggleButton>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Equipment Section */}
          <SectionCard icon={Truck} title="Equipment">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Who is responsible for equipment costs?</p>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    selected={formData.equipment_cost_responsibility === 'TC'}
                    onClick={() => updateFormData('equipment_cost_responsibility', 'TC')}
                  >
                    Trade Contractor
                  </ToggleButton>
                  <ToggleButton
                    selected={formData.equipment_cost_responsibility === 'GC'}
                    onClick={() => updateFormData('equipment_cost_responsibility', 'GC')}
                  >
                    General Contractor
                  </ToggleButton>
                </div>
                {formData.equipment_cost_responsibility === 'GC' && (
                  <p className="text-xs text-primary mt-2">
                    GC will be notified they are responsible for equipment costs when this change order is submitted.
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">Add equipment?</p>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    selected={formData.requires_equipment === true}
                    onClick={() => updateFormData('requires_equipment', true)}
                  >
                    Yes
                  </ToggleButton>
                  <ToggleButton
                    selected={formData.requires_equipment === false}
                    onClick={() => updateFormData('requires_equipment', false)}
                  >
                    No
                  </ToggleButton>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-xl md:max-w-2xl bg-background border-t shadow-lg">
          {/* Total Row */}
          <div className="flex items-center justify-between px-6 py-3 bg-muted/50">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">${laborTotal.toLocaleString()}</span>
          </div>
          
          {/* Submit Button */}
          <div className="p-4 space-y-2">
            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit for Approval
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
