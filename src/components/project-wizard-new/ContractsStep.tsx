import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { TeamMember, ProjectContract } from '@/types/projectWizard';
import { DollarSign } from 'lucide-react';

interface ContractsStepProps {
  team: TeamMember[];
  contracts: ProjectContract[];
  onChange: (contracts: ProjectContract[]) => void;
  creatorRole: string | null;
}

export function ContractsStep({ team, contracts, onChange, creatorRole }: ContractsStepProps) {
  // Filter team members that can have contracts
  const contractableMembers = team.filter(m => {
    if (creatorRole === 'General Contractor') {
      return m.role === 'Trade Contractor';
    }
    if (creatorRole === 'Trade Contractor') {
      return m.role === 'Field Crew';
    }
    return false;
  });

  const getContract = (memberId: string): ProjectContract => {
    return contracts.find(c => c.toTeamMemberId === memberId) || {
      toTeamMemberId: memberId,
      contractSum: 0,
      retainagePercent: 0,
      allowMobilization: false,
    };
  };

  const updateContract = (memberId: string, updates: Partial<ProjectContract>) => {
    const existing = contracts.find(c => c.toTeamMemberId === memberId);
    if (existing) {
      onChange(contracts.map(c => c.toTeamMemberId === memberId ? { ...c, ...updates } : c));
    } else {
      onChange([...contracts, { ...getContract(memberId), ...updates }]);
    }
  };

  if (contractableMembers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Project Contracts</h2>
          <p className="text-sm text-muted-foreground">
            Define contract terms for your team members.
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>No team members added that require contract terms.</p>
          <p className="text-sm mt-2">
            {creatorRole === 'General Contractor' 
              ? 'Add Trade Contractors in the Team step to define their contracts.'
              : 'Add Field Crew members in the Team step to define their contracts.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Contracts</h2>
        <p className="text-sm text-muted-foreground">
          {creatorRole === 'General Contractor'
            ? 'Enter the contract terms you negotiated with each Trade Contractor.'
            : 'Enter the contract terms for each Field Crew member.'}
        </p>
      </div>

      {contractableMembers.map((member) => {
        const contract = getContract(member.id);
        return (
          <Card key={member.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {member.companyName}
                {member.trade && <span className="text-muted-foreground font-normal">({member.trade})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Sum</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      className="pl-7"
                      value={contract.contractSum || ''}
                      onChange={(e) => updateContract(member.id, { contractSum: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Retainage %</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      className="pr-7"
                      value={contract.retainagePercent || ''}
                      onChange={(e) => updateContract(member.id, { retainagePercent: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Allow Mobilization as a line item?</Label>
                <Switch
                  checked={contract.allowMobilization}
                  onCheckedChange={(checked) => updateContract(member.id, { allowMobilization: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional contract notes..."
                  value={contract.notes || ''}
                  onChange={(e) => updateContract(member.id, { notes: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
