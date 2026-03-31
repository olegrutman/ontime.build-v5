import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DT } from '@/lib/design-tokens';
import { ChevronRight, DollarSign, FileCheck } from 'lucide-react';

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  org_id: string | null;
  status: string;
}

interface PhaseContractsProps {
  projectId: string;
  onComplete: () => void;
  onStepChange?: (step: string) => void;
}

export function PhaseContracts({ projectId, onComplete, onStepChange }: PhaseContractsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const currentUserOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : null;

  const { data: project } = useQuery({
    queryKey: ['project_creator', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects').select('created_by, organization_id').eq('id', projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: creatorOrg } = useQuery({
    queryKey: ['creator_org_type', project?.organization_id],
    enabled: !!project?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations').select('type').eq('id', project!.organization_id).single();
      if (error) throw error;
      return data;
    },
  });

  const creatorRole = useMemo(() => {
    if (!creatorOrg) return null;
    if (creatorOrg.type === 'GC') return 'General Contractor';
    if (creatorOrg.type === 'TC') return 'Trade Contractor';
    return null;
  }, [creatorOrg]);

  const { data: team = [] } = useQuery({
    queryKey: ['project_team_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team').select('id, role, invited_org_name, org_id, status').eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const { data: existingContracts = [] } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts').select('*').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredTeam = useMemo(() => {
    if (!creatorRole) return [];
    if (creatorRole === 'General Contractor') return team.filter(m => m.role === 'Trade Contractor');
    if (creatorRole === 'Trade Contractor') return team.filter(m => m.role === 'General Contractor' || m.role === 'Field Crew');
    return [];
  }, [team, creatorRole]);

  const [contracts, setContracts] = useState<Record<string, string>>({});
  const [retainages, setRetainages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingContracts.length === 0 || team.length === 0) return;
    const initC: Record<string, string> = {};
    const initR: Record<string, string> = {};
    for (const c of existingContracts) {
      let teamMemberId = c.to_project_team_id;
      if (!teamMemberId) {
        const counterpartyOrgId = c.from_org_id === project?.organization_id ? c.to_org_id : c.from_org_id;
        const match = team.find(m => m.org_id === counterpartyOrgId);
        teamMemberId = match?.id ?? null;
      }
      if (teamMemberId) {
        if (c.contract_sum != null) initC[teamMemberId] = String(c.contract_sum);
        if (c.retainage_percent != null) initR[teamMemberId] = String(c.retainage_percent);
      }
    }
    if (Object.keys(initC).length > 0) setContracts(initC);
    if (Object.keys(initR).length > 0) setRetainages(initR);
  }, [existingContracts, team, project]);

  useEffect(() => {
    onStepChange?.('upstream');
  }, []);

  const isFromCreatorOrg = project?.organization_id === currentUserOrgId;

  const handleSave = async () => {
    if (!projectId || !user || !creatorRole || !project) return;
    setSaving(true);
    try {
      for (const member of filteredTeam) {
        const valueStr = contracts[member.id];
        if (!valueStr) continue;
        const contractSum = parseFloat(valueStr);
        if (isNaN(contractSum)) continue;
        const retainagePercent = parseFloat(retainages[member.id] || '0') || 0;

        let fromOrgId: string | null = null;
        let toOrgId: string | null = null;
        let fromRole = '';
        let toRole = '';

        if (creatorRole === 'General Contractor' && member.role === 'Trade Contractor') {
          fromOrgId = member.org_id; toOrgId = project.organization_id;
          fromRole = 'Trade Contractor'; toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'General Contractor') {
          fromOrgId = project.organization_id; toOrgId = member.org_id;
          fromRole = 'Trade Contractor'; toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'Field Crew') {
          fromOrgId = member.org_id; toOrgId = project.organization_id;
          fromRole = 'Field Crew'; toRole = 'Trade Contractor';
        }

        const existing = existingContracts.find(c => {
          if (c.to_project_team_id === member.id) return true;
          const counterpartyOrgId = c.from_org_id === project?.organization_id ? c.to_org_id : c.from_org_id;
          return counterpartyOrgId === member.org_id;
        });

        if (existing) {
          await supabase.from('project_contracts')
            .update({ contract_sum: contractSum, retainage_percent: retainagePercent, to_project_team_id: member.id })
            .eq('id', existing.id);
        } else {
          await supabase.from('project_contracts').insert({
            project_id: projectId,
            to_project_team_id: member.id,
            from_org_id: fromOrgId, to_org_id: toOrgId,
            from_role: fromRole, to_role: toRole,
            trade: member.role,
            contract_sum: contractSum,
            retainage_percent: retainagePercent,
            created_by_user_id: user.id,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ['project_contracts'] });
      qc.invalidateQueries({ queryKey: ['project_financials'] });
      toast({ title: 'Contracts saved' });
      onComplete();
    } catch (err: any) {
      toast({ title: 'Error saving contracts', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasAtLeastOneContract = filteredTeam.some(m => {
    const v = contracts[m.id];
    return v && parseFloat(v) > 0;
  });

  return (
    <div className="space-y-6 max-w-[680px] mx-auto">
      <div>
        <h2 className="text-lg font-bold font-heading" style={DT.heading}>Contract Setup</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Enter contract sums and retainage for each party.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Contract Amounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredTeam.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No team members found. Add team members from the project overview first.
            </p>
          )}
          {filteredTeam.map(m => (
            <div key={m.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.invited_org_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              <div className="w-40">
                <Label className="sr-only">Contract amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" placeholder="0.00"
                    value={contracts[m.id] ?? ''}
                    onChange={e => setContracts(p => ({ ...p, [m.id]: e.target.value }))}
                    className="pl-7"
                    disabled={!isFromCreatorOrg && m.role === 'General Contractor'}
                  />
                </div>
              </div>
              <div className="w-24">
                <Label className="sr-only">Retainage %</Label>
                <div className="relative">
                  <Input
                    type="number" placeholder="0" step="0.5" min="0" max="100"
                    value={retainages[m.id] ?? ''}
                    onChange={e => setRetainages(p => ({ ...p, [m.id]: e.target.value }))}
                    className="pr-7"
                    disabled={!isFromCreatorOrg && m.role === 'General Contractor'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving || !hasAtLeastOneContract} className="min-h-[44px]">
          {saving ? 'Saving…' : 'Save Contracts & Continue'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
