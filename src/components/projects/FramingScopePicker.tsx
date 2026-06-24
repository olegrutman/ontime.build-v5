import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Types for framing scope
export interface FramingScope {
  structural_framing: {
    enabled: boolean;
    steel_beams: boolean;
    wood_beams: boolean;
    other: boolean;
    other_text: string;
  };
  wall_framing: {
    enabled: boolean;
    stick_framed: boolean;
    panelized: boolean;
  };
  floor_framing: {
    enabled: boolean;
    tji_joists: boolean;
    floor_trusses: boolean;
    dimensional_lumber: boolean;
  };
  roof_framing: {
    enabled: boolean;
    roof_trusses: boolean;
    structural_beams: boolean;
    stick_framed: boolean;
    roof_type: '' | 'flat' | 'gable' | 'roof_deck';
  };
  wall_sheathing: {
    enabled: boolean;
    structural: boolean;
    insulated_integrated: boolean;
  };
  siding: {
    enabled: boolean;
    wood: boolean;
    fiber_cement: boolean;
    other: boolean;
    other_text: string;
  };
  fascia_soffit: {
    enabled: boolean;
    tg_wood_soffit: boolean;
    fiber_cement_soffit: boolean;
    wood_fascia: boolean;
    other: boolean;
    other_text: string;
  };
  decorative_exterior: {
    enabled: boolean;
    corbels: boolean;
    columns: boolean;
    wood_elements: boolean;
    metal_composite: boolean;
    other: boolean;
    other_text: string;
  };
  window_installation: {
    enabled: boolean;
    wood: boolean;
    vinyl_plastic: boolean;
    aluminum: boolean;
    other: boolean;
    other_text: string;
  };
  patio_doors: {
    enabled: boolean;
    wood: boolean;
    vinyl_plastic: boolean;
    aluminum: boolean;
    other: boolean;
    other_text: string;
  };
}

export const getDefaultFramingScope = (): FramingScope => ({
  structural_framing: {
    enabled: false,
    steel_beams: false,
    wood_beams: false,
    other: false,
    other_text: '',
  },
  wall_framing: {
    enabled: true,
    stick_framed: true,
    panelized: false,
  },
  floor_framing: {
    enabled: true,
    tji_joists: false,
    floor_trusses: false,
    dimensional_lumber: true,
  },
  roof_framing: {
    enabled: false,
    roof_trusses: false,
    structural_beams: false,
    stick_framed: false,
    roof_type: '',
  },
  wall_sheathing: {
    enabled: false,
    structural: false,
    insulated_integrated: false,
  },
  siding: {
    enabled: false,
    wood: false,
    fiber_cement: false,
    other: false,
    other_text: '',
  },
  fascia_soffit: {
    enabled: false,
    tg_wood_soffit: false,
    fiber_cement_soffit: false,
    wood_fascia: false,
    other: false,
    other_text: '',
  },
  decorative_exterior: {
    enabled: false,
    corbels: false,
    columns: false,
    wood_elements: false,
    metal_composite: false,
    other: false,
    other_text: '',
  },
  window_installation: {
    enabled: false,
    wood: false,
    vinyl_plastic: false,
    aluminum: false,
    other: false,
    other_text: '',
  },
  patio_doors: {
    enabled: false,
    wood: false,
    vinyl_plastic: false,
    aluminum: false,
    other: false,
    other_text: '',
  },
});

interface FramingScopePickerProps {
  value: FramingScope;
  onChange: (scope: FramingScope) => void;
}

interface ScopeCategory {
  key: keyof FramingScope;
  label: string;
  subOptions: { key: string; label: string }[];
  hasOther?: boolean;
  hasRoofType?: boolean;
}

const SCOPE_CATEGORIES: ScopeCategory[] = [
  {
    key: 'structural_framing',
    label: 'Structural Framing',
    subOptions: [
      { key: 'steel_beams', label: 'Structural steel beams & supports' },
      { key: 'wood_beams', label: 'Structural wood beams' },
    ],
    hasOther: true,
  },
  {
    key: 'wall_framing',
    label: 'Wall Framing',
    subOptions: [
      { key: 'stick_framed', label: 'Stick framed' },
      { key: 'panelized', label: 'Panelized' },
    ],
  },
  {
    key: 'floor_framing',
    label: 'Floor Framing',
    subOptions: [
      { key: 'tji_joists', label: 'TJI / I-joists' },
      { key: 'floor_trusses', label: 'Floor trusses' },
      { key: 'dimensional_lumber', label: 'Dimensional lumber' },
    ],
  },
  {
    key: 'roof_framing',
    label: 'Roof Framing',
    subOptions: [
      { key: 'roof_trusses', label: 'Roof trusses' },
      { key: 'structural_beams', label: 'Structural roof beams' },
      { key: 'stick_framed', label: 'Stick framed' },
    ],
    hasRoofType: true,
  },
  {
    key: 'wall_sheathing',
    label: 'Wall Sheathing',
    subOptions: [
      { key: 'structural', label: 'Structural sheathing' },
      { key: 'insulated_integrated', label: 'Insulated / integrated sheathing' },
    ],
  },
  {
    key: 'siding',
    label: 'Siding',
    subOptions: [
      { key: 'wood', label: 'Wood' },
      { key: 'fiber_cement', label: 'Fiber cement' },
    ],
    hasOther: true,
  },
  {
    key: 'fascia_soffit',
    label: 'Fascia & Soffit',
    subOptions: [
      { key: 'tg_wood_soffit', label: 'T&G wood soffit' },
      { key: 'fiber_cement_soffit', label: 'Fiber cement soffit' },
      { key: 'wood_fascia', label: 'Wood fascia' },
    ],
    hasOther: true,
  },
  {
    key: 'decorative_exterior',
    label: 'Decorative Exterior',
    subOptions: [
      { key: 'corbels', label: 'Corbels' },
      { key: 'columns', label: 'Columns' },
      { key: 'wood_elements', label: 'Wood elements' },
      { key: 'metal_composite', label: 'Metal / composite' },
    ],
    hasOther: true,
  },
  {
    key: 'window_installation',
    label: 'Window Installation',
    subOptions: [
      { key: 'wood', label: 'Wood' },
      { key: 'vinyl_plastic', label: 'Vinyl / plastic' },
      { key: 'aluminum', label: 'Aluminum' },
    ],
    hasOther: true,
  },
  {
    key: 'patio_doors',
    label: 'Patio Doors',
    subOptions: [
      { key: 'wood', label: 'Wood' },
      { key: 'vinyl_plastic', label: 'Vinyl / plastic' },
      { key: 'aluminum', label: 'Aluminum' },
    ],
    hasOther: true,
  },
];

const ROOF_TYPES = [
  { value: 'flat', label: 'Flat' },
  { value: 'gable', label: 'Gable' },
  { value: 'roof_deck', label: 'Roof deck' },
];

export default function FramingScopePicker({ value, onChange }: FramingScopePickerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const updateCategoryEnabled = (categoryKey: keyof FramingScope, enabled: boolean) => {
    const updatedScope = { ...value };
    const category = updatedScope[categoryKey] as Record<string, unknown>;
    category.enabled = enabled;
    
    // Auto-expand when enabling
    if (enabled && !expandedCategories.has(categoryKey)) {
      setExpandedCategories(prev => new Set([...prev, categoryKey]));
    }
    
    onChange(updatedScope);
  };

  const updateSubOption = (categoryKey: keyof FramingScope, optionKey: string, optionValue: boolean | string) => {
    const updatedScope = { ...value };
    const category = updatedScope[categoryKey] as Record<string, unknown>;
    category[optionKey] = optionValue;
    onChange(updatedScope);
  };

  return (
    <div className="space-y-2">
      {SCOPE_CATEGORIES.map((category) => {
        const categoryData = value[category.key] as Record<string, unknown>;
        const isEnabled = categoryData.enabled as boolean;
        const isExpanded = expandedCategories.has(category.key);
        
        return (
          <div 
            key={category.key}
            className={`rounded-lg border-2 transition-all ${
              isEnabled ? 'border-accent bg-accent/5' : 'border-border'
            }`}
          >
            {/* Category Header */}
            <div className="flex items-center gap-3 p-3">
              <Checkbox
                id={`category-${category.key}`}
                checked={isEnabled}
                onCheckedChange={(checked) => updateCategoryEnabled(category.key, !!checked)}
              />
              <button
                type="button"
                onClick={() => toggleCategory(category.key)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <Label 
                  htmlFor={`category-${category.key}`} 
                  className="font-medium text-sm cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {category.label}
                </Label>
                {isEnabled && (
                  isExpanded 
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Sub-options (visible when enabled and expanded) */}
            {isEnabled && isExpanded && (
              <div className="px-3 pb-3 pt-1 ml-6 space-y-2 border-t border-border/50">
                {category.subOptions.map((option) => (
                  <label
                    key={option.key}
                    htmlFor={`${category.key}-${option.key}`}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${
                      categoryData[option.key] ? 'bg-accent/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      id={`${category.key}-${option.key}`}
                      checked={categoryData[option.key] as boolean}
                      onCheckedChange={(checked) => updateSubOption(category.key, option.key, !!checked)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}

                {/* Roof Type selector */}
                {category.hasRoofType && (
                  <div className="pt-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Roof Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {ROOF_TYPES.map((roofType) => (
                        <button
                          key={roofType.value}
                          type="button"
                          onClick={() => updateSubOption(category.key, 'roof_type', 
                            (categoryData.roof_type === roofType.value) ? '' : roofType.value
                          )}
                          className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                            categoryData.roof_type === roofType.value
                              ? 'border-accent bg-accent/20 text-accent font-medium'
                              : 'border-border hover:border-accent/50'
                          }`}
                        >
                          {roofType.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other option with text field */}
                {category.hasOther && (
                  <div className="pt-1 space-y-2">
                    <label
                      htmlFor={`${category.key}-other`}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${
                        categoryData.other ? 'bg-accent/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`${category.key}-other`}
                        checked={categoryData.other as boolean}
                        onCheckedChange={(checked) => updateSubOption(category.key, 'other', !!checked)}
                      />
                      <span className="text-sm">Other</span>
                    </label>
                    {categoryData.other && (
                      <Input
                        placeholder="Specify other..."
                        value={categoryData.other_text as string}
                        onChange={(e) => updateSubOption(category.key, 'other_text', e.target.value)}
                        className="ml-6 h-9 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper to convert FramingScope to flat scope flags for backend
export const framingScopeToFlags = (scope: FramingScope): Record<string, boolean | string> => {
  const flags: Record<string, boolean | string> = {};
  
  // Map each category
  if (scope.structural_framing.enabled) {
    flags.structural_framing = true;
    flags.structural_steel_beams = scope.structural_framing.steel_beams;
    flags.structural_wood_beams = scope.structural_framing.wood_beams;
    if (scope.structural_framing.other && scope.structural_framing.other_text) {
      flags.structural_framing_other = scope.structural_framing.other_text;
    }
  }
  
  if (scope.wall_framing.enabled) {
    flags.wall_framing = true;
    flags.wall_framing_stick = scope.wall_framing.stick_framed;
    flags.wall_framing_panelized = scope.wall_framing.panelized;
  }
  
  if (scope.floor_framing.enabled) {
    flags.floor_framing = true;
    flags.floor_framing_tji = scope.floor_framing.tji_joists;
    flags.floor_framing_trusses = scope.floor_framing.floor_trusses;
    flags.floor_framing_dimensional = scope.floor_framing.dimensional_lumber;
  }
  
  if (scope.roof_framing.enabled) {
    flags.roof_framing = true;
    flags.roof_framing_trusses = scope.roof_framing.roof_trusses;
    flags.roof_framing_beams = scope.roof_framing.structural_beams;
    flags.roof_framing_stick = scope.roof_framing.stick_framed;
    if (scope.roof_framing.roof_type) {
      flags.roof_type = scope.roof_framing.roof_type;
    }
  }
  
  if (scope.wall_sheathing.enabled) {
    flags.wall_sheathing = true;
    flags.sheathing_structural = scope.wall_sheathing.structural;
    flags.sheathing_insulated = scope.wall_sheathing.insulated_integrated;
  }
  
  if (scope.siding.enabled) {
    flags.siding = true;
    flags.siding_wood = scope.siding.wood;
    flags.siding_fiber_cement = scope.siding.fiber_cement;
    if (scope.siding.other && scope.siding.other_text) {
      flags.siding_other = scope.siding.other_text;
    }
  }
  
  if (scope.fascia_soffit.enabled) {
    flags.fascia_soffit = true;
    flags.soffit_tg_wood = scope.fascia_soffit.tg_wood_soffit;
    flags.soffit_fiber_cement = scope.fascia_soffit.fiber_cement_soffit;
    flags.fascia_wood = scope.fascia_soffit.wood_fascia;
    if (scope.fascia_soffit.other && scope.fascia_soffit.other_text) {
      flags.fascia_soffit_other = scope.fascia_soffit.other_text;
    }
  }
  
  if (scope.decorative_exterior.enabled) {
    flags.decorative_exterior = true;
    flags.decorative_corbels = scope.decorative_exterior.corbels;
    flags.decorative_columns = scope.decorative_exterior.columns;
    flags.decorative_wood = scope.decorative_exterior.wood_elements;
    flags.decorative_metal = scope.decorative_exterior.metal_composite;
    if (scope.decorative_exterior.other && scope.decorative_exterior.other_text) {
      flags.decorative_other = scope.decorative_exterior.other_text;
    }
  }
  
  if (scope.window_installation.enabled) {
    flags.windows_installation = true;
    flags.windows_wood = scope.window_installation.wood;
    flags.windows_vinyl = scope.window_installation.vinyl_plastic;
    flags.windows_aluminum = scope.window_installation.aluminum;
    if (scope.window_installation.other && scope.window_installation.other_text) {
      flags.windows_other = scope.window_installation.other_text;
    }
  }
  
  if (scope.patio_doors.enabled) {
    flags.patio_doors_installation = true;
    flags.patio_doors_wood = scope.patio_doors.wood;
    flags.patio_doors_vinyl = scope.patio_doors.vinyl_plastic;
    flags.patio_doors_aluminum = scope.patio_doors.aluminum;
    if (scope.patio_doors.other && scope.patio_doors.other_text) {
      flags.patio_doors_other = scope.patio_doors.other_text;
    }
  }
  
  return flags;
};

// Get summary of selected scopes for display
export const getFramingScopeSummary = (scope: FramingScope): string[] => {
  const summary: string[] = [];
  
  if (scope.structural_framing.enabled) summary.push('Structural Framing');
  if (scope.wall_framing.enabled) summary.push('Wall Framing');
  if (scope.floor_framing.enabled) summary.push('Floor Framing');
  if (scope.roof_framing.enabled) summary.push('Roof Framing');
  if (scope.wall_sheathing.enabled) summary.push('Wall Sheathing');
  if (scope.siding.enabled) summary.push('Siding');
  if (scope.fascia_soffit.enabled) summary.push('Fascia & Soffit');
  if (scope.decorative_exterior.enabled) summary.push('Decorative Exterior');
  if (scope.window_installation.enabled) summary.push('Window Installation');
  if (scope.patio_doors.enabled) summary.push('Patio Doors');
  
  return summary;
};
