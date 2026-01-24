import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectContract } from '@/types/projectWizard';
import { DollarSign, ArrowUp, ArrowDown, Building2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectTeamMember {
  id: string;
  org_id: string | null;
  role: string;
  trade: string | null;
  trade_custom: string | null;
  invited_org_name: string | null;
  status: string;
}

interface ContractsStepProps {
  projectId?: string;
  contracts: ProjectContract[];
  onChange: (contracts: ProjectContract[]) => void;
  creatorRole: string | null;
}

export function ContractsStep({ projectId, contracts, onChange, creatorRole }: ContractsStepProps) {
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch team members from database
  const fetchTeamMembers = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, org_id, role, trade, trade_custom, invited_org_name, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Upstream: TC's contract WITH the GC (TC receives money from GC)
  const upstreamGC = creatorRole === 'Trade Contractor' 
    ? teamMembers.find(m => m.role === 'General Contractor')
    : null;

  // Downstream: Contracts with parties below the creator
  // GC → TC contracts
  // TC → FC contracts
  const downstreamMembers = teamMembers.filter(m => {
    if (creatorRole === 'General Contractor') {
      return m.role === 'Trade Contractor';
    }
    if (creatorRole === 'Trade Contractor') {
      return m.role === 'Field Crew';
    }
    return false;
  });

  // Pre-populate contracts for all applicable team members when team changes
  useEffect(() => {
    if (loading || teamMembers.length === 0) return;

    const memberIdsNeedingContracts: string[] = [];
    
    // Add upstream GC if exists
    if (upstreamGC) {
      memberIdsNeedingContracts.push(upstreamGC.id);
    }
    
    // Add downstream members
    downstreamMembers.forEach(m => {
      memberIdsNeedingContracts.push(m.id);
    });
    
    // Find any members that don't have a contract yet
    const missingContracts = memberIdsNeedingContracts.filter(
      memberId => !contracts.find(c => c.toTeamMemberId === memberId)
    );
    
    // Create default contracts for missing members
    if (missingContracts.length > 0) {
      const newContracts: ProjectContract[] = missingContracts.map(memberId => ({
        toTeamMemberId: memberId,
        contractSum: 0,
        retainagePercent: 0,
        allowMobilization: false,
      }));
      onChange([...contracts, ...newContracts]);
    }
  }, [teamMembers, loading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Project Contracts</h2>
          <p className="text-sm text-muted-foreground">Loading team members...</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // No project ID yet
  if (!projectId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Project Contracts</h2>
          <p className="text-sm text-muted-foreground">
            Complete the Project Basics step first.
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Project must be created before defining contracts.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No team members to contract with</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {creatorRole === 'General Contractor' 
                    ? 'Add Trade Contractors on the Project Team step first to define their contracts.'
                    : 'Add a General Contractor or Field Crew members on the Project Team step to define contracts.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
  member: ProjectTeamMember;
  contract: ProjectContract;
  onUpdate: (updates: Partial<ProjectContract>) => void;
  description?: string;
}

function ContractCard({ member, contract, onUpdate, description }: ContractCardProps) {
  const tradeName = member.trade === 'Other' ? member.trade_custom : member.trade;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {member.invited_org_name || 'Unknown Company'}
          {tradeName && <span className="text-muted-foreground font-normal">({tradeName})</span>}
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
