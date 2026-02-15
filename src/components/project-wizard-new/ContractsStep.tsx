import { useEffect, useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ProjectContract } from '@/types/projectWizard';
import { DollarSign, ArrowUp, ArrowDown, Building2, AlertCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

  // Memoize derived values to prevent unnecessary re-renders
  // Upstream: TC's contract WITH the GC (TC receives money from GC)
  const upstreamGC = useMemo(() => {
    if (creatorRole !== 'Trade Contractor') return null;
    return teamMembers.find(m => m.role === 'General Contractor') || null;
  }, [teamMembers, creatorRole]);

  // Downstream: Contracts with parties below the creator
  // GC → TC contracts
  // TC → FC contracts
  const downstreamMembers = useMemo(() => {
    // Exclude Suppliers entirely — their estimate price comes from approved supplier estimates, not manual entry
    const base = teamMembers.filter(m => {
      if (creatorRole === 'General Contractor') {
        return m.role === 'Trade Contractor';
      }
      if (creatorRole === 'Trade Contractor') {
        return m.role === 'Field Crew';
      }
      return false;
    });

    return base;
  }, [teamMembers, creatorRole]);

  // Get IDs for dependency tracking
  const upstreamGCId = upstreamGC?.id || null;
  const downstreamMemberIds = useMemo(() => downstreamMembers.map(m => m.id).join(','), [downstreamMembers]);

  // Pre-populate contracts for all applicable team members when team changes
  // Use a ref to track contracts to avoid stale closure issues
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

    // Check if we have all needed contracts using current contracts prop
    const existingContractIds = new Set(contracts.map(c => c.toTeamMemberId));
    const missingMemberIds = memberIdsNeedingContracts.filter(
      memberId => !existingContractIds.has(memberId)
    );
    
    // Create default contracts for missing members
    if (missingMemberIds.length > 0) {
      console.log('Creating contracts for missing members:', missingMemberIds);
      const newContracts: ProjectContract[] = missingMemberIds.map(memberId => {
        // Find the team member to determine if it's a TC contract (needs material responsibility)
        const member = [...downstreamMembers, upstreamGC].find(m => m?.id === memberId);
        const isTCContract = member?.role === 'Trade Contractor';
        return {
          toTeamMemberId: memberId,
          contractSum: 0,
          retainagePercent: 0,
          allowMobilization: false,
          // Default to TC for material responsibility on TC contracts
          materialResponsibility: isTCContract ? 'TC' as const : undefined,
        };
      });
      // Merge with existing, ensuring no duplicates
      const merged = [...contracts, ...newContracts];
      onChange(merged);
    }
  // Include contracts in deps but use length to avoid infinite loops
  // The Set comparison above handles the actual check
  }, [loading, teamMembers.length, upstreamGCId, downstreamMemberIds, contracts.length, onChange]);

  const getContract = (memberId: string, isTCContract: boolean = false): ProjectContract => {
    return contracts.find(c => c.toTeamMemberId === memberId) || {
      toTeamMemberId: memberId,
      contractSum: 0,
      retainagePercent: 0,
      allowMobilization: false,
      materialResponsibility: isTCContract ? 'TC' : undefined,
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
                    ? 'Add a Trade Contractor or Supplier on the Project Team step first.'
                    : 'Add a General Contractor on the Project Team step first (required). Add Field Crew or Suppliers on the Project Team step (optional).'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Separate TC members for material responsibility section (GC only)
  const tcMembers = teamMembers.filter(m => m.role === 'Trade Contractor');
  const showMaterialSection = creatorRole === 'General Contractor' && tcMembers.length > 0;

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

      {/* Material Responsibility section - GC only, when TCs exist */}
      {showMaterialSection && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Material Responsibility</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Who provides and pays for materials on each trade contract?
          </p>
          {tcMembers.map((member) => {
            const contract = getContract(member.id, true);
            const tradeName = member.trade === 'Other' ? member.trade_custom : member.trade;
            return (
              <Card key={member.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {member.invited_org_name || 'Unknown Company'}
                    {tradeName && <span className="text-muted-foreground font-normal">({tradeName})</span>}
                  </div>
                  <ToggleGroup
                    type="single"
                    value={contract.materialResponsibility || 'TC'}
                    onValueChange={(value) => {
                      if (value) updateContract(member.id, { materialResponsibility: value as 'GC' | 'TC' });
                    }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="GC" aria-label="GC provides materials" className="px-4">
                      GC
                    </ToggleGroupItem>
                    <ToggleGroupItem value="TC" aria-label="TC provides materials" className="px-4">
                      TC
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-primary/80 bg-primary/5 rounded-md px-3 py-2">
                    {(contract.materialResponsibility || 'TC') === 'GC'
                      ? 'GC will manage material ordering and see supplier pricing for this contract.'
                      : 'TC will manage material ordering and see supplier pricing for this contract.'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Separator between material responsibility and contracts */}
      {showMaterialSection && (upstreamGC || downstreamMembers.length > 0) && (
        <Separator className="my-6" />
      )}

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

      {/* Downstream contracts */}
      {downstreamMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowDown className="h-4 w-4" />
            <span>
              {creatorRole === 'Trade Contractor' 
                ? 'Contracts with Field Crew and Suppliers' 
                : 'Contracts with Trade Contractors and Suppliers'}
            </span>
          </div>
          {downstreamMembers.map((member) => (
            <ContractCard
              key={member.id}
              member={member}
              contract={getContract(member.id, member.role === 'Trade Contractor')}
              onUpdate={(updates) => updateContract(member.id, updates)}
              isSupplier={member.role === 'Supplier'}
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
  isSupplier?: boolean;
}

function ContractCard({ member, contract, onUpdate, description, isSupplier }: ContractCardProps) {
  const tradeName = member.trade === 'Other' ? member.trade_custom : member.trade;
  const sumLabel = isSupplier ? 'Estimate Price' : 'Contract Sum';
  const sumHint = isSupplier ? 'Enter the estimate price' : 'Enter the contract sum';
  
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
            <Label>{sumLabel}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="100"
                className={cn("pl-7", contract.contractSum === 0 && "border-amber-400 focus-visible:ring-amber-400")}
                value={contract.contractSum || ''}
                onChange={(e) => onUpdate({ contractSum: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            {contract.contractSum === 0 && (
              <p className="text-xs text-amber-600">{sumHint}</p>
            )}
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
