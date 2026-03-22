import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, DollarSign, FileCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useScopeSelections, useScopeSections, useScopeItems } from '@/hooks/useScopeWizard';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, userOrgRoles } = useAuth();

  const currentUserOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : null;

  const { data: profile } = useProjectProfile(projectId);
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: selections = [] } = useScopeSelections(projectId);
  const { data: allSections = [] } = useScopeSections();
  const { data: allItems = [] } = useScopeItems();

  const projectType = useMemo(
    () => projectTypes.find(t => t.id === profile?.project_type_id),
    [projectTypes, profile],
  );

  // Fetch project to identify creator
  const { data: project } = useQuery({
    queryKey: ['project_creator', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('created_by, organization_id')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch creator's org type to determine role
  const { data: creatorOrg } = useQuery({
    queryKey: ['creator_org_type', project?.organization_id],
    enabled: !!project?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('type')
        .eq('id', project!.organization_id)
        .single();
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

  // Filter team based on creator role
  const filteredTeam = useMemo(() => {
    if (!creatorRole) return [];
    if (creatorRole === 'General Contractor') {
      return team.filter(m => m.role === 'Trade Contractor');
    }
    if (creatorRole === 'Trade Contractor') {
      return team.filter(m => m.role === 'General Contractor' || m.role === 'Field Crew');
    }
    return [];
  }, [team, creatorRole]);

  const descriptionText = useMemo(() => {
    if (creatorRole === 'General Contractor') {
      return 'Enter the contract sum with your Trade Contractor.';
    }
    if (creatorRole === 'Trade Contractor') {
      return 'Enter contract terms with your GC and Field Crew.';
    }
    return 'Assign contract sums to each party.';
  }, [creatorRole]);

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
  const [saving, setSaving] = useState(false);

  // Initialize from existing contracts using to_project_team_id as key
  useEffect(() => {
    if (existingContracts.length > 0) {
      const init: Record<string, string> = {};
      for (const c of existingContracts) {
        if (c.to_project_team_id && c.contract_sum != null) {
          init[c.to_project_team_id] = String(c.contract_sum);
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
    if (!projectId || !user || !creatorRole || !project) return;
    setSaving(true);

    try {
      for (const member of filteredTeam) {
        const valueStr = contracts[member.id];
        if (!valueStr) continue;
        const contractSum = parseFloat(valueStr);
        if (isNaN(contractSum)) continue;

        // Determine from/to based on contract direction rules
        let fromOrgId: string | null = null;
        let toOrgId: string | null = null;
        let fromRole = '';
        let toRole = '';

        if (creatorRole === 'General Contractor' && member.role === 'Trade Contractor') {
          // TC does work for GC: from=TC, to=GC
          fromOrgId = member.org_id;
          toOrgId = project.organization_id;
          fromRole = 'Trade Contractor';
          toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'General Contractor') {
          // TC does work for GC: from=TC(creator), to=GC
          fromOrgId = project.organization_id;
          toOrgId = member.org_id;
          fromRole = 'Trade Contractor';
          toRole = 'General Contractor';
        } else if (creatorRole === 'Trade Contractor' && member.role === 'Field Crew') {
          // FC does work for TC: from=FC, to=TC
          fromOrgId = member.org_id;
          toOrgId = project.organization_id;
          fromRole = 'Field Crew';
          toRole = 'Trade Contractor';
        }

        // Check for existing contract for this team member
        const existing = existingContracts.find(c => c.to_project_team_id === member.id);

        if (existing) {
          await supabase
            .from('project_contracts')
            .update({ contract_sum: contractSum })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('project_contracts')
            .insert({
              project_id: projectId,
              to_project_team_id: member.id,
              from_org_id: fromOrgId,
              to_org_id: toOrgId,
              from_role: fromRole,
              to_role: toRole,
              contract_sum: contractSum,
              created_by_user_id: user.id,
            });
        }
      }

      // Invalidate related queries
      qc.invalidateQueries({ queryKey: ['project_contracts'] });
      qc.invalidateQueries({ queryKey: ['project_financials'] });

      toast({ title: 'Contracts saved', description: 'Contract values updated successfully.' });
      navigate(`/project/${projectId}`);
    } catch (err: any) {
      toast({ title: 'Error saving contracts', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
            {descriptionText} The scope sections below reflect the items toggled ON in the Scope Wizard.
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
            {filteredTeam.length === 0 && (
              <p className="text-sm text-muted-foreground">No applicable team members found. Add team members in the project wizard first.</p>
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
          <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
            {saving ? 'Saving…' : 'Save Contracts'}
          </Button>
        </div>
      </div>
    </div>
  );
}