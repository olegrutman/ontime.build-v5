import { useState } from 'react';
import { ChangeOrderTCLabor } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, HardHat } from 'lucide-react';

interface TCPricingPanelProps {
  tcLabor: ChangeOrderTCLabor[];
  isEditable: boolean;
  canViewRates: boolean;
  onAddLabor: (data: { description?: string; hours: number; hourly_rate?: number }) => void;
}

export function TCPricingPanel({
  tcLabor,
  isEditable,
  canViewRates,
  onAddLabor,
}: TCPricingPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const handleSubmit = () => {
    onAddLabor({
      description: description || undefined,
      hours: parseFloat(hours),
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    });
    setDescription('');
    setHours('');
    setHourlyRate('');
    setShowAddForm(false);
  };

  const totalHours = tcLabor.reduce((sum, entry) => sum + entry.hours, 0);
  const totalLabor = tcLabor.reduce((sum, entry) => sum + (entry.labor_total || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="w-4 h-4" />
            Trade Contractor Labor
          </CardTitle>
          {isEditable && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Labor
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tcLabor.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No labor entries yet
          </p>
        ) : (
          <div className="space-y-3">
            {tcLabor.map((entry) => (
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
                {canViewRates && (
                  <span className="font-medium">
                    ${entry.labor_total?.toFixed(2) || '0.00'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        {tcLabor.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">Total Labor</span>
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
            <h4 className="font-medium">Add Labor Entry</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tc-description">Description</Label>
                <Textarea
                  id="tc-description"
                  placeholder="Describe the work..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tc-hours">Hours *</Label>
                  <Input
                    id="tc-hours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tc-rate">Hourly Rate</Label>
                  <Input
                    id="tc-rate"
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
                Save Labor
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
