import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, ClipboardList, Receipt, Settings, ChevronDown, ChevronRight, Package, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/components/auth/RequirePermission';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Contract {
  id: string;
  from_role: string;
  to_role: string;
  trade: string | null;
  contract_sum: number | null;
  retainage_percent: number | null;
  allow_mobilization_line_item: boolean;
  notes: string | null;
  to_project_team_id: string | null;
  from_org_id: string | null;
  to_org_id: string | null;
  from_org_name?: string | null;
  to_org_name?: string | null;
  material_responsibility: string | null;
}

interface TeamMember {
  id: string;
  status: string;
  invited_org_name: string | null;
}

interface ProjectContractsSectionProps {
  projectId: string;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTrade(trade: string | null): string {
  if (trade === 'Work Order') return 'Change Order';
  if (trade === 'Work Order Labor') return 'Change Order Labor';
  return trade || '';
}

function isChangeOrderContract(contract: Contract): boolean {
  return contract.trade === 'Work Order' || contract.trade === 'Work Order Labor';
}

function getContractTitle(contract: Contract, currentOrgId: string | undefined): string {
  const isFromOrg = currentOrgId && contract.from_org_id === currentOrgId;
  const isToOrg = currentOrgId && contract.to_org_id === currentOrgId;
  
  let otherPartyName: string;
  if (isFromOrg) {
    otherPartyName = contract.to_org_name || contract.to_role;
  } else if (isToOrg) {
    otherPartyName = contract.from_org_name || contract.from_role;
  } else {
    const fromName = contract.from_org_name || contract.from_role;
    const toName = contract.to_org_name || contract.to_role;
    otherPartyName = `${fromName} → ${toName}`;
  }
  
  return otherPartyName;
}

interface ContractRowProps {
  contract: Contract;
  currentOrgId: string | undefined;
  teamMembers: TeamMember[];
  canEdit: boolean;
  onContractUpdated: () => void;
}

function ContractRow({ contract, currentOrgId, teamMembers, canEdit, onContractUpdated }: ContractRowProps) {
  const { toast } = useToast();
  const relatedMember = teamMembers.find(m => m.id === contract.to_project_team_id);
  const isPending = relatedMember?.status === 'Invited';
  const displayTrade = formatTrade(contract.trade);
  const retainageAmount = (contract.contract_sum || 0) * ((contract.retainage_percent || 0) / 100);
  const isTCContract = contract.from_role === 'Trade Contractor' || contract.to_role === 'Trade Contractor';

  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState<string>(contract.material_responsibility || 'TC');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_contracts')
        .update({ material_responsibility: editValue })
        .eq('id', contract.id);
      if (error) throw error;
      toast({ title: 'Material responsibility updated' });
      setEditOpen(false);
      onContractUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {getContractTitle(contract, currentOrgId)}
          </span>
          {displayTrade && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
              {displayTrade}
            </Badge>
          )}
          {isPending && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-300 shrink-0">
              Pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {contract.from_role} → {contract.to_role}
          </p>
          {isTCContract && contract.material_responsibility && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                <Package className="h-3 w-3" />
                Materials: {contract.material_responsibility}
              </Badge>
              {canEdit && (
                <Popover open={editOpen} onOpenChange={setEditOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-xs font-medium">Material Responsibility</p>
                      <ToggleGroup
                        type="single"
                        value={editValue}
                        onValueChange={(v) => { if (v) setEditValue(v); }}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="GC" className="px-4 text-xs">GC</ToggleGroupItem>
                        <ToggleGroupItem value="TC" className="px-4 text-xs">TC</ToggleGroupItem>
                      </ToggleGroup>
                      <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <p className="text-sm font-semibold">{formatCurrency(contract.contract_sum)}</p>
          {contract.retainage_percent ? (
            <p className="text-[10px] text-muted-foreground">
              {contract.retainage_percent}% ret. ({formatCurrency(retainageAmount)})
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectContractsSection({ projectId }: ProjectContractsSectionProps) {
  const { userOrgRoles } = useAuth();
  const canManageContracts = usePermission('canInviteMembers');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isFC = currentOrgType === 'FC';

  const fetchData = useCallback(async () => {
    const [contractsResult, teamResult] = await Promise.all([
      supabase
        .from('project_contracts')
        .select(`
          *,
          from_org:organizations!project_contracts_from_org_id_fkey(name),
          to_org:organizations!project_contracts_to_org_id_fkey(name)
        `)
        .eq('project_id', projectId),
      supabase
        .from('project_team')
        .select('id, status, invited_org_name')
        .eq('project_id', projectId),
    ]);

    if (contractsResult.error) {
      console.error('Error fetching contracts:', contractsResult.error);
    } else {
      const allContracts = (contractsResult.data || []).map((c: any) => ({
        ...c,
        from_org_name: c.from_org?.name || null,
        to_org_name: c.to_org?.name || null,
      })) as Contract[];
      const visibleContracts = currentOrgId 
        ? allContracts.filter(c => 
            c.from_org_id === currentOrgId || c.to_org_id === currentOrgId
          )
        : allContracts;
      setContracts(visibleContracts);
    }

    if (teamResult.error) {
      console.error('Error fetching team:', teamResult.error);
    } else {
      setTeamMembers(teamResult.data || []);
    }

    setLoading(false);
  }, [projectId, currentOrgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mainContracts = contracts.filter(c => !isChangeOrderContract(c));
  const changeOrderContracts = contracts.filter(c => isChangeOrderContract(c));
  const totalContractValue = contracts.reduce((sum, c) => sum + (c.contract_sum || 0), 0);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Contracts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-muted/30 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Contracts</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {contracts.length} contract{contracts.length !== 1 ? 's' : ''} • {formatCurrency(totalContractValue)}
                  </p>
                </div>
              </div>
              {canManageContracts && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-10 text-sm px-3"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/project/${projectId}/edit?step=contracts`}>
                    <Settings className="h-4 w-4 mr-1.5" />
                    Manage
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-4 pt-2">
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contracts created yet.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Main Contracts */}
                {mainContracts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Main Contracts
                    </h4>
                    <div className="bg-muted/30 rounded-lg px-3">
                      {mainContracts.map((contract) => (
                        <ContractRow
                          key={contract.id}
                          contract={contract}
                          currentOrgId={currentOrgId}
                          teamMembers={teamMembers}
                          canEdit={canManageContracts}
                          onContractUpdated={fetchData}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Change Order Contracts */}
                {changeOrderContracts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Change Order Contracts
                    </h4>
                    <div className="bg-muted/30 rounded-lg px-3">
                      {changeOrderContracts.map((contract) => (
                        <ContractRow
                          key={contract.id}
                          contract={contract}
                          currentOrgId={currentOrgId}
                          teamMembers={teamMembers}
                          canEdit={canManageContracts}
                          onContractUpdated={fetchData}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
