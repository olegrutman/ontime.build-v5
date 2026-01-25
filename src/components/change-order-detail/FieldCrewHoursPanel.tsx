import { useState } from 'react';
import { ChangeOrderFCHours } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lock, Plus, Clock, AlertTriangle } from 'lucide-react';
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
  onAddHours: (data: { description?: string; hours: number; hourly_rate?: number }) => void;
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
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [lockConfirmId, setLockConfirmId] = useState<string | null>(null);

  const handleSubmit = () => {
    onAddHours({
      description: description || undefined,
      hours: parseFloat(hours),
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    });
    setDescription('');
    setHours('');
    setHourlyRate('');
    setShowAddForm(false);
  };

  const totalHours = fcHours.reduce((sum, entry) => sum + entry.hours, 0);
  const totalLabor = fcHours.reduce((sum, entry) => sum + (entry.labor_total || 0), 0);
  const allLocked = fcHours.length > 0 && fcHours.every((entry) => entry.is_locked);
  const hasUnlockedHours = fcHours.some((entry) => !entry.is_locked);

  return (
    <>
      <Card>
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
                    <p className="font-medium text-sm">
                      {entry.description || 'Labor hours'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.hours} hours
                      {canViewRates && entry.hourly_rate && ` @ $${entry.hourly_rate}/hr`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canViewRates && (
                      <span className="font-medium">
                        ${entry.labor_total?.toFixed(2) || '0.00'}
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
              <span className="font-medium">Total Hours</span>
              <div className="text-right">
                <span className="text-xl font-bold">{totalHours} hrs</span>
                {canViewRates && (
                  <p className="text-sm text-muted-foreground">
                    ${totalLabor.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="p-4 border rounded-lg space-y-4 mt-4">
              <h4 className="font-medium">Add Hours Entry</h4>
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
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!hours || parseFloat(hours) <= 0}>
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
