import { useState, useEffect } from 'react';
import { FileText, DollarSign, ClipboardList, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

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

function getContractTitle(contract: Contract, currentOrgId: string | undefined): string {
  // Show "Contract with [other party]" - the viewer sees who they're contracting WITH
  const isFromOrg = currentOrgId && contract.from_org_id === currentOrgId;
  const isToOrg = currentOrgId && contract.to_org_id === currentOrgId;
  
  // Determine the "other party" name
  let otherPartyName: string;
  if (isFromOrg) {
    // User is the client/payer, show the contractor they hired
    otherPartyName = contract.to_org_name || contract.to_role;
  } else if (isToOrg) {
    // User is the contractor, show who hired them
    otherPartyName = contract.from_org_name || contract.from_role;
  } else {
    // Fallback: show both parties
    const fromName = contract.from_org_name || contract.from_role;
    const toName = contract.to_org_name || contract.to_role;
    otherPartyName = `${fromName} → ${toName}`;
  }
  
  if (contract.trade) {
    return `Contract with ${otherPartyName} (${contract.trade})`;
  }
  return `Contract with ${otherPartyName}`;
}

export function ProjectContractsSection({ projectId }: ProjectContractsSectionProps) {
  const { userOrgRoles } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user's organization ID
  const currentOrgId = userOrgRoles[0]?.organization?.id;

  useEffect(() => {
    const fetchData = async () => {
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
        // Filter contracts to only show those where user's org is involved
        // This provides UI-level filtering on top of RLS
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
    };

    fetchData();
  }, [projectId, currentOrgId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No contracts have been created for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Contract Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contracts.map((contract) => {
            // Find related team member to check status
            const relatedMember = teamMembers.find(m => m.id === contract.to_project_team_id);
            const isPending = relatedMember?.status === 'Invited';

            return (
              <div
                key={contract.id}
                className="p-4 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-sm">
                      {getContractTitle(contract, currentOrgId)}
                    </h4>
                    {/* Show role as secondary badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {contract.from_role} → {contract.to_role}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={isPending ? 'outline' : 'default'} className={isPending ? 'text-amber-600 border-amber-300' : ''}>
                    {isPending ? 'Pending Acceptance' : 'Active'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-primary/10">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Sum</p>
                      <p className="text-sm font-medium">{formatCurrency(contract.contract_sum)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/20">
                      <ClipboardList className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Work Orders</p>
                      <p className="text-sm font-medium">$0</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/20">
                      <Receipt className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Invoiced</p>
                      <p className="text-sm font-medium">$0</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-muted">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Retainage</p>
                      <p className="text-sm font-medium">
                        {formatCurrency((contract.contract_sum || 0) * ((contract.retainage_percent || 0) / 100))}
                      </p>
                      <p className="text-xs text-muted-foreground">({contract.retainage_percent || 0}%)</p>
                    </div>
                  </div>
                </div>

                {contract.notes && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    {contract.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
