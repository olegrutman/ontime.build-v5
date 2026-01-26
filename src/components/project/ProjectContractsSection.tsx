import { useState, useEffect } from 'react';
import { FileText, DollarSign, ClipboardList, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
}

interface TeamMember {
  id: string;
  status: string;
  invited_org_name: string | null;
}

interface ProjectContractsSectionProps {
  projectId: string;
}

const ROLE_LABELS: Record<string, string> = {
  'GC': 'General Contractor',
  'TC': 'Trade Contractor',
  'FC': 'Field Crew',
  'SUPPLIER': 'Supplier',
  'General Contractor': 'General Contractor',
  'Trade Contractor': 'Trade Contractor',
  'Field Crew': 'Field Crew',
  'Supplier': 'Supplier',
};

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getContractDescription(fromRole: string, toRole: string, trade: string | null): string {
  const fromLabel = ROLE_LABELS[fromRole] || fromRole;
  const toLabel = ROLE_LABELS[toRole] || toRole;
  
  if (trade) {
    return `${fromLabel} Contract with ${toLabel} (${trade})`;
  }
  return `${fromLabel} Contract with ${toLabel}`;
}

export function ProjectContractsSection({ projectId }: ProjectContractsSectionProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [contractsResult, teamResult] = await Promise.all([
        supabase
          .from('project_contracts')
          .select('*')
          .eq('project_id', projectId),
        supabase
          .from('project_team')
          .select('id, status, invited_org_name')
          .eq('project_id', projectId),
      ]);

      if (contractsResult.error) {
        console.error('Error fetching contracts:', contractsResult.error);
      } else {
        setContracts(contractsResult.data || []);
      }

      if (teamResult.error) {
        console.error('Error fetching team:', teamResult.error);
      } else {
        setTeamMembers(teamResult.data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId]);

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
                      {getContractDescription(contract.from_role, contract.to_role, contract.trade)}
                    </h4>
                    {relatedMember?.invited_org_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {relatedMember.invited_org_name}
                      </p>
                    )}
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
                      <p className="text-sm font-medium">{contract.retainage_percent || 0}%</p>
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
