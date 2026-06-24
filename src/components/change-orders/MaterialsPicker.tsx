import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package } from 'lucide-react';

export type MaterialCategory = 
  | 'DIMENSIONAL_LUMBER'
  | 'ENGINEERED_LUMBER'
  | 'SHEATHING_PANELS'
  | 'SIDING'
  | 'FASTENERS'
  | 'HARDWARE_CONNECTORS'
  | 'MISC_OTHER';

export type MaterialUnit = 'EA' | 'LF' | 'SF' | 'BOX' | 'BUCKET' | 'COIL' | 'SHEET';

export interface MaterialLine {
  id: string;
  category: MaterialCategory | '';
  subtype: string;
  size: string;
  length: string;
  thickness: string;
  width: string;
  depth: string;
  profile: string;
  packaging: string;
  quantity: number;
  unit: MaterialUnit;
  description: string;
  unit_cost: number;
}

interface MaterialsPickerProps {
  materials: MaterialLine[];
  onChange: (materials: MaterialLine[]) => void;
  showCosts?: boolean;
}

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'DIMENSIONAL_LUMBER', label: 'Dimensional Lumber' },
  { value: 'ENGINEERED_LUMBER', label: 'Engineered Lumber' },
  { value: 'SHEATHING_PANELS', label: 'Sheathing / Panels' },
  { value: 'SIDING', label: 'Siding' },
  { value: 'FASTENERS', label: 'Fasteners' },
  { value: 'HARDWARE_CONNECTORS', label: 'Hardware / Connectors' },
  { value: 'MISC_OTHER', label: 'Misc / Other' },
];

// Dimensional Lumber options
const LUMBER_SIZES = ['2x4', '2x6', '2x8', '2x10', '2x12', '4x4', '6x6', 'Other'];
const LUMBER_LENGTHS = ['8', '10', '12', '14', '16', '18', '20', 'Other'];

// Engineered Lumber options
const ENGINEERED_TYPES = ['LVL', 'PSL', 'LSL', 'I-Joist', 'Rim Board', 'Other'];
const ENGINEERED_DEPTHS = ['9-1/4', '9-1/2', '11-1/4', '11-7/8', '14', '16', '18', 'Other'];
const ENGINEERED_WIDTHS = ['1-3/4', '3-1/2', '5-1/4', '7', 'Other'];
const IJOIST_SERIES = ['TJI 110', 'TJI 210', 'TJI 230', 'TJI 360', 'TJI 560', 'Other'];

// Sheathing options
const PANEL_TYPES = ['OSB', 'Plywood', 'Zip System', 'Other'];
const PANEL_THICKNESSES = ['7/16', '1/2', '5/8', '3/4', 'Other'];
const SHEET_SIZES = ['4x8', '4x9', '4x10', 'Other'];

// Siding options
const SIDING_TYPES = ['Fiber Cement', 'Wood', 'Engineered Wood', 'Metal', 'Vinyl', 'Other'];
const SIDING_PROFILES = ['Lap', 'Panel', 'Board & Batten', 'Shingle', 'Other'];

// Fastener options
const FASTENER_TYPES = ['Nails', 'Screws', 'Bolts', 'Anchors', 'Staples', 'Other'];
const NAIL_SIZES = ['6d', '8d', '10d', '12d', '16d', 'Other'];
const SCREW_SIZES = ['#6 x 1"', '#6 x 1-1/4"', '#8 x 2"', '#8 x 2-1/2"', '#8 x 3"', '#10 x 3"', '#10 x 4"', 'Other'];
const BOLT_SIZES = ['1/4" x 3"', '1/4" x 4"', '3/8" x 4"', '3/8" x 6"', '1/2" x 6"', '1/2" x 8"', 'Other'];
const PACKAGING_OPTIONS = ['Loose', 'Box', 'Bucket', 'Coil'];

// Hardware options
const HARDWARE_TYPES = ['Hangers', 'Straps', 'Ties', 'Holdowns', 'Plates', 'Other'];
const HANGER_MODELS = ['LUS26', 'LUS28', 'LUS210', 'HU26', 'HU28', 'HU210', 'HU212', 'Other'];
const STRAP_MODELS = ['ST6224', 'ST2215', 'LSTA', 'MSTA', 'Other'];
const TIE_MODELS = ['H1', 'H2.5A', 'H10', 'Other'];
const HOLDOWN_MODELS = ['HD2A', 'HD5A', 'HD7A', 'HD10', 'HDU2', 'HDU4', 'HDU8', 'Other'];
const PLATE_MODELS = ['MP14', 'MP24', 'MP36', 'MP48', 'Other'];

// Unit options
const UNIT_OPTIONS: { value: MaterialUnit; label: string }[] = [
  { value: 'EA', label: 'Pieces' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'SHEET', label: 'Sheets' },
  { value: 'BOX', label: 'Boxes' },
  { value: 'BUCKET', label: 'Buckets' },
  { value: 'COIL', label: 'Coils' },
];

export const createEmptyMaterial = (): MaterialLine => ({
  id: crypto.randomUUID(),
  category: '',
  subtype: '',
  size: '',
  length: '',
  thickness: '',
  width: '',
  depth: '',
  profile: '',
  packaging: '',
  quantity: 0,
  unit: 'EA',
  description: '',
  unit_cost: 0,
});

export const getMaterialDisplayString = (material: MaterialLine): string => {
  const parts: string[] = [];
  
  if (material.category === 'DIMENSIONAL_LUMBER') {
    if (material.size) parts.push(material.size);
    if (material.length) parts.push(`${material.length}'`);
    parts.push('Lumber');
  } else if (material.category === 'ENGINEERED_LUMBER') {
    if (material.subtype) parts.push(material.subtype);
    if (material.depth) parts.push(`${material.depth}" deep`);
    if (material.length) parts.push(`${material.length}'`);
  } else if (material.category === 'SHEATHING_PANELS') {
    if (material.subtype) parts.push(material.subtype);
    if (material.thickness) parts.push(`${material.thickness}"`);
    if (material.size) parts.push(material.size);
  } else if (material.category === 'SIDING') {
    if (material.subtype) parts.push(material.subtype);
    if (material.profile) parts.push(material.profile);
  } else if (material.category === 'FASTENERS') {
    if (material.subtype) parts.push(material.subtype);
    if (material.size) parts.push(material.size);
  } else if (material.category === 'HARDWARE_CONNECTORS') {
    if (material.subtype) parts.push(material.subtype);
    if (material.size) parts.push(material.size);
  } else if (material.category === 'MISC_OTHER') {
    if (material.description) parts.push(material.description);
  }
  
  if (parts.length === 0) return 'Material';
  return parts.join(' ');
};

export const calculateMaterialsCost = (materials: MaterialLine[]): number => {
  return materials.reduce((total, m) => total + (m.quantity * m.unit_cost), 0);
};

function MaterialLineEditor({ 
  material, 
  index,
  onUpdate, 
  onRemove,
  showCosts = false
}: { 
  material: MaterialLine; 
  index: number;
  onUpdate: (material: MaterialLine) => void;
  onRemove: () => void;
  showCosts?: boolean;
}) {
  const updateField = <K extends keyof MaterialLine>(field: K, value: MaterialLine[K]) => {
    const updated = { ...material, [field]: value };
    
    // Reset dependent fields when category changes
    if (field === 'category') {
      updated.subtype = '';
      updated.size = '';
      updated.length = '';
      updated.thickness = '';
      updated.width = '';
      updated.depth = '';
      updated.profile = '';
      updated.packaging = '';
      updated.description = '';
      
      // Set default units based on category
      switch (value) {
        case 'SHEATHING_PANELS':
          updated.unit = 'SHEET';
          break;
        case 'SIDING':
          updated.unit = 'SF';
          break;
        default:
          updated.unit = 'EA';
      }
    }
    
    // Reset subtype-dependent fields when subtype changes
    if (field === 'subtype') {
      updated.size = '';
      updated.length = '';
      updated.depth = '';
      updated.width = '';
    }
    
    onUpdate(updated);
  };

  const getFastenerSizes = (type: string): string[] => {
    switch (type) {
      case 'Nails': return NAIL_SIZES;
      case 'Screws': return SCREW_SIZES;
      case 'Bolts': return BOLT_SIZES;
      default: return ['Other'];
    }
  };

  const getHardwareModels = (type: string): string[] => {
    switch (type) {
      case 'Hangers': return HANGER_MODELS;
      case 'Straps': return STRAP_MODELS;
      case 'Ties': return TIE_MODELS;
      case 'Holdowns': return HOLDOWN_MODELS;
      case 'Plates': return PLATE_MODELS;
      default: return ['Other'];
    }
  };

  const isEngineeredBeam = ['LVL', 'PSL', 'LSL'].includes(material.subtype);
  const isIJoist = material.subtype === 'I-Joist';

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Material #{index + 1}</span>
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
          value={material.category}
          onValueChange={(value) => updateField('category', value as MaterialCategory)}
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

      {/* DIMENSIONAL LUMBER */}
      {material.category === 'DIMENSIONAL_LUMBER' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Size</Label>
              <Select
                value={material.size}
                onValueChange={(value) => updateField('size', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {LUMBER_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Length (ft)</Label>
              <Select
                value={material.length}
                onValueChange={(value) => updateField('length', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  {LUMBER_LENGTHS.map((len) => (
                    <SelectItem key={len} value={len}>{len}'</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(material.size === 'Other' || material.length === 'Other') && (
            <div>
              <Label>Custom Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the lumber"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* ENGINEERED LUMBER */}
      {material.category === 'ENGINEERED_LUMBER' && (
        <>
          <div>
            <Label>Type</Label>
            <Select
              value={material.subtype}
              onValueChange={(value) => updateField('subtype', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ENGINEERED_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isEngineeredBeam && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Depth (in)</Label>
                <Select
                  value={material.depth}
                  onValueChange={(value) => updateField('depth', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINEERED_DEPTHS.map((d) => (
                      <SelectItem key={d} value={d}>{d}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Width (in)</Label>
                <Select
                  value={material.width}
                  onValueChange={(value) => updateField('width', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Width" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINEERED_WIDTHS.map((w) => (
                      <SelectItem key={w} value={w}>{w}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length (ft)</Label>
                <Select
                  value={material.length}
                  onValueChange={(value) => updateField('length', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Length" />
                  </SelectTrigger>
                  <SelectContent>
                    {LUMBER_LENGTHS.map((len) => (
                      <SelectItem key={len} value={len}>{len}'</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {isIJoist && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Series</Label>
                <Select
                  value={material.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Series" />
                  </SelectTrigger>
                  <SelectContent>
                    {IJOIST_SERIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Depth (in)</Label>
                <Select
                  value={material.depth}
                  onValueChange={(value) => updateField('depth', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINEERED_DEPTHS.map((d) => (
                      <SelectItem key={d} value={d}>{d}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length (ft)</Label>
                <Select
                  value={material.length}
                  onValueChange={(value) => updateField('length', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Length" />
                  </SelectTrigger>
                  <SelectContent>
                    {LUMBER_LENGTHS.map((len) => (
                      <SelectItem key={len} value={len}>{len}'</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {material.subtype === 'Rim Board' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Depth (in)</Label>
                <Select
                  value={material.depth}
                  onValueChange={(value) => updateField('depth', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINEERED_DEPTHS.map((d) => (
                      <SelectItem key={d} value={d}>{d}"</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length (ft)</Label>
                <Select
                  value={material.length}
                  onValueChange={(value) => updateField('length', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Length" />
                  </SelectTrigger>
                  <SelectContent>
                    {LUMBER_LENGTHS.map((len) => (
                      <SelectItem key={len} value={len}>{len}'</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {material.subtype === 'Other' && (
            <div>
              <Label>Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the engineered lumber"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* SHEATHING / PANELS */}
      {material.category === 'SHEATHING_PANELS' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Panel Type</Label>
              <Select
                value={material.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {PANEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Thickness</Label>
              <Select
                value={material.thickness}
                onValueChange={(value) => updateField('thickness', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Thick" />
                </SelectTrigger>
                <SelectContent>
                  {PANEL_THICKNESSES.map((t) => (
                    <SelectItem key={t} value={t}>{t}"</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sheet Size</Label>
              <Select
                value={material.size}
                onValueChange={(value) => updateField('size', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {SHEET_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(material.subtype === 'Other' || material.thickness === 'Other' || material.size === 'Other') && (
            <div>
              <Label>Custom Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the panel"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* SIDING */}
      {material.category === 'SIDING' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={material.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {SIDING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profile</Label>
              <Select
                value={material.profile}
                onValueChange={(value) => updateField('profile', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Profile" />
                </SelectTrigger>
                <SelectContent>
                  {SIDING_PROFILES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={material.unit}
              onValueChange={(value) => updateField('unit', value as MaterialUnit)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SF">Square Feet</SelectItem>
                <SelectItem value="EA">Pieces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(material.subtype === 'Other' || material.profile === 'Other') && (
            <div>
              <Label>Custom Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the siding"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* FASTENERS */}
      {material.category === 'FASTENERS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fastener Type</Label>
              <Select
                value={material.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {FASTENER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {material.subtype && material.subtype !== 'Other' && (
              <div>
                <Label>Size</Label>
                <Select
                  value={material.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFastenerSizes(material.subtype).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {material.subtype && material.subtype !== 'Other' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Packaging</Label>
                <Select
                  value={material.packaging}
                  onValueChange={(value) => updateField('packaging', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={material.unit}
                  onValueChange={(value) => updateField('unit', value as MaterialUnit)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">Count</SelectItem>
                    <SelectItem value="BOX">Boxes</SelectItem>
                    <SelectItem value="BUCKET">Buckets</SelectItem>
                    <SelectItem value="COIL">Coils</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {(material.subtype === 'Other' || material.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the fasteners"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* HARDWARE / CONNECTORS */}
      {material.category === 'HARDWARE_CONNECTORS' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={material.subtype}
                onValueChange={(value) => updateField('subtype', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {HARDWARE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {material.subtype && material.subtype !== 'Other' && (
              <div>
                <Label>Model / Size</Label>
                <Select
                  value={material.size}
                  onValueChange={(value) => updateField('size', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getHardwareModels(material.subtype).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {(material.subtype === 'Other' || material.size === 'Other') && (
            <div>
              <Label>Description</Label>
              <Input
                value={material.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the hardware"
                className="mt-1"
              />
            </div>
          )}
        </>
      )}

      {/* MISC / OTHER */}
      {material.category === 'MISC_OTHER' && (
        <>
          <div>
            <Label>Description *</Label>
            <Input
              value={material.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the material"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={material.unit}
              onValueChange={(value) => updateField('unit', value as MaterialUnit)}
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

      {/* Quantity and Cost - Shown after category is selected */}
      {material.category && (
        <div className={showCosts ? "grid grid-cols-2 gap-4" : ""}>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min={0}
              value={material.quantity === 0 ? '' : material.quantity}
              onChange={(e) => updateField('quantity', Number(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
          </div>
          {showCosts && (
            <div>
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={material.unit_cost === 0 ? '' : material.unit_cost}
                onChange={(e) => updateField('unit_cost', Number(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Summary line */}
      {material.category && material.quantity > 0 && (
        <div className="pt-2 border-t text-sm text-muted-foreground flex justify-between">
          <span>{material.quantity} × {getMaterialDisplayString(material)}</span>
          {showCosts && material.unit_cost > 0 && (
            <span className="font-mono font-medium text-foreground">
              ${(material.quantity * material.unit_cost).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function MaterialsPicker({ materials, onChange, showCosts = false }: MaterialsPickerProps) {
  const [showMaterials, setShowMaterials] = useState(materials.length > 0);

  const handleAddMaterial = () => {
    setShowMaterials(true);
    onChange([...materials, createEmptyMaterial()]);
  };

  const handleUpdateMaterial = (index: number, material: MaterialLine) => {
    const updated = [...materials];
    updated[index] = material;
    onChange(updated);
  };

  const handleRemoveMaterial = (index: number) => {
    const updated = materials.filter((_, i) => i !== index);
    onChange(updated);
    if (updated.length === 0) {
      setShowMaterials(false);
    }
  };

  if (!showMaterials) {
    return (
      <div className="space-y-3">
        <Label className="text-base">Add extra materials?</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddMaterial}
            className="flex-1"
          >
            Yes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMaterials(false)}
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
      {materials.map((material, index) => (
        <MaterialLineEditor
          key={material.id}
          material={material}
          index={index}
          onUpdate={(updated) => handleUpdateMaterial(index, updated)}
          onRemove={() => handleRemoveMaterial(index)}
          showCosts={showCosts}
        />
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={handleAddMaterial}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Material
      </Button>

      {/* Materials Summary */}
      {materials.length > 0 && materials.some(m => m.quantity > 0) && (
        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materials Summary
          </div>
          <ul className="text-sm space-y-1">
            {materials
              .filter(m => m.quantity > 0)
              .map((m) => (
                <li key={m.id} className="text-muted-foreground flex justify-between">
                  <span>• {m.quantity} × {getMaterialDisplayString(m)}</span>
                  {showCosts && m.unit_cost > 0 && (
                    <span className="font-mono">${(m.quantity * m.unit_cost).toFixed(2)}</span>
                  )}
                </li>
              ))}
          </ul>
          {showCosts && calculateMaterialsCost(materials) > 0 && (
            <div className="mt-2 pt-2 border-t border-accent/20 flex justify-between text-sm font-medium">
              <span>Materials Total</span>
              <span className="font-mono">${calculateMaterialsCost(materials).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
