import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { SIDING_MATERIALS } from '@/types/projectWizard';
import { BUILDING_TYPES, type BuildingType } from '@/hooks/useSetupWizardV2';
import { cn } from '@/lib/utils';

export interface TMBuildingInfo {
  materialResponsibility: 'GC' | 'TC' | 'SPLIT';
  buildingType: string;
  stories: number;
  foundationType: 'Slab' | 'Crawl Space' | 'Basement' | '';
  basementType?: 'Walkout' | 'Garden Level' | 'Standard';
  basementFinish?: 'Finished' | 'Unfinished' | 'Partially Finished';
  garageType: 'Attached' | 'Detached' | 'None';
  sidingIncluded: boolean;
  sidingMaterials: string[];
  totalSqft?: number;
}

export const initialTMBuildingInfo: TMBuildingInfo = {
  materialResponsibility: 'GC',
  buildingType: '',
  stories: 1,
  foundationType: '',
  garageType: 'None',
  sidingIncluded: false,
  sidingMaterials: [],
};

interface Props {
  data: TMBuildingInfo;
  onChange: (updates: Partial<TMBuildingInfo>) => void;
}

export function TMBuildingInfoStep({ data, onChange }: Props) {
  const toggleSidingMaterial = (mat: string) => {
    const current = data.sidingMaterials;
    onChange({
      sidingMaterials: current.includes(mat)
        ? current.filter((m) => m !== mat)
        : [...current, mat],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Building Info</h2>
        <p className="text-sm text-muted-foreground">
          Describe the building so Work Orders have proper context — no SOV is generated for T&M projects.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Material Responsibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.materialResponsibility}
            onValueChange={(v) => onChange({ materialResponsibility: v as TMBuildingInfo['materialResponsibility'] })}
            className="flex gap-4"
          >
            {(['GC', 'TC', 'SPLIT'] as const).map((val) => (
              <div key={val} className="flex items-center gap-2">
                <RadioGroupItem value={val} id={`mat-${val}`} />
                <Label htmlFor={`mat-${val}`} className="cursor-pointer">
                  {val === 'SPLIT' ? 'Split' : val}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Building Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Building type */}
          <div className="space-y-1.5">
            <Label>Building Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {BUILDING_TYPES.map((bt) => (
                <button
                  key={bt.slug}
                  type="button"
                  onClick={() => onChange({ buildingType: bt.slug })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center',
                    'hover:border-primary/60 hover:bg-primary/5',
                    data.buildingType === bt.slug
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card',
                  )}
                >
                  <span className="text-2xl">{bt.icon}</span>
                  <span className="font-heading text-xs font-bold leading-tight">{bt.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{bt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Stories */}
            <div className="space-y-1.5">
              <Label>Number of Stories *</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={data.stories}
                onChange={(e) => onChange({ stories: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>

            {/* Sqft */}
            <div className="space-y-1.5">
              <Label>Total Sqft (optional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 3200"
                value={data.totalSqft ?? ''}
                onChange={(e) => onChange({ totalSqft: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Foundation */}
          <div className="space-y-1.5">
            <Label>Foundation Type *</Label>
            <RadioGroup
              value={data.foundationType}
              onValueChange={(v) => {
                const ft = v as TMBuildingInfo['foundationType'];
                onChange({
                  foundationType: ft,
                  basementType: ft === 'Basement' ? (data.basementType || 'Standard') : undefined,
                  basementFinish: ft === 'Basement' ? (data.basementFinish || 'Unfinished') : undefined,
                });
              }}
              className="flex gap-4"
            >
              {(['Slab', 'Crawl Space', 'Basement'] as const).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`fnd-${f}`} />
                  <Label htmlFor={`fnd-${f}`} className="cursor-pointer">{f}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Basement sub-fields */}
          {data.foundationType === 'Basement' && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-1.5">
                <Label>Basement Type</Label>
                <Select value={data.basementType || ''} onValueChange={(v) => onChange({ basementType: v as TMBuildingInfo['basementType'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Walkout">Walkout</SelectItem>
                    <SelectItem value="Garden Level">Garden Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Finish</Label>
                <Select value={data.basementFinish || ''} onValueChange={(v) => onChange({ basementFinish: v as TMBuildingInfo['basementFinish'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finished">Finished</SelectItem>
                    <SelectItem value="Unfinished">Unfinished</SelectItem>
                    <SelectItem value="Partially Finished">Partially Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Garage */}
          <div className="space-y-1.5">
            <Label>Garage</Label>
            <RadioGroup
              value={data.garageType}
              onValueChange={(v) => onChange({ garageType: v as TMBuildingInfo['garageType'] })}
              className="flex gap-4"
            >
              {(['Attached', 'Detached', 'None'] as const).map((g) => (
                <div key={g} className="flex items-center gap-2">
                  <RadioGroupItem value={g} id={`gar-${g}`} />
                  <Label htmlFor={`gar-${g}`} className="cursor-pointer">{g}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Siding */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={data.sidingIncluded}
                onCheckedChange={(v) => onChange({ sidingIncluded: v, sidingMaterials: v ? data.sidingMaterials : [] })}
              />
              <Label>Siding Included</Label>
            </div>

            {data.sidingIncluded && (
              <div className="flex flex-wrap gap-2 pl-4">
                {SIDING_MATERIALS.map((mat) => (
                  <Badge
                    key={mat}
                    variant={data.sidingMaterials.includes(mat) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSidingMaterial(mat)}
                  >
                    {mat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
