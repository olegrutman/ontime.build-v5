import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, AlertCircle, Pencil, ChevronRight, Sparkles, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import { useScopeSections, useScopeItems, useScopeSelections, filterSections, filterItems } from '@/hooks/useScopeWizard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DownstreamContractsCard } from './DownstreamContractsCard';

interface Props {
  projectId: string;
}

export function ScopeDetailsTab({ projectId }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const { userOrgRoles } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProjectProfile(projectId);
  const { data: projectTypes } = useProjectTypes();
  const { data: sections } = useScopeSections();
  const { data: items } = useScopeItems();
  const { data: selections } = useScopeSelections(projectId);

  const currentUserOrgId = userOrgRoles.length > 0 ? userOrgRoles[0].organization_id : null;
  const currentUserOrgType = userOrgRoles.length > 0 ? userOrgRoles[0].organization?.type : null;
  const isTCOrg = currentUserOrgType === 'TC';

  // Fetch full project data
  const { data: projectInfo } = useQuery({
    queryKey: ['project_full_info', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('organization_id, address, city, state, zip, description')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isFromCreatorOrg = projectInfo?.organization_id === currentUserOrgId;

  // Format address
  const formatAddress = () => {
    if (!projectInfo) return null;
    const parts: string[] = [];
    const addr = projectInfo.address as any;
    if (addr && typeof addr === 'object') {
      if (addr.street) parts.push(addr.street);
      if (addr.line2) parts.push(addr.line2);
    }
    const cityState: string[] = [];
    if (projectInfo.city) cityState.push(projectInfo.city);
    if (projectInfo.state) cityState.push(projectInfo.state);
    if (cityState.length) parts.push(cityState.join(', '));
    if (projectInfo.zip) parts[parts.length - 1] = (parts[parts.length - 1] || '') + ' ' + projectInfo.zip;
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Generate AI description
  const handleGenerateDescription = async () => {
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-project-description', {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ['project_full_info', projectId] });
      toast({ title: '✓ Description generated' });
    } catch (err: any) {
      toast({ title: 'Error generating description', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingDesc(false);
    }
  };

  // Fetch all team members for name lookups + FC orgs for scope split
  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['project_team_all', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('org_id, invited_org_name, role')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build org name lookup from team data
  const teamOrgNames = new Map<string, string>();
  for (const m of allTeamMembers) {
    if (m.org_id && m.invited_org_name && !teamOrgNames.has(m.org_id)) {
      teamOrgNames.set(m.org_id, m.invited_org_name);
    }
  }

  // FC orgs for scope split (TC only)
  const fcTeamOrgs = isTCOrg
    ? Array.from(
        allTeamMembers
          .filter(m => m.role === 'Field Crew' && m.org_id)
          .reduce((map, m) => {
            if (!map.has(m.org_id!)) map.set(m.org_id!, { id: m.org_id!, name: m.invited_org_name || 'Field Crew' });
            return map;
          }, new Map<string, { id: string; name: string }>())
          .values()
      )
    : [];

  // Fetch contracts with org names
  const { data: contracts } = useQuery({
    queryKey: ['project_contracts_summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('id, contract_sum, retainage_percent, from_role, to_role, trade, from_org_id, to_org_id, from_org:organizations!project_contracts_from_org_id_fkey(id, name), to_org:organizations!project_contracts_to_org_id_fkey(id, name)')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
  });

  // Filter contracts to only those where user's org is a party
  const myContracts = contracts?.filter(c =>
    c.from_org_id === currentUserOrgId || c.to_org_id === currentUserOrgId
  ) || [];

  // Exclude work order contracts
  const displayContracts = myContracts.filter(c =>
    c.trade !== 'Work Order' && c.trade !== 'Work Order Labor'
  );

  const isComplete = profile?.is_complete === true;
  const projectType = projectTypes?.find(t => t.id === profile?.project_type_id);
  const typeSlug = projectType?.slug || '';

  if (profileLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  // State A — not set up
  if (!isComplete) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-30 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Setup Project Scope & Details</p>
              <p className="text-xs text-muted-foreground">Define project type, structure, and scope of work</p>
            </div>
          </div>
          <Button
             onClick={() => navigate(`/project/${projectId}/setup`)}
            className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
          >
            Get Started
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">No project profile configured yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Complete the setup wizard to define your scope</p>
        </div>
      </div>
    );
  }

  // State B — setup complete
  const visibleSections = sections && profile ? filterSections(sections, profile as any) : [];
  const onSelections = selections?.filter(s => s.is_on) || [];
  const sectionCounts: { slug: string; label: string; count: number }[] = [];

  if (visibleSections.length && items && profile) {
    for (const sec of visibleSections) {
      const sectionItems = filterItems(items, sec.id, profile as any, typeSlug);
      const onCount = sectionItems.filter(si => onSelections.some(sel => sel.scope_item_id === si.id)).length;
      if (onCount > 0) {
        sectionCounts.push({ slug: sec.slug, label: sec.label, count: onCount });
      }
    }
  }

  const address = formatAddress();

  const featureFlags = [
    { key: 'has_garage', label: 'Garage' },
    { key: 'has_basement', label: 'Basement' },
    { key: 'has_stairs', label: 'Stairs' },
    { key: 'has_deck_balcony', label: 'Decks & Balconies' },
    { key: 'has_pool', label: 'Pool' },
    { key: 'has_elevator', label: 'Elevator' },
    { key: 'has_clubhouse', label: 'Clubhouse' },
    { key: 'has_commercial_spaces', label: 'Commercial Spaces' },
    { key: 'has_shed', label: 'Shed' },
  ];
  const activeFeatures = featureFlags.filter(f => (profile as any)[f.key] === true);

  return (
    <div className="space-y-4">
      {/* Project Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Project Profile</CardTitle>
           <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/setup`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">{projectType?.name || 'Unknown'}</Badge>
            <span className="text-sm text-muted-foreground">{profile.stories} {profile.stories === 1 ? 'story' : 'stories'}</span>
            {profile.units_per_building && (
              <span className="text-sm text-muted-foreground">· {profile.units_per_building} units</span>
            )}
            {profile.number_of_buildings > 1 && (
              <span className="text-sm text-muted-foreground">· {profile.number_of_buildings} buildings</span>
            )}
          </div>

          {/* Address */}
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{address}</p>
            </div>
          )}

          {/* AI Description */}
          {projectInfo?.description ? (
            <div className="flex items-start gap-2">
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{projectInfo.description}</p>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleGenerateDescription} disabled={generatingDesc}>
                {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGenerateDescription} disabled={generatingDesc} className="gap-1.5">
              {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generatingDesc ? 'Generating...' : 'Generate Description'}
            </Button>
          )}

          <div className="flex flex-wrap gap-1.5">
            {((profile.foundation_types as string[]) || []).map(f => (
              <Badge key={f} variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">{f}</Badge>
            ))}
            {profile.roof_type && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">{profile.roof_type}</Badge>
            )}
          </div>

          {activeFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFeatures.map(f => (
                <Badge key={f.key} className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {f.label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scope Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Scope Summary</CardTitle>
           <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/setup`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{sectionCounts.length} sections active</Badge>
            <span className="text-sm text-muted-foreground">· {onSelections.length} items ON</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sectionCounts.map(sec => (
              <div
                key={sec.slug}
                className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedSection(sec.slug)}
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="flex-1 truncate">{sec.label}</span>
                <span className="text-muted-foreground text-xs">{sec.count} items</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
          {sectionCounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No scope items selected yet</p>
          )}
        </CardContent>

        {/* Section items dialog */}
        <Dialog open={!!selectedSection} onOpenChange={(open) => !open && setSelectedSection(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{sectionCounts.find(s => s.slug === selectedSection)?.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {(() => {
                const sec = visibleSections.find(s => s.slug === selectedSection);
                if (!sec || !items || !profile) return null;
                const sectionItems = filterItems(items, sec.id, profile as any, typeSlug);
                const onItems = sectionItems.filter(si => onSelections.some(sel => sel.scope_item_id === si.id));
                return onItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Contract Cards — one per contract with company names */}
      {displayContracts.length > 0 ? (
        displayContracts.map(contract => {
          const isFromOrg = contract.from_org_id === currentUserOrgId;
          const counterpartyOrgId = isFromOrg ? contract.to_org_id : contract.from_org_id;
          const counterpartyName = isFromOrg
            ? (contract.to_org as any)?.name || teamOrgNames.get(counterpartyOrgId || '') || 'Unknown'
            : (contract.from_org as any)?.name || teamOrgNames.get(counterpartyOrgId || '') || 'Unknown';
          const counterpartyRole = isFromOrg ? contract.to_role : contract.from_role;
          const contractValue = Number(contract.contract_sum) || 0;
          const retainage = Number(contract.retainage_percent) || 0;

          return (
            <Card key={contract.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{counterpartyName}</CardTitle>
                  <Badge variant="outline" className="text-xs">{counterpartyRole}</Badge>
                </div>
                {isFromCreatorOrg && (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/contracts`)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Contract Value</span>
                    <span className="font-semibold">${contractValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retainage</span>
                    <span className="font-semibold">{retainage.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Contract Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>No contracts configured yet</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TC-only: Downstream FC contracts + Scope Split */}
      {isTCOrg && currentUserOrgId && (
        <DownstreamContractsCard
          projectId={projectId}
          tcOrgId={currentUserOrgId}
          fcOrgs={fcTeamOrgs}
        />
      )}
    </div>
  );
}
