import { Card, CardContent } from '@/components/ui/card';
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
  Package, 
  MapPin, 
  Building2, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Lock,
  Mic,
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
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="text-lg font-semibold">
          {workOrderTitle ? `Materials for ${workOrderTitle}` : 'Create Purchase Order'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Step 1 of 3 • {workOrderTitle ? 'Work Order Materials' : 'PO Details'}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Project (Read-only) */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Project
                  </Label>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="font-medium truncate">{data.project_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address (Read-only) */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Delivery Address
                  </Label>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="font-medium">{data.delivery_address || 'No address set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier */}
        {loadingSuppliers ? (
          <Skeleton className="h-20 w-full" />
        ) : noSuppliers ? (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive">No Supplier Assigned</p>
                  <p className="text-sm text-muted-foreground">
                    Contact your project manager to add a supplier.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : singleSupplier ? (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Supplier
                    </Label>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="font-medium">{suppliers[0].name}</p>
                  <p className="text-xs text-muted-foreground">{suppliers[0].supplier_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                    Supplier
                  </Label>
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
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col items-start">
                            <span>{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {supplier.supplier_code}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Date */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Requested Delivery Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-12 justify-start text-left font-normal',
                        !data.requested_delivery_date && 'text-muted-foreground'
                      )}
                    >
                      {data.requested_delivery_date ? (
                        format(data.requested_delivery_date, 'PPP')
                      ) : (
                        'Select date'
                      )}
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
            </div>
          </CardContent>
        </Card>

        {/* Delivery Window */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Delivery Window
                </Label>
                <div className="flex gap-2">
                  {(['AM', 'PM', 'ANY'] as const).map((window) => (
                    <Button
                      key={window}
                      variant={data.delivery_window === window ? 'default' : 'outline'}
                      className="flex-1 h-12"
                      onClick={() => onChange({ delivery_window: window })}
                    >
                      {window === 'ANY' ? 'Any' : window}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes (Optional) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Notes (Optional)
                  </Label>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Mic className="h-4 w-4 mr-1" />
                    Voice
                  </Button>
                </div>
                <Textarea
                  placeholder="Delivery instructions, gate codes, etc."
                  value={data.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t bg-background">
        <Button
          className="w-full h-12 text-base"
          onClick={onNext}
          disabled={!canAdvance || noSuppliers}
        >
          Next – Add Items
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
