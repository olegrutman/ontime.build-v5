import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ProjectWizardData, 
  PROJECT_TYPE_LABELS, 
  BUILD_TYPE_LABELS,
  ProjectType,
  BuildType 
} from '@/types/project';

interface BasicsStepProps {
  data: ProjectWizardData;
  onChange: (data: Partial<ProjectWizardData>) => void;
}

export function BasicsStep({ data, onChange }: BasicsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Basics</h2>
        <p className="text-sm text-muted-foreground">
          Enter the basic information about your project.
        </p>
      </div>

      <div className="space-y-4">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Smith Residence"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <Label htmlFor="project_type">Project Type *</Label>
          <Select
            value={data.project_type}
            onValueChange={(value: ProjectType) => onChange({ project_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Build Type */}
        <div className="space-y-2">
          <Label htmlFor="build_type">Build Type *</Label>
          <Select
            value={data.build_type}
            onValueChange={(value: BuildType) => onChange({ build_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select build type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(BUILD_TYPE_LABELS) as BuildType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {BUILD_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <Label>Project Address *</Label>
          <div className="grid gap-4">
            <Input
              placeholder="Street Address"
              value={data.address?.street || ''}
              onChange={(e) => onChange({ address: { ...data.address, street: e.target.value } })}
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="City"
                value={data.address?.city || ''}
                onChange={(e) => onChange({ address: { ...data.address, city: e.target.value } })}
              />
              <Input
                placeholder="State"
                value={data.address?.state || ''}
                onChange={(e) => onChange({ address: { ...data.address, state: e.target.value } })}
              />
              <Input
                placeholder="ZIP"
                value={data.address?.zip || ''}
                onChange={(e) => onChange({ address: { ...data.address, zip: e.target.value } })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
