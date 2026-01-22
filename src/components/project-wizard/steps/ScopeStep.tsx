import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ProjectWizardData, 
  FOUNDATION_LABELS, 
  FRAMING_METHOD_LABELS,
  DEFAULT_AREAS,
  ProjectScope 
} from '@/types/project';

interface ScopeStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

export function ScopeStep({ data, onChange }: ScopeStepProps) {
  const [customArea, setCustomArea] = useState('');

  const updateScope = (updates: Partial<ProjectScope>) => {
    onChange({ scope: { ...data.scope, ...updates } });
  };

  const toggleArea = (area: string) => {
    const currentAreas = data.scope.areas || [];
    if (currentAreas.includes(area)) {
      updateScope({ areas: currentAreas.filter((a) => a !== area) });
    } else {
      updateScope({ areas: [...currentAreas, area] });
    }
  };

  const addCustomArea = () => {
    if (!customArea.trim()) return;
    const currentCustom = data.scope.custom_areas || [];
    if (!currentCustom.includes(customArea.trim())) {
      updateScope({ custom_areas: [...currentCustom, customArea.trim()] });
    }
    setCustomArea('');
  };

  const removeCustomArea = (area: string) => {
    updateScope({ 
      custom_areas: (data.scope.custom_areas || []).filter((a) => a !== area) 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Scope</h2>
        <p className="text-sm text-muted-foreground">
          Define the scope of work for this project.
        </p>
      </div>

      {/* Basic Scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Structure Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="floors">Number of Floors</Label>
              <Input
                id="floors"
                type="number"
                min={1}
                max={10}
                value={data.scope.floors || 1}
                onChange={(e) => updateScope({ floors: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundation">Foundation Type</Label>
              <Select
                value={data.scope.foundation || 'slab'}
                onValueChange={(value: ProjectScope['foundation']) => 
                  updateScope({ foundation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select foundation" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOUNDATION_LABELS) as ProjectScope['foundation'][]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {FOUNDATION_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="framing">Framing Method</Label>
              <Select
                value={data.scope.framing_method || 'stick'}
                onValueChange={(value: ProjectScope['framing_method']) => 
                  updateScope({ framing_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FRAMING_METHOD_LABELS) as ProjectScope['framing_method'][]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {FRAMING_METHOD_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="has_stairs"
                checked={data.scope.has_stairs || false}
                onCheckedChange={(checked) => updateScope({ has_stairs: checked })}
              />
              <Label htmlFor="has_stairs">Has Stairs</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="has_elevator"
                checked={data.scope.has_elevator || false}
                onCheckedChange={(checked) => updateScope({ has_elevator: checked })}
              />
              <Label htmlFor="has_elevator">Has Elevator</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_AREAS.map((area) => (
              <Badge
                key={area}
                variant={(data.scope.areas || []).includes(area) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleArea(area)}
              >
                {area}
              </Badge>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Custom Areas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom area"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomArea()}
              />
              <Button onClick={addCustomArea} disabled={!customArea.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(data.scope.custom_areas || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.scope.custom_areas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1">
                    {area}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeCustomArea(area)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mobilization">Mobilization</Label>
              <p className="text-sm text-muted-foreground">Include mobilization as SOV line item</p>
            </div>
            <Switch
              id="mobilization"
              checked={data.mobilization_enabled}
              onCheckedChange={(checked) => onChange({ mobilization_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retainage">Retainage (%)</Label>
            <Input
              id="retainage"
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={data.retainage_percent}
              onChange={(e) => onChange({ retainage_percent: parseFloat(e.target.value) || 0 })}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
