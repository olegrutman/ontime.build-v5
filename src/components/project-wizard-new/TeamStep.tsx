import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2, User, Mail } from 'lucide-react';
import { TeamMember, TEAM_ROLES, TRADES, TeamRole, Trade } from '@/types/projectWizard';

interface TeamStepProps {
  team: TeamMember[];
  onChange: (team: TeamMember[]) => void;
  creatorRole: string | null;
}

const emptyMember: Omit<TeamMember, 'id'> = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  role: 'Trade Contractor',
};

export function TeamStep({ team, onChange, creatorRole }: TeamStepProps) {
  const [newMember, setNewMember] = useState<Omit<TeamMember, 'id'>>(emptyMember);

  const addMember = () => {
    if (!newMember.companyName || !newMember.contactEmail || !newMember.role) return;
    
    // Validate trade required for TC and Field Crew
    if ((newMember.role === 'Trade Contractor' || newMember.role === 'Field Crew') && !newMember.trade) {
      return;
    }

    const member: TeamMember = {
      ...newMember,
      id: crypto.randomUUID(),
    };
    onChange([...team, member]);
    setNewMember(emptyMember);
  };

  const removeMember = (id: string) => {
    onChange(team.filter(m => m.id !== id));
  };

  const requiresTrade = newMember.role === 'Trade Contractor' || newMember.role === 'Field Crew';

  // Filter available roles based on creator
  const availableRoles = TEAM_ROLES.filter(role => {
    if (creatorRole === 'General Contractor') {
      return role !== 'General Contractor'; // GC can invite TC, FC, Supplier
    }
    if (creatorRole === 'Trade Contractor') {
      return role === 'Field Crew' || role === 'Supplier'; // TC can invite FC, Supplier
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Team</h2>
        <p className="text-sm text-muted-foreground">
          Add team members to invite to this project.
        </p>
      </div>

      {/* Add new member form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">Add Team Member</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                placeholder="ABC Framing LLC"
                value={newMember.companyName}
                onChange={(e) => setNewMember({ ...newMember, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                placeholder="John Smith"
                value={newMember.contactName}
                onChange={(e) => setNewMember({ ...newMember, contactName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Email *</Label>
              <Input
                type="email"
                placeholder="john@abcframing.com"
                value={newMember.contactEmail}
                onChange={(e) => setNewMember({ ...newMember, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={newMember.role}
                onValueChange={(value: TeamRole) => setNewMember({ ...newMember, role: value, trade: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiresTrade && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trade *</Label>
                <Select
                  value={newMember.trade}
                  onValueChange={(value: Trade) => setNewMember({ ...newMember, trade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADES.map((trade) => (
                      <SelectItem key={trade} value={trade}>
                        {trade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newMember.trade === 'Other' && (
                <div className="space-y-2">
                  <Label>Trade Name</Label>
                  <Input
                    placeholder="Custom trade name"
                    value={newMember.tradeCustom || ''}
                    onChange={(e) => setNewMember({ ...newMember, tradeCustom: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={addMember}
            disabled={!newMember.companyName || !newMember.contactEmail || (requiresTrade && !newMember.trade)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Team
          </Button>
        </CardContent>
      </Card>

      {/* Team list */}
      {team.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Team Members ({team.length})</h3>
          {team.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{member.companyName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {member.contactName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {member.contactName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.contactEmail}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{member.role}</Badge>
                  {member.trade && (
                    <Badge variant="outline">{member.trade === 'Other' ? member.tradeCustom : member.trade}</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {team.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No team members added yet. Add team members above or skip this step.
        </p>
      )}
    </div>
  );
}
