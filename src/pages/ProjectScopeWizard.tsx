import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Pencil, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import {
  useScopeSections, useScopeItems, useScopeSelections,
  filterSections, filterItems, useSaveScopeSelections,
} from '@/hooks/useScopeWizard';
import type { ProfileDraft, ScopeItem } from '@/types/projectProfile';

export default function ProjectScopeWizard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useProjectProfile(projectId);
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: allSections = [] } = useScopeSections();
  const { data: allItems = [] } = useScopeItems();
  const { data: existingSelections = [] } = useScopeSelections(projectId);
  const saveMutation = useSaveScopeSelections(projectId!);

  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  const projectType = useMemo(
    () => projectTypes.find(t => t.id === profile?.project_type_id),
    [projectTypes, profile],
  );

  const profileDraft: ProfileDraft | null = profile as ProfileDraft | null;

  const visibleSections = useMemo(
    () => profileDraft ? filterSections(allSections, profileDraft) : [],
    [allSections, profileDraft],
  );

  const sectionItems = useMemo(() => {
    if (!profileDraft || !projectType) return {};
    const map: Record<string, ScopeItem[]> = {};
    for (const s of visibleSections) {
      map[s.id] = filterItems(allItems, s.id, profileDraft, projectType.slug);
    }
    return map;
  }, [visibleSections, allItems, profileDraft, projectType]);

  // Initialize toggles from existing selections or defaults
  useEffect(() => {
    if (initialized || !profileDraft || !projectType || allItems.length === 0) return;

    const existing = new Map(existingSelections.map(s => [s.scope_item_id, s.is_on]));
    const init: Record<string, boolean> = {};

    for (const items of Object.values(sectionItems)) {
      for (const item of items) {
        init[item.id] = existing.has(item.id) ? existing.get(item.id)! : item.default_on;
      }
    }

    setToggles(init);
    setInitialized(true);
  }, [profileDraft, projectType, allItems, existingSelections, sectionItems, initialized]);

  // Redirect if no profile
  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate(`/project/${projectId}/details-wizard`, { replace: true });
    }
  }, [profileLoading, profile, projectId, navigate]);

  const toggleSection = (id: string) => {
    setOpenSections(p => ({ ...p, [id]: !p[id] }));
  };

  const conflicts = existingSelections.filter(s => s.is_conflict);

  const handleSave = async () => {
    if (!profile) return;
    try {
      const items = Object.entries(toggles).map(([scope_item_id, is_on]) => ({ scope_item_id, is_on }));
      await saveMutation.mutateAsync({ profileId: profile.id, items });
      toast({ title: 'Scope saved', description: 'Opening Contracts...' });
      navigate(`/project/${projectId}/contracts`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (profileLoading || !profileDraft) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>;
  }

  const totalOn = Object.values(toggles).filter(Boolean).length;
  const totalItems = Object.values(toggles).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Profile banner */}
       <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-primary/15 text-primary border-0">{projectType?.name}</Badge>
            <span className="text-muted-foreground">{profileDraft.stories} stories</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{totalOn}/{totalItems} items on</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to={`/project/${projectId}/details-wizard`}>
              <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile</Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/project/${projectId}?tab=scope-details`)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold font-[Barlow_Condensed]">Project Scope</h1>
          <p className="text-sm text-muted-foreground">Toggle line items on or off. STD items are standard scope, OPT items are optional add-ons.</p>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{conflicts.length} items in your scope no longer match your project profile. Review before continuing.</span>
          </div>
        )}

        {visibleSections.map(section => {
          const items = sectionItems[section.id] || [];
          if (items.length === 0) return null;
          const open = openSections[section.id] ?? true;
          const onCount = items.filter(i => toggles[i.id]).length;

          return (
            <Card key={section.id}>
              <Collapsible open={open} onOpenChange={() => toggleSection(section.id)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-2">
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-semibold text-sm">{section.label}</span>
                      {section.description && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">— {section.description}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{onCount}/{items.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{item.label}</span>
                            <Badge variant={item.item_type === 'STD' ? 'default' : 'outline'}
                              className={cn(
                                'text-[10px] px-1.5 py-0',
                                item.item_type === 'STD' ? 'bg-secondary text-secondary-foreground' : '',
                              )}>
                              {item.item_type}
                            </Badge>
                          </div>
                          <Switch
                            checked={toggles[item.id] ?? item.default_on}
                            onCheckedChange={v => setToggles(p => ({ ...p, [item.id]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3 z-30">
        <div className="max-w-3xl mx-auto flex justify-between">
          <Button variant="outline" onClick={() => navigate(`/project/${projectId}/details-wizard`)}
            className="min-h-[44px]">
            Back to Profile
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="min-h-[44px]">
            {saveMutation.isPending ? 'Saving...' : 'Save Scope & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
