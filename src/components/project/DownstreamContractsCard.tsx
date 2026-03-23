import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Save, Loader2, Check } from 'lucide-react';

interface FCTeamMember {
  id: string;
  org_id: string;
  invited_org_name: string | null;
}

interface Props {
  projectId: string;
  tcOrgId: string;
}

export function DownstreamContractsCard({ projectId, tcOrgId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  // Fetch FC team members
  const { data: fcMembers = [] } = useQuery({
    queryKey: ['project_fc_team', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, org_id, invited_org_name, role, status')
        .eq('project_id', projectId)
        .eq('role', 'Field Crew');
      if (error) throw error;
      // Deduplicate by org_id
      const unique = new Map<string, FCTeamMember>();
      for (const m of data ?? []) {
        if (m.org_id && !unique.has(m.org_id)) {
          unique.set(m.org_id, { id: m.id, org_id: m.org_id, invited_org_name: m.invited_org_name });
        }
      }
      return Array.from(unique.values());
    },
  });

  // Fetch existing FC contracts
  const { data: fcContracts = [] } = useQuery({
    queryKey: ['project_fc_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', projectId)
        .eq('from_role', 'Field Crew')
        .eq('to_role', 'Trade Contractor');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (fcContracts.length > 0) {
      const init: Record<string, string> = {};
      for (const c of fcContracts) {
        if (c.from_org_id && c.contract_sum != null) {
          init[c.from_org_id] = String(c.contract_sum);
        }
      }
      if (Object.keys(init).length > 0) setValues(init);
    }
  }, [fcContracts]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const member of fcMembers) {
        const valStr = values[member.org_id];
        if (!valStr) continue;
        const contractSum = parseFloat(valStr);
        if (isNaN(contractSum)) continue;

        const existing = fcContracts.find(c => c.from_org_id === member.org_id);
        if (existing) {
          await supabase.from('project_contracts').update({ contract_sum: contractSum }).eq('id', existing.id);
        } else {
          await supabase.from('project_contracts').insert({
            project_id: projectId,
            from_org_id: member.org_id,
            to_org_id: tcOrgId,
            from_role: 'Field Crew',
            to_role: 'Trade Contractor',
            contract_sum: contractSum,
            created_by_user_id: user.id,
            to_project_team_id: member.id,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ['project_fc_contracts', projectId] });
      qc.invalidateQueries({ queryKey: ['project_contracts'] });
      qc.invalidateQueries({ queryKey: ['project_financials', projectId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: '✓ FC contracts saved successfully' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (fcMembers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Downstream Contracts (FC)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fcMembers.map(m => (
          <div key={m.org_id} className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.invited_org_name || 'Field Crew'}</p>
              <p className="text-xs text-muted-foreground">Field Crew</p>
            </div>
            <div className="w-40">
              <Label className="sr-only">Contract amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={values[m.org_id] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [m.org_id]: e.target.value }))}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
