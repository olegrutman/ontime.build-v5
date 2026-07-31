import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { ProjectBasics, US_STATES } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';

interface BasicsStepProps {
  data: ProjectBasics;
  onChange: (updates: Partial<ProjectBasics>) => void;
  creatorOrgName?: string;
  creatorRole?: string | null;
  creatorOrgType?: OrgType | null;
}

export function BasicsStepNew({ data, onChange, creatorOrgName, creatorRole }: BasicsStepProps) {


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Basics</h2>
        <p className="text-sm text-muted-foreground">
          Enter the basic information about your project.
        </p>
      </div>

      {/* Project Owner */}
      {creatorOrgName && creatorRole && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Shield className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{creatorOrgName}</p>
            <p className="text-xs text-muted-foreground">Project Owner</p>
          </div>
          <Badge variant="secondary">{creatorRole}</Badge>
        </div>
      )}

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
