import { useState } from 'react';
import { ChangeOrderEquipment } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Plus, Truck } from 'lucide-react';

const EQUIPMENT_OPTIONS = [
  {
    category: 'Heavy Equipment',
    items: [
      'Forklift',
      'Scissor Lift',
      'Boom Lift / JLG',
      'Crane (Mobile)',
      'Crane (Tower)',
      'Excavator',
      'Skid Steer / Bobcat',
      'Backhoe',
    ],
  },
  {
    category: 'Power Tools',
    items: [
      'Concrete Mixer',
      'Concrete Saw',
      'Generator',
      'Compressor',
      'Welder',
      'Pressure Washer',
    ],
  },
  {
    category: 'Scaffolding & Access',
    items: ['Scaffolding (per section)', 'Ladder (Extension)', 'Baker Scaffold'],
  },
  {
    category: 'Transportation',
    items: ['Dump Truck', 'Flatbed Trailer', 'Delivery Truck'],
  },
  {
    category: 'Specialty',
    items: [
      'Dumpster / Roll-off Container',
      'Portable Toilet',
      'Temporary Fencing',
      'Temporary Heating / HVAC',
      'Water Pump',
    ],
  },
];

interface EquipmentPanelProps {
  equipment: ChangeOrderEquipment[];
  isEditable: boolean;
  canViewCosts: boolean;
  onAddEquipment: (data: {
    description: string;
    pricing_type: 'flat' | 'daily';
    daily_rate?: number;
    days?: number;
    flat_cost?: number;
    notes?: string;
  }) => void;
}

export function EquipmentPanel({
  equipment,
  isEditable,
  canViewCosts,
  onAddEquipment,
}: EquipmentPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [useCustomDescription, setUseCustomDescription] = useState(false);
  const [pricingType, setPricingType] = useState<'flat' | 'daily'>('flat');
  const [dailyRate, setDailyRate] = useState('');
  const [days, setDays] = useState('1');
  const [flatCost, setFlatCost] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setDescription('');
    setUseCustomDescription(false);
    setPricingType('flat');
    setDailyRate('');
    setDays('1');
    setFlatCost('');
    setNotes('');
  };

  const handleSubmit = () => {
    onAddEquipment({
      description,
      pricing_type: pricingType,
      daily_rate: pricingType === 'daily' ? parseFloat(dailyRate) : undefined,
      days: pricingType === 'daily' ? parseInt(days) : undefined,
      flat_cost: pricingType === 'flat' ? parseFloat(flatCost) : undefined,
      notes: notes || undefined,
    });
    resetForm();
    setShowAddForm(false);
  };

  const handleCancel = () => {
    resetForm();
    setShowAddForm(false);
  };

  const totalEquipment = equipment.reduce((sum, e) => sum + (e.total_cost || 0), 0);

  return (
    <Card data-sasha-card="Equipment">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Equipment / Machinery
          </CardTitle>
          {isEditable && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Equipment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No equipment added yet
          </p>
        ) : (
          <div className="space-y-3">
            {equipment.map((item) => {
              const isPriced = item.total_cost && item.total_cost > 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.description}</p>
                      {isPriced && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="w-3 h-3" />
                          Priced
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.pricing_type === 'daily'
                        ? `${item.days} day(s) @ $${item.daily_rate}/day`
                        : 'Flat rate'}
                    </p>
                  </div>
                  {canViewCosts && (
                    <span className="font-medium">${(item.total_cost || 0).toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Totals */}
        {equipment.length > 0 && canViewCosts && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">Total Equipment</span>
            <span className="text-xl font-bold">${totalEquipment.toFixed(2)}</span>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 border rounded-lg space-y-4 mt-4">
            <h4 className="font-medium">Add Equipment</h4>
            <div className="space-y-3">
              <div>
                <Label>Equipment Type *</Label>
                <Select
                  value={useCustomDescription ? 'custom' : description}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setUseCustomDescription(true);
                      setDescription('');
                    } else {
                      setUseCustomDescription(false);
                      setDescription(value);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50 max-h-80">
                    {EQUIPMENT_OPTIONS.map((group) => (
                      <SelectGroup key={group.category}>
                        <SelectLabel>{group.category}</SelectLabel>
                        {group.items.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="custom">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {useCustomDescription && (
                <div>
                  <Label htmlFor="equip-custom">Custom Description *</Label>
                  <Input
                    id="equip-custom"
                    placeholder="Enter equipment description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Pricing Type</Label>
                <RadioGroup
                  value={pricingType}
                  onValueChange={(v) => setPricingType(v as 'flat' | 'daily')}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat" id="pricing-flat" />
                    <Label htmlFor="pricing-flat" className="font-normal cursor-pointer">
                      Flat Rate
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="pricing-daily" />
                    <Label htmlFor="pricing-daily" className="font-normal cursor-pointer">
                      Daily Rate
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {pricingType === 'flat' ? (
                <div>
                  <Label htmlFor="equip-flat">Flat Cost *</Label>
                  <Input
                    id="equip-flat"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={flatCost}
                    onChange={(e) => setFlatCost(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="equip-daily">Daily Rate *</Label>
                    <Input
                      id="equip-daily"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="equip-days">Days *</Label>
                    <Input
                      id="equip-days"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="equip-notes">Notes</Label>
                <Input
                  id="equip-notes"
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !description ||
                  (pricingType === 'flat' && (!flatCost || parseFloat(flatCost) <= 0)) ||
                  (pricingType === 'daily' &&
                    (!dailyRate || parseFloat(dailyRate) <= 0 || !days || parseInt(days) < 1))
                }
              >
                Add Equipment
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
