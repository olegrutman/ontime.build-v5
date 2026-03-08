import { useState } from 'react';
import { ChangeOrderFCHours, LaborPricingType } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Lock, Plus, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FieldCrewHoursPanelProps {
  fcHours: ChangeOrderFCHours[];
  isEditable: boolean;
  canViewRates: boolean;
  onAddHours: (data: { 
    description?: string; 
    pricing_type?: LaborPricingType;
    hours?: number; 
    hourly_rate?: number;
    lump_sum?: number;
  }) => void;
  onLockHours: (hoursId: string) => void;
  isLocking?: boolean;
}

export function FieldCrewHoursPanel({
  fcHours,
  isEditable,
  canViewRates,
  onAddHours,
  onLockHours,
  isLocking,
}: FieldCrewHoursPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [pricingType, setPricingType] = useState<LaborPricingType>('hourly');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [lumpSum, setLumpSum] = useState('');
  const [lockConfirmId, setLockConfirmId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (pricingType === 'lump_sum') {
      onAddHours({
        description: description || undefined,
        pricing_type: 'lump_sum',
        hours: 0,
        lump_sum: parseFloat(lumpSum),
      });
    } else {
      onAddHours({
        description: description || undefined,
        pricing_type: 'hourly',
        hours: parseFloat(hours),
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setPricingType('hourly');
    setHours('');
    setHourlyRate('');
    setLumpSum('');
    setShowAddForm(false);
  };

  const isFormValid = () => {
    if (pricingType === 'lump_sum') {
      return lumpSum && parseFloat(lumpSum) > 0;
    }
    return hours && parseFloat(hours) > 0;
  };

  const totalHours = fcHours
    .filter(e => e.pricing_type !== 'lump_sum')
    .reduce((sum, entry) => sum + entry.hours, 0);
  const totalLabor = fcHours.reduce((sum, entry) => sum + (entry.labor_total || 0), 0);
  const allLocked = fcHours.length > 0 && fcHours.every((entry) => entry.is_locked);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
      <Card data-sasha-card="Field Crew Hours">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Field Crew Hours
              {allLocked && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </Badge>
              )}
            </CardTitle>
            {isEditable && !allLocked && (
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Hours
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fcHours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hours logged yet
            </p>
          ) : (
            <div className="space-y-3">
              {fcHours.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {entry.pricing_type === 'lump_sum' ? (
                        <DollarSign className="w-3 h-3 text-green-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-blue-600" />
                      )}
                      <p className="font-medium text-sm">
                        {entry.description || (entry.pricing_type === 'lump_sum' ? 'Lump Sum' : 'Labor Hours')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.pricing_type === 'lump_sum' ? (
                        'Lump Sum'
                      ) : (
                        <>
                          {entry.hours} hours
                          {canViewRates && entry.hourly_rate && ` @ ${formatCurrency(entry.hourly_rate)}/hr`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canViewRates && (
                      <span className="font-medium">
                        {formatCurrency(entry.labor_total || 0)}
                      </span>
                    )}
                    {entry.is_locked ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
                      </Badge>
                    ) : (
                      isEditable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLockConfirmId(entry.id)}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Lock
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          {fcHours.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="font-medium">Total</span>
              <div className="text-right">
                {totalHours > 0 && (
                  <span className="text-sm text-muted-foreground mr-3">
                    {totalHours} hrs
                  </span>
                )}
                {canViewRates && (
                  <span className="text-xl font-bold">
                    {formatCurrency(totalLabor)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="p-4 border rounded-lg space-y-4 mt-4 bg-card">
              <h4 className="font-medium">Add Hours Entry</h4>
              
              {/* Pricing Type Toggle */}
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Tabs 
                  value={pricingType} 
                  onValueChange={(v) => setPricingType(v as LaborPricingType)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="hourly" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Hourly
                    </TabsTrigger>
                    <TabsTrigger value="lump_sum" className="gap-2">
                      <DollarSign className="w-4 h-4" />
                      Lump Sum
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="fc-description">Description</Label>
                  <Textarea
                    id="fc-description"
                    placeholder="Describe the work performed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {pricingType === 'hourly' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fc-hours">Hours *</Label>
                      <Input
                        id="fc-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0.0"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fc-rate">Hourly Rate</Label>
                      <Input
                        id="fc-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="fc-lumpsum">Lump Sum Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fc-lumpsum"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-8"
                        value={lumpSum}
                        onChange={(e) => setLumpSum(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!isFormValid()}>
                  Save Hours
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={!!lockConfirmId} onOpenChange={() => setLockConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Lock Hours?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once locked, you will not be able to edit these hours unless the Trade
              Contractor unlocks them. This action signals that your input is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lockConfirmId) {
                  onLockHours(lockConfirmId);
                  setLockConfirmId(null);
                }
              }}
              disabled={isLocking}
            >
              {isLocking ? 'Locking...' : 'Lock Hours'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
