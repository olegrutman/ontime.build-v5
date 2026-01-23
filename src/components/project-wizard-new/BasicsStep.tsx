import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectBasics, PROJECT_TYPES, US_STATES } from '@/types/projectWizard';

interface BasicsStepProps {
  data: ProjectBasics;
  onChange: (updates: Partial<ProjectBasics>) => void;
}

export function BasicsStepNew({ data, onChange }: BasicsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Basics</h2>
        <p className="text-sm text-muted-foreground">
          Enter the basic information about your project.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Smith Residence"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectType">Project Type *</Label>
          <Select
            value={data.projectType}
            onValueChange={(value) => onChange({ projectType: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project type" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Street Address *</Label>
          <Input
            id="address"
            placeholder="123 Main Street"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="City"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Select
              value={data.state}
              onValueChange={(value) => onChange({ state: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP *</Label>
            <Input
              id="zip"
              placeholder="ZIP"
              value={data.zip}
              onChange={(e) => onChange({ zip: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date (Optional)</Label>
          <Input
            id="startDate"
            type="date"
            value={data.startDate || ''}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
