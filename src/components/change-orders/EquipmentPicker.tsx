import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Truck } from 'lucide-react';

export type EquipmentCategory = 
  | 'POWER_TOOLS'
  | 'HAND_TOOLS'
  | 'SCAFFOLDING'
  | 'LIFTS'
  | 'LADDERS'
  | 'SAFETY_EQUIPMENT'
  | 'GENERATORS_COMPRESSORS'
  | 'MISC_OTHER';

export type EquipmentUnit = 'HR' | 'DAY' | 'WEEK' | 'EA';

export interface EquipmentLine {
  id: string;
  category: EquipmentCategory | '';
  subtype: string;
  model: string;
  size: string;
  quantity: number;
  duration: number;
  unit: EquipmentUnit;
  description: string;
  unit_cost: number;
}

interface EquipmentPickerProps {
  equipment: EquipmentLine[];
  onChange: (equipment: EquipmentLine[]) => void;
  showCosts?: boolean;
}

const CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'POWER_TOOLS', label: 'Power Tools' },
  { value: 'HAND_TOOLS', label: 'Hand Tools' },
  { value: 'SCAFFOLDING', label: 'Scaffolding' },
  { value: 'LIFTS', label: 'Lifts & Aerial Equipment' },
  { value: 'LADDERS', label: 'Ladders' },
  { value: 'SAFETY_EQUIPMENT', label: 'Safety Equipment' },
  { value: 'GENERATORS_COMPRESSORS', label: 'Generators & Compressors' },
  { value: 'MISC_OTHER', label: 'Misc / Other' },
];

// Power Tools options
const POWER_TOOL_TYPES = [
  'Circular Saw', 'Miter Saw', 'Table Saw', 'Reciprocating Saw', 
  'Nail Gun (Framing)', 'Nail Gun (Finish)', 'Nail Gun (Brad)',
  'Impact Driver', 'Hammer Drill', 'Rotary Hammer',
  'Router', 'Planer', 'Jigsaw', 'Grinder',
  'Other'
];

// Hand Tools options
const HAND_TOOL_TYPES = [
  'Hammer', 'Pry Bar', 'Level (4ft)', 'Level (6ft)', 'Level (Laser)',
  'Chalk Line', 'Speed Square', 'Framing Square', 'Tape Measure',
  'Clamps (Bar)', 'Clamps (Pipe)', 'Sawhorses',
  'Other'
];

// Scaffolding options
const SCAFFOLDING_TYPES = ['Frame Scaffold', 'Rolling Scaffold', 'Baker Scaffold', 'Pump Jack', 'Planks', 'Other'];
const SCAFFOLDING_HEIGHTS = ['6 ft', '12 ft', '18 ft', '24 ft', '30 ft', 'Other'];

// Lift options
const LIFT_TYPES = ['Scissor Lift', 'Boom Lift', 'Telehandler', 'Forklift', 'Material Hoist', 'Other'];
const LIFT_HEIGHTS = ['19 ft', '26 ft', '32 ft', '40 ft', '45 ft', '60 ft', '80 ft', 'Other'];

// Ladder options
const LADDER_TYPES = ['Step Ladder', 'Extension Ladder', 'Platform Ladder', 'A-Frame Ladder', 'Multi-Position', 'Other'];
const LADDER_HEIGHTS = ['6 ft', '8 ft', '10 ft', '12 ft', '16 ft', '20 ft', '24 ft', '28 ft', '32 ft', 'Other'];

// Safety Equipment options
const SAFETY_TYPES = [
  'Hard Hats', 'Safety Glasses', 'Hearing Protection',
  'Fall Protection Harness', 'Lanyards', 'Anchor Points',
  'Respirators', 'Dust Masks', 'Gloves',
  'Safety Vests', 'First Aid Kit', 'Fire Extinguisher',
  'Barricades', 'Caution Tape', 'Safety Netting',
  'Other'
];

// Generator/Compressor options
const GENERATOR_TYPES = ['Generator (Portable)', 'Generator (Towable)', 'Air Compressor', 'Other'];
const GENERATOR_SIZES = ['2000W', '3500W', '5000W', '7500W', '10000W', '15000W', 'Other'];
const COMPRESSOR_SIZES = ['6 gal', '20 gal', '30 gal', '60 gal', '80 gal', 'Other'];

// Unit options
const UNIT_OPTIONS: { value: EquipmentUnit; label: string }[] = [
  { value: 'HR', label: 'Hours' },
  { value: 'DAY', label: 'Days' },
  { value: 'WEEK', label: 'Weeks' },
  { value: 'EA', label: 'Each' },
];

export const createEmptyEquipment = (): EquipmentLine => ({
  id: crypto.randomUUID(),
  category: '',
  subtype: '',
  model: '',
  size: '',
  quantity: 1,
  duration: 1,
  unit: 'DAY',
  description: '',
  unit_cost: 0,
});

export const calculateEquipmentCost = (equipment: EquipmentLine[]): number => {
  return equipment.reduce((total, e) => {
    const isQuantityBased = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(e.category);
    const qty = isQuantityBased ? e.quantity : e.duration;
    return total + (qty * e.unit_cost);
  }, 0);
};

export const getEquipmentDisplayString = (equipment: EquipmentLine): string => {
  const parts: string[] = [];
  
  if (equipment.category === 'POWER_TOOLS' || equipment.category === 'HAND_TOOLS') {
    if (equipment.subtype) parts.push(equipment.subtype);
  } else if (equipment.category === 'SCAFFOLDING') {
    if (equipment.subtype) parts.push(equipment.subtype);
    if (equipment.size) parts.push(equipment.size);
  } else if (equipment.category === 'LIFTS') {
    if (equipment.subtype) parts.push(equipment.subtype);
    if (equipment.size) parts.push(equipment.size);
  } else if (equipment.category === 'LADDERS') {
    if (equipment.subtype) parts.push(equipment.subtype);
    if (equipment.size) parts.push(equipment.size);
  } else if (equipment.category === 'SAFETY_EQUIPMENT') {
    if (equipment.subtype) parts.push(equipment.subtype);
  } else if (equipment.category === 'GENERATORS_COMPRESSORS') {
    if (equipment.subtype) parts.push(equipment.subtype);
    if (equipment.size) parts.push(equipment.size);
  } else if (equipment.category === 'MISC_OTHER') {
    if (equipment.description) parts.push(equipment.description);
  }
  
  if (parts.length === 0) return 'Equipment';
  return parts.join(' ');
};

const getUnitLabel = (unit: EquipmentUnit, duration: number): string => {
  const labels: Record<EquipmentUnit, { singular: string; plural: string }> = {
    HR: { singular: 'hour', plural: 'hours' },
    DAY: { singular: 'day', plural: 'days' },
    WEEK: { singular: 'week', plural: 'weeks' },
    EA: { singular: 'unit', plural: 'units' },
  };
  return duration === 1 ? labels[unit].singular : labels[unit].plural;
};

function EquipmentLineEditor({ 
  equipment, 
  index,
  onUpdate, 
  onRemove,
  showCosts = false
}: { 
  equipment: EquipmentLine; 
  index: number;
  onUpdate: (equipment: EquipmentLine) => void;
  onRemove: () => void;
  showCosts?: boolean;
}) {
  const updateField = <K extends keyof EquipmentLine>(field: K, value: EquipmentLine[K]) => {
    const updated = { ...equipment, [field]: value };
    
    // Reset dependent fields when category changes
    if (field === 'category') {
      updated.subtype = '';
      updated.model = '';
      updated.size = '';
      updated.description = '';
      
      // Set default units based on category
      switch (value) {
        case 'SAFETY_EQUIPMENT':
        case 'HAND_TOOLS':
          updated.unit = 'EA';
          break;
        case 'LIFTS':
        case 'SCAFFOLDING':
          updated.unit = 'WEEK';
          break;
        default:
          updated.unit = 'DAY';
      }
    }
    
    // Reset size when subtype changes
    if (field === 'subtype') {
      updated.size = '';
      updated.model = '';
    }
    
    onUpdate(updated);
  };

  const needsSize = (cat: string, subtype: string): boolean => {
    if (cat === 'SCAFFOLDING' && subtype && subtype !== 'Other' && subtype !== 'Planks') return true;
    if (cat === 'LIFTS' && subtype && subtype !== 'Other') return true;
    if (cat === 'LADDERS' && subtype && subtype !== 'Other') return true;
    if (cat === 'GENERATORS_COMPRESSORS' && subtype && subtype !== 'Other') return true;
    return false;
  };

  const getSizeOptions = (cat: string, subtype: string): string[] => {
    if (cat === 'SCAFFOLDING') return SCAFFOLDING_HEIGHTS;
    if (cat === 'LIFTS') return LIFT_HEIGHTS;
    if (cat === 'LADDERS') return LADDER_HEIGHTS;
    if (cat === 'GENERATORS_COMPRESSORS') {
      if (subtype.includes('Compressor')) return COMPRESSOR_SIZES;
      return GENERATOR_SIZES;
    }
    return [];
  };

  const showQuantity = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(equipment.category);
  const showDuration = !showQuantity && equipment.category !== '';

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Equipment #{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Selection */}
      <div>
        <Label>Category</Label>
        <Select
          value={equipment.category}
          onValueChange={(value) => updateField('category', value as EquipmentCategory)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* POWER TOOLS */}
      {equipment.category === 'POWER_TOOLS' && (
        <>
          <div>
            <Label>Tool Type</Label>
            <Select
              value={equipment.subtype}
              onValueChange={(value) => updateField('subtype', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {POWER_TOOL_TYPES.map((tool) => (
                  <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {equipment.subtype === 'Other' && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the tool"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* HAND TOOLS */}
      {equipment.category === 'HAND_TOOLS' && (
        <>
          <div>
            <Label>Tool Type</Label>
            <Select
              value={equipment.subtype}
              onValueChange={(value) => updateField('subtype', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                {HAND_TOOL_TYPES.map((tool) => (
                  <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {equipment.subtype === 'Other' && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the tool"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* SCAFFOLDING */}
      {equipment.category === 'SCAFFOLDING' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={equipment.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {SCAFFOLDING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsSize(equipment.category, equipment.subtype) && (
              <div>
                <Label>Height</Label>
                <Select
                  value={equipment.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Height" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSizeOptions(equipment.category, equipment.subtype).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(equipment.subtype === 'Other' || equipment.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the scaffolding"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* LIFTS */}
      {equipment.category === 'LIFTS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={equipment.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {LIFT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsSize(equipment.category, equipment.subtype) && (
              <div>
                <Label>Working Height</Label>
                <Select
                  value={equipment.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Height" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSizeOptions(equipment.category, equipment.subtype).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(equipment.subtype === 'Other' || equipment.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the lift"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* LADDERS */}
      {equipment.category === 'LADDERS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={equipment.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {LADDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsSize(equipment.category, equipment.subtype) && (
              <div>
                <Label>Height</Label>
                <Select
                  value={equipment.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Height" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSizeOptions(equipment.category, equipment.subtype).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(equipment.subtype === 'Other' || equipment.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the ladder"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* SAFETY EQUIPMENT */}
      {equipment.category === 'SAFETY_EQUIPMENT' && (
        <>
          <div>
            <Label>Type</Label>
            <Select
              value={equipment.subtype}
              onValueChange={(value) => updateField('subtype', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SAFETY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {equipment.subtype === 'Other' && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the safety equipment"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* GENERATORS & COMPRESSORS */}
      {equipment.category === 'GENERATORS_COMPRESSORS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={equipment.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {GENERATOR_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsSize(equipment.category, equipment.subtype) && (
              <div>
                <Label>Size</Label>
                <Select
                  value={equipment.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSizeOptions(equipment.category, equipment.subtype).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(equipment.subtype === 'Other' || equipment.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={equipment.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the equipment"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* MISC / OTHER */}
      {equipment.category === 'MISC_OTHER' && (
        <>
          <div>
            <Label>Description *</Label>
            <Input
              value={equipment.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the equipment"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={equipment.unit}
              onValueChange={(value) => updateField('unit', value as EquipmentUnit)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Quantity - For tools and safety equipment */}
      {showQuantity && equipment.category && (
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            value={equipment.quantity === 0 ? '' : equipment.quantity}
            onChange={(e) => updateField('quantity', Number(e.target.value) || 0)}
            placeholder="1"
            className="mt-1"
          />
        </div>
      )}

      {/* Duration - For rental equipment */}
      {showDuration && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Duration</Label>
            <Input
              type="number"
              min={1}
              value={equipment.duration === 0 ? '' : equipment.duration}
              onChange={(e) => updateField('duration', Number(e.target.value) || 0)}
              placeholder="1"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={equipment.unit}
              onValueChange={(value) => updateField('unit', value as EquipmentUnit)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HR">Hours</SelectItem>
                <SelectItem value="DAY">Days</SelectItem>
                <SelectItem value="WEEK">Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Unit Cost - When TC is responsible */}
      {showCosts && equipment.category && (
        <div>
          <Label>Unit Cost ($)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={equipment.unit_cost === 0 ? '' : equipment.unit_cost}
            onChange={(e) => updateField('unit_cost', Number(e.target.value) || 0)}
            placeholder="0.00"
            className="mt-1"
          />
        </div>
      )}

      {/* Summary line */}
      {equipment.category && (showQuantity ? equipment.quantity > 0 : equipment.duration > 0) && (
        <div className="pt-2 border-t text-sm text-muted-foreground flex justify-between">
          <span>
            {showQuantity 
              ? `${equipment.quantity} × ${getEquipmentDisplayString(equipment)}`
              : `${getEquipmentDisplayString(equipment)} for ${equipment.duration} ${getUnitLabel(equipment.unit, equipment.duration)}`
            }
          </span>
          {showCosts && equipment.unit_cost > 0 && (
            <span className="font-mono font-medium text-foreground">
              ${((showQuantity ? equipment.quantity : equipment.duration) * equipment.unit_cost).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function EquipmentPicker({ equipment, onChange, showCosts = false }: EquipmentPickerProps) {
  const [showEquipment, setShowEquipment] = useState(equipment.length > 0);

  const handleAddEquipment = () => {
    setShowEquipment(true);
    onChange([...equipment, createEmptyEquipment()]);
  };

  const handleUpdateEquipment = (index: number, item: EquipmentLine) => {
    const updated = [...equipment];
    updated[index] = item;
    onChange(updated);
  };

  const handleRemoveEquipment = (index: number) => {
    const updated = equipment.filter((_, i) => i !== index);
    onChange(updated);
    if (updated.length === 0) {
      setShowEquipment(false);
    }
  };

  if (!showEquipment) {
    return (
      <div className="space-y-3">
        <Label className="text-base">Add equipment?</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddEquipment}
            className="flex-1"
          >
            Yes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowEquipment(false)}
            className="flex-1 bg-muted"
            disabled
          >
            No
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {equipment.map((item, index) => (
        <EquipmentLineEditor
          key={item.id}
          equipment={item}
          index={index}
          onUpdate={(updated) => handleUpdateEquipment(index, updated)}
          onRemove={() => handleRemoveEquipment(index)}
          showCosts={showCosts}
        />
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={handleAddEquipment}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Equipment
      </Button>

      {/* Equipment Summary */}
      {equipment.length > 0 && equipment.some(e => e.category && (e.quantity > 0 || e.duration > 0)) && (
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Equipment Summary
          </div>
          <ul className="text-sm space-y-1">
            {equipment
              .filter(e => e.category && (e.quantity > 0 || e.duration > 0))
              .map((e) => {
                const isQuantityBased = ['SAFETY_EQUIPMENT', 'HAND_TOOLS', 'POWER_TOOLS'].includes(e.category);
                const qty = isQuantityBased ? e.quantity : e.duration;
                return (
                  <li key={e.id} className="text-muted-foreground flex justify-between">
                    <span>
                      • {isQuantityBased
                        ? `${e.quantity} × ${getEquipmentDisplayString(e)}`
                        : `${getEquipmentDisplayString(e)} for ${e.duration} ${getUnitLabel(e.unit, e.duration)}`
                      }
                    </span>
                    {showCosts && e.unit_cost > 0 && (
                      <span className="font-mono">${(qty * e.unit_cost).toFixed(2)}</span>
                    )}
                  </li>
                );
              })}
          </ul>
          {showCosts && calculateEquipmentCost(equipment) > 0 && (
            <div className="mt-2 pt-2 border-t border-accent/20 flex justify-between text-sm font-medium">
              <span>Equipment Total</span>
              <span className="font-mono">${calculateEquipmentCost(equipment).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
