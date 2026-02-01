import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Sparkles, RefreshCw, Pencil, Check, X, MapPin, Wrench, Package, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORK_TYPE_LABELS } from '@/types/changeOrderProject';
import { WorkOrderWizardData, FIXING_REASON_OPTIONS } from '@/types/workOrderWizard';
import { getExteriorOptions, ProjectScopeDetails } from '@/hooks/useProjectScope';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReviewStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
  projectId: string;
  projectName: string;
  projectScope: ProjectScopeDetails | null;
  assigneeName?: string;
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={cn('w-4 h-4 mt-0.5', highlight ? 'text-primary' : 'text-muted-foreground')} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm', highlight && 'font-medium')}>{value}</p>
      </div>
    </div>
  );
}

export function ReviewStep({
  data,
  onChange,
  projectId,
  projectName,
  projectScope,
  assigneeName,
}: ReviewStepProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.description);
  const [hasGenerated, setHasGenerated] = useState(false);

  const exteriorOptions = getExteriorOptions(projectScope);

  // Generate location string
  const getLocationString = () => {
    const loc = data.location_data;
    if (loc.inside_outside === 'inside') {
      return [
        loc.level,
        loc.unit ? `Unit ${loc.unit}` : null,
        loc.room_area === 'Other' ? loc.custom_room_area : loc.room_area,
      ]
        .filter(Boolean)
        .join(' → ');
    } else if (loc.inside_outside === 'outside') {
      if (loc.exterior_feature === 'other') {
        return loc.custom_exterior || 'Outside - Other';
      }
      const option = exteriorOptions.find((o) => o.value === loc.exterior_feature);
      return option?.label || loc.exterior_feature || 'Outside';
    }
    return 'Not specified';
  };

  // Generate AI description
  const generateDescription = async () => {
    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-work-order-description', {
        body: {
          work_type: data.work_type,
          location: data.location_data,
          project_name: projectName,
          reason: data.reason,
          fixing_trade_notes: data.fixing_trade_notes,
          requires_materials: data.requires_materials,
          requires_equipment: data.requires_equipment,
          material_responsibility: data.material_cost_responsibility,
          equipment_responsibility: data.equipment_cost_responsibility,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const description = response.data?.description || '';
      onChange({ description });
      setEditValue(description);
      setHasGenerated(true);
    } catch (error) {
      console.error('Failed to generate description:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to generate description',
        description: 'Please try again or write the description manually.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on mount if no description
  useEffect(() => {
    if (!data.description && !hasGenerated && data.work_type) {
      generateDescription();
    }
  }, []);

  const handleSaveEdit = () => {
    onChange({ description: editValue });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(data.description);
    setIsEditing(false);
  };

  // Get reason label
  const reasonLabel = data.reason
    ? FIXING_REASON_OPTIONS.find((r) => r.value === data.reason)?.label || data.reason
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Review & Create</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Review your work order details before creating
        </p>
      </div>

      {/* Summary Section */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold text-sm mb-3">Summary</h3>
        
        <SummaryItem
          icon={MapPin}
          label="Location"
          value={getLocationString()}
          highlight
        />
        
        {data.work_type && (
          <SummaryItem
            icon={Wrench}
            label="Work Type"
            value={
              <span className="flex items-center gap-2">
                {WORK_TYPE_LABELS[data.work_type]}
                {reasonLabel && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                    {reasonLabel}
                  </span>
                )}
              </span>
            }
            highlight
          />
        )}

        {data.fixing_trade_notes && (
          <SummaryItem
            icon={Wrench}
            label="Trade Issue Details"
            value={data.fixing_trade_notes}
          />
        )}

        <SummaryItem
          icon={Package}
          label="Materials"
          value={
            data.material_cost_responsibility
              ? `${data.material_cost_responsibility} Responsible${data.requires_materials ? ' (Extra materials added)' : ''}`
              : 'Not specified'
          }
        />

        <SummaryItem
          icon={Truck}
          label="Equipment"
          value={
            data.equipment_cost_responsibility
              ? `${data.equipment_cost_responsibility} Responsible${data.requires_equipment ? ' (Equipment added)' : ''}`
              : 'Not specified'
          }
        />

        {assigneeName && (
          <SummaryItem
            icon={Users}
            label="Assigned To"
            value={assigneeName}
          />
        )}
      </div>

      {/* AI Generated Description */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Description of Work
          </Label>
          <div className="flex gap-1">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateDescription}
                  disabled={isGenerating}
                >
                  <RefreshCw className={cn('w-4 h-4 mr-1', isGenerating && 'animate-spin')} />
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {isGenerating ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isEditing ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[150px]"
            placeholder="Describe the scope of work..."
          />
        ) : (
          <div className="bg-background border rounded-lg p-4 min-h-[100px]">
            {data.description ? (
              <p className="text-sm whitespace-pre-wrap">{data.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Click "Regenerate" to create an AI-generated description, or "Edit" to write
                your own.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
