import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, DollarSign, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useScopeSelections, useScopeSections, useScopeItems } from '@/hooks/useScopeWizard';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';

interface TeamMember {
  id: string;
  role: string;
  invited_org_name: string | null;
  org_id: string | null;
  status: string;
}

export default function ProjectContractsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile } = useProjectProfile(projectId);
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: selections = [] } = useScopeSelections(projectId);
  const { data: allSections = [] } = useScopeSections();
  const { data: allItems = [] } = useScopeItems();

  const projectType = useMemo(
    () => projectTypes.find(t => t.id === profile?.project_type_id),
    [projectTypes, profile],
  );

  // Fetch team
  const { data: team = [] } = useQuery({
    queryKey: ['project_team_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, role, invited_org_name, org_id, status')
        .eq('project_id', projectId!);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  // Fetch existing contracts
  const { data: existingContracts = [] } = useQuery({
    queryKey: ['project_contracts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [contracts, setContracts] = useState<Record<string, string>>({});

  // Initialize from existing
  useMemo(() => {
    if (existingContracts.length > 0 && Object.keys(contracts).length === 0) {
      const init: Record<string, string> = {};
      for (const c of existingContracts) {
        const memberId = (c as any).party_org_id || (c as any).id;
        if ((c as any).contract_amount != null) {
          init[memberId] = String((c as any).contract_amount);
        }
      }
      if (Object.keys(init).length > 0) setContracts(init);
    }
  }, [existingContracts]);

  const onCount = selections.filter(s => s.is_on).length;

  const itemsBySectionId = useMemo(() => {
    const onIds = new Set(selections.filter(s => s.is_on).map(s => s.scope_item_id));
    const map: Record<string, string[]> = {};
    for (const item of allItems) {
      if (onIds.has(item.id)) {
        if (!map[item.section_id]) map[item.section_id] = [];
        map[item.section_id].push(item.label);
      }
    }
    return map;
  }, [selections, allItems]);

  const activeSections = allSections.filter(s => itemsBySectionId[s.id]?.length);

  const handleSave = async () => {
    toast({ title: 'Contracts saved', description: 'Returning to project...' });
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={`/project/${projectId}/scope-wizard`}>
              <Button variant="ghost" size="icon"><ChevronLeft className="w-4 h-4" /></Button>
            </Link>
            <h1 className="text-lg font-bold font-[Barlow_Condensed]">Contracts</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className="bg-primary/15 text-primary border-0">{projectType?.name}</Badge>
            <span>{onCount} scope items</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Assign contract sums to each party. The scope sections below reflect the items toggled ON in the Scope Wizard.
          </p>
        </div>

        {/* Scope summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" /> Scope Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSections.map(s => (
              <div key={s.id} className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({itemsBySectionId[s.id]?.length} items)
                  </span>
                </div>
              </div>
            ))}
            {activeSections.length === 0 && (
              <p className="text-sm text-muted-foreground">No scope items selected. Go back to the Scope Wizard to toggle items on.</p>
            )}
          </CardContent>
        </Card>

        {/* Team contracts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Contract Amounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.length === 0 && (
              <p className="text-sm text-muted-foreground">No team members found. Add team members in the project wizard first.</p>
            )}
            {team.map(m => (
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
                        type="number"
                        placeholder="0.00"
                        value={contracts[m.id] ?? ''}
                        onChange={e => setContracts(p => ({ ...p, [m.id]: e.target.value }))}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-30">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}/scope-wizard`)}
            className="min-h-[44px]">
            Back to Scope
          </Button>
          <Button onClick={handleSave} className="min-h-[44px]">
            Save Contracts
          </Button>
        </div>
      </div>
    </div>
  );
}
