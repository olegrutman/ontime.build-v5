import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Building2, User, Mail, Shield } from 'lucide-react';
import { ProjectBasics, US_STATES, TeamMember, TEAM_ROLES, TRADES, TeamRole, Trade } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    role: '' as TeamRole | '',
    trade: '' as Trade | '',
    tradeCustom: '',
  });

  // Determine which roles can be invited based on creator org type
  const availableRoles: TeamRole[] = (() => {
    if (creatorOrgType === 'GC') return ['Trade Contractor', 'Field Crew', 'Supplier'];
    if (creatorOrgType === 'TC') return ['General Contractor', 'Field Crew', 'Supplier'];
    return ['General Contractor', 'Trade Contractor', 'Field Crew', 'Supplier'];
  })();

  const needsTrade = newMember.role === 'Trade Contractor' || newMember.role === 'Field Crew';

  const addMember = () => {
    if (!newMember.companyName || !newMember.contactEmail || !newMember.role) return;
    const member: TeamMember = {
      id: crypto.randomUUID(),
      companyName: newMember.companyName,
      contactName: newMember.contactName,
      contactEmail: newMember.contactEmail,
      role: newMember.role as TeamRole,
      trade: needsTrade ? (newMember.trade as Trade) || undefined : undefined,
      tradeCustom: needsTrade && newMember.trade === 'Other' ? newMember.tradeCustom : undefined,
    };
    onTeamChange([...team, member]);
    setNewMember({ companyName: '', contactName: '', contactEmail: '', role: '', trade: '', tradeCustom: '' });
    setShowAddForm(false);
  };

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
          {!showAddForm && (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>

        {/* Add member form */}
        {showAddForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company Name *</Label>
                  <Input
                    placeholder="Company name"
                    value={newMember.companyName}
                    onChange={(e) => setNewMember(p => ({ ...p, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role *</Label>
                  <Select
                    value={newMember.role}
                    onValueChange={(v) => setNewMember(p => ({ ...p, role: v as TeamRole, trade: '', tradeCustom: '' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Name</Label>
                  <Input
                    placeholder="Contact name"
                    value={newMember.contactName}
                    onChange={(e) => setNewMember(p => ({ ...p, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={newMember.contactEmail}
                    onChange={(e) => setNewMember(p => ({ ...p, contactEmail: e.target.value }))}
                  />
                </div>
              </div>
              {needsTrade && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Trade</Label>
                    <Select
                      value={newMember.trade}
                      onValueChange={(v) => setNewMember(p => ({ ...p, trade: v as Trade }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                      <SelectContent>
                        {TRADES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newMember.trade === 'Other' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Custom Trade</Label>
                      <Input
                        placeholder="Enter trade"
                        value={newMember.tradeCustom}
                        onChange={(e) => setNewMember(p => ({ ...p, tradeCustom: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={addMember}
                  disabled={!newMember.companyName || !newMember.contactEmail || !newMember.role}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
        ) : !showAddForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No team members added yet. You can add them now or after creating the project.
          </p>
        ) : null}
      </div>
    </div>
  );
}
