import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar as CalendarIcon, 
  ChevronRight,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { POWizardV2Data, ProjectSupplier } from '@/types/poWizardV2';

interface HeaderScreenProps {
  data: POWizardV2Data;
  suppliers: ProjectSupplier[];
  loadingSuppliers: boolean;
  onChange: (updates: Partial<POWizardV2Data>) => void;
  onNext: () => void;
  canAdvance: boolean;
  workOrderTitle?: string;
}

export function HeaderScreen({
  data,
  suppliers,
  loadingSuppliers,
  onChange,
  onNext,
  canAdvance,
  workOrderTitle,
}: HeaderScreenProps) {
  const singleSupplier = suppliers.length === 1;
  const noSuppliers = suppliers.length === 0 && !loadingSuppliers;

  return (
    <div className="flex flex-col h-full">
      {/* Q-Header */}
      <div className="wz-q-header">
        <span className="wz-q-label">Step 1 of 3</span>
        <h2 className="wz-q-title">
          {workOrderTitle ? `Materials for ${workOrderTitle}` : 'New Purchase Order'}
        </h2>
        <p className="wz-q-sub">Set delivery details before adding items</p>
      </div>

      {/* Scrollable Form */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {/* Project (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Project <Lock className="h-3 w-3" />
          </Label>
          <div className="h-11 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-medium truncate">
            {data.project_name}
          </div>
        </div>

        {/* Delivery Address (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Delivery Address <Lock className="h-3 w-3" />
          </Label>
          <div className="h-11 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-medium">
            {data.delivery_address || 'No address set'}
          </div>
        </div>

        {/* Supplier */}
        {loadingSuppliers ? (
          <Skeleton className="h-16 w-full" />
        ) : noSuppliers ? (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">No Supplier Available</p>
              <p className="text-xs text-muted-foreground">Add a supplier to the project team first.</p>
            </div>
          </div>
        ) : singleSupplier ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Supplier <Lock className="h-3 w-3" />
            </Label>
            <div className="h-11 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-medium">
              {suppliers[0].name}
              <span className="ml-2 text-xs text-muted-foreground">{suppliers[0].supplier_code}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Supplier</Label>
            <Select
              value={data.supplier_id || ''}
              onValueChange={(value) => {
                const supplier = suppliers.find(s => s.id === value);
                onChange({
                  supplier_id: value,
                  supplier_name: supplier?.name,
                });
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    <div className="flex flex-col items-start">
                      <span>{supplier.name}</span>
                      <span className="text-xs text-muted-foreground">{supplier.supplier_code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Delivery Date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Requested Delivery Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-11 justify-start text-left font-normal',
                  !data.requested_delivery_date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                {data.requested_delivery_date
                  ? format(data.requested_delivery_date, 'PPP')
                  : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.requested_delivery_date || undefined}
                onSelect={(date) => onChange({ requested_delivery_date: date || null })}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Delivery Window — pill toggles */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Delivery Window
          </Label>
          <div className="flex gap-2">
            {(['AM', 'PM', 'ANY'] as const).map((window) => (
              <button
                key={window}
                className={`wz-pill flex-1 ${data.delivery_window === window ? 'wz-pill--active' : 'wz-pill--inactive'}`}
                onClick={() => onChange({ delivery_window: window })}
              >
                {window === 'ANY' ? 'Any' : window}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Notes (Optional)
          </Label>
          <Textarea
            placeholder="Delivery instructions, gate codes, etc."
            value={data.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-[72px] resize-none text-sm"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="wz-footer flex justify-end">
        <Button
          className="h-11 px-6"
          onClick={onNext}
          disabled={!canAdvance || noSuppliers}
        >
          Continue
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
