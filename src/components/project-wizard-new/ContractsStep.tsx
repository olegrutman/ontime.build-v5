import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TeamMember, ProjectContract } from '@/types/projectWizard';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

interface ContractsStepProps {
  team: TeamMember[];
  contracts: ProjectContract[];
  onChange: (contracts: ProjectContract[]) => void;
  creatorRole: string | null;
}

export function ContractsStep({ team, contracts, onChange, creatorRole }: ContractsStepProps) {
  // Upstream: TC's contract WITH the GC (TC receives money from GC)
  const upstreamGC = creatorRole === 'Trade Contractor' 
    ? team.find(m => m.role === 'General Contractor')
    : null;

  // Downstream: Contracts TC has with FC (TC pays FC)
  const downstreamMembers = team.filter(m => {
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

  const hasNoContracts = !upstreamGC && downstreamMembers.length === 0;

  if (hasNoContracts) {
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
              : 'Add a General Contractor or Field Crew members in the Team step to define contracts.'}
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
          {creatorRole === 'Trade Contractor'
            ? 'Enter your contract terms with the General Contractor and your agreements with each Field Crew.'
            : 'Enter the contract terms you negotiated with each Trade Contractor.'}
        </p>
      </div>

      {/* TC's upstream contract with GC */}
      {upstreamGC && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowUp className="h-4 w-4" />
            <span>Your Contract with General Contractor</span>
          </div>
          <ContractCard
            member={upstreamGC}
            contract={getContract(upstreamGC.id)}
            onUpdate={(updates) => updateContract(upstreamGC.id, updates)}
            description="The terms of your agreement with the GC for this project"
          />
        </div>
      )}

      {/* Separator if both sections exist */}
      {upstreamGC && downstreamMembers.length > 0 && (
        <Separator className="my-6" />
      )}

      {/* Downstream contracts with FC (or TC if GC) */}
      {downstreamMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
            <span>
              {creatorRole === 'Trade Contractor' 
                ? 'Contracts with Field Crew' 
                : 'Contracts with Trade Contractors'}
            </span>
          </div>
          {downstreamMembers.map((member) => (
            <ContractCard
              key={member.id}
              member={member}
              contract={getContract(member.id)}
              onUpdate={(updates) => updateContract(member.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ContractCardProps {
  member: TeamMember;
  contract: ProjectContract;
  onUpdate: (updates: Partial<ProjectContract>) => void;
  description?: string;
}

function ContractCard({ member, contract, onUpdate, description }: ContractCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {member.companyName}
          {member.trade && <span className="text-muted-foreground font-normal">({member.trade})</span>}
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
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
                onChange={(e) => onUpdate({ contractSum: parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => onUpdate({ retainagePercent: parseFloat(e.target.value) || 0 })}
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
            onCheckedChange={(checked) => onUpdate({ allowMobilization: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Additional contract notes..."
            value={contract.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
