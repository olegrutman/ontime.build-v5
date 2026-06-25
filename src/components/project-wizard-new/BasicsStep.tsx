import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Building2, Shield } from 'lucide-react';
import { ProjectBasics, US_STATES, TeamMember } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';

interface BasicsStepProps {
  data: ProjectBasics;
  onChange: (updates: Partial<ProjectBasics>) => void;
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
  creatorOrgName?: string;
  creatorRole?: string | null;
  creatorOrgType?: OrgType | null;
}

export function BasicsStepNew({ data, onChange, team, onTeamChange, creatorOrgName, creatorRole, creatorOrgType }: BasicsStepProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const removeMember = (id: string) => {
    onTeamChange(team.filter(m => m.id !== id));
  };

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

      {/* Team Members Section */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Project Team</h3>
            <p className="text-sm text-muted-foreground">
              Add contractors and crew to invite to this project.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Members list */}
        {team.length > 0 ? (
          <div className="space-y-2">
            {team.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{member.companyName}</p>
                    <p className="text-xs text-muted-foreground">{member.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  {member.trade && (
                    <Badge variant="outline">
                      {member.trade === 'Other' ? member.tradeCustom : member.trade}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember(member.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members added yet. You can add them now or after creating the project.
          </p>
        )}
      </div>

      <AddTeamMemberDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        creatorOrgType={creatorOrgType || null}
        onMemberAdded={() => {}}
        mode="collect"
        onCollect={(member) => {
          onTeamChange([...team, member]);
        }}
      />
    </div>
  );
}
