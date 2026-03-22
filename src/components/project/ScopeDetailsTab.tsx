import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, AlertCircle, Pencil, ChevronRight, Layers, Building2, Home, Factory, Store, Castle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import { useScopeSections, useScopeItems, useScopeSelections, filterSections, filterItems } from '@/hooks/useScopeWizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  projectId: string;
}

export function ScopeDetailsTab({ projectId }: Props) {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProjectProfile(projectId);
  const { data: projectTypes } = useProjectTypes();
  const { data: sections } = useScopeSections();
  const { data: items } = useScopeItems();
  const { data: selections } = useScopeSelections(projectId);

  const { data: contracts } = useQuery({
    queryKey: ['project_contracts_summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('id, contract_sum, retainage_percent')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
  });

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
            onClick={() => navigate(`/project/${projectId}/details-wizard`)}
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

  // State B — setup complete — compute summary data
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

  const totalContractValue = contracts?.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0) || 0;
  const avgRetainage = contracts?.length
    ? contracts.reduce((sum, c) => sum + (Number(c.retainage_pct) || 0), 0) / contracts.length
    : 0;

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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/details-wizard`)}>
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
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/scope-wizard`)}>
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
              <div key={sec.slug} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="flex-1 truncate">{sec.label}</span>
                <span className="text-muted-foreground text-xs">{sec.count} items</span>
              </div>
            ))}
          </div>
          {sectionCounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No scope items selected yet</p>
          )}
        </CardContent>
      </Card>

      {/* Contract Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Contract Summary</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/contracts`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          {contracts && contracts.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Contract Value</span>
                <span className="font-semibold">${totalContractValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Retainage</span>
                <span className="font-semibold">{avgRetainage.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>No contracts configured yet</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
