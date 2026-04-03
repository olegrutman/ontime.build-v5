// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useScopeSelections, useScopeSections, useScopeItems, filterSections, filterItems } from '@/hooks/useScopeWizard';
import { useProjectProfile, useProjectTypes } from '@/hooks/useProjectProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Layers, Save, Loader2 } from 'lucide-react';

interface Props {
  projectId: string;
  tcOrgId: string;
  fcOrgs: { id: string; name: string }[];
  embedded?: boolean;
}

export function ScopeSplitCard({ projectId, tcOrgId, fcOrgs, embedded }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fcAssignments, setFcAssignments] = useState<Set<string>>(new Set());

  const { data: profile } = useProjectProfile(projectId);
  const { data: projectTypes } = useProjectTypes();
  const { data: sections } = useScopeSections();
  const { data: items } = useScopeItems();
  const { data: selections } = useScopeSelections(projectId);

  const projectType = projectTypes?.find(t => t.id === profile?.project_type_id);
  const typeSlug = projectType?.slug || '';

  // Fetch existing assignments
  const { data: existingAssignments = [] } = useQuery({
    queryKey: ['scope-assignments', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scope_assignments')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const onSelections = selections?.filter(s => s.is_on) || [];
  const visibleSections = sections && profile ? filterSections(sections, profile as any) : [];

  const activeItems = useMemo(() => {
    if (!visibleSections.length || !items || !profile) return [];
    const result: { id: string; label: string; sectionLabel: string }[] = [];
    for (const sec of visibleSections) {
      const sectionItems = filterItems(items, sec.id, profile as any, typeSlug);
      for (const si of sectionItems) {
        if (onSelections.some(sel => sel.scope_item_id === si.id)) {
          result.push({ id: si.id, label: si.label, sectionLabel: sec.label });
        }
      }
    }
    return result;
  }, [visibleSections, items, profile, typeSlug, onSelections]);

  const fcAssignedCount = existingAssignments.filter(a => a.assigned_role === 'Field Crew').length;

  const handleOpenDialog = () => {
    // Initialize from existing assignments
    const fcSet = new Set<string>();
    for (const a of existingAssignments) {
      if (a.assigned_role === 'Field Crew') {
        fcSet.add(a.scope_item_id);
      }
    }
    setFcAssignments(fcSet);
    setDialogOpen(true);
  };

  const toggleItem = (itemId: string) => {
    setFcAssignments(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSave = async () => {
    if (fcOrgs.length === 0) {
      toast({ title: 'No Field Crew', description: 'Add a Field Crew to the project first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Delete existing assignments for this project
      await supabase.from('project_scope_assignments').delete().eq('project_id', projectId);

      // Insert new assignments
      const inserts: any[] = [];
      for (const item of activeItems) {
        const isFc = fcAssignments.has(item.id);
        inserts.push({
          project_id: projectId,
          scope_item_id: item.id,
          assigned_to_org_id: isFc ? fcOrgs[0].id : tcOrgId,
          assigned_role: isFc ? 'Field Crew' : 'Trade Contractor',
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('project_scope_assignments').insert(inserts);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ['scope-assignments', projectId] });
      toast({ title: 'Scope assignments saved' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (fcOrgs.length === 0) return null;

  if (embedded) {
    return (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope Split</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{activeItems.length} total items</Badge>
              <span className="text-sm text-muted-foreground">
                · {fcAssignedCount} assigned to {fcOrgs[0]?.name || 'Field Crew'}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            <Layers className="h-3.5 w-3.5 mr-1" /> Split Scope
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Split Scope</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Check items to assign to <strong>{fcOrgs[0]?.name || 'Field Crew'}</strong>. Unchecked items stay with your team.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (fcAssignments.size === activeItems.length) {
                    setFcAssignments(new Set());
                  } else {
                    setFcAssignments(new Set(activeItems.map(i => i.id)));
                  }
                }}
              >
                {fcAssignments.size === activeItems.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="flex-1 overflow-auto space-y-4 py-2">
              {(() => {
                const grouped = new Map<string, typeof activeItems>();
                for (const item of activeItems) {
                  const group = grouped.get(item.sectionLabel) || [];
                  group.push(item);
                  grouped.set(item.sectionLabel, group);
                }
                return Array.from(grouped.entries()).map(([section, sectionItems]) => (
                  <div key={section}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{section}</p>
                    <div className="space-y-1.5">
                      {sectionItems.map(item => (
                        <label key={item.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={fcAssignments.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <span className="text-sm">{item.label}</span>
                          {fcAssignments.has(item.id) && (
                            <Badge className="ml-auto text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">FC</Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Assignments
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Scope Split</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleOpenDialog}>
            <Layers className="h-3.5 w-3.5 mr-1" /> Split Scope
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{activeItems.length} total items</Badge>
            <span className="text-sm text-muted-foreground">
              · {fcAssignedCount} assigned to {fcOrgs[0]?.name || 'Field Crew'}
              · {activeItems.length - fcAssignedCount} kept by your team
            </span>
          </div>
          {fcAssignedCount === 0 && (
            <p className="text-sm text-muted-foreground">
              All scope items are assigned to your team. Use "Split Scope" to assign items to {fcOrgs[0]?.name || 'your field crew'}.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Split Scope</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Check items to assign to <strong>{fcOrgs[0]?.name || 'Field Crew'}</strong>. Unchecked items stay with your team.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (fcAssignments.size === activeItems.length) {
                  setFcAssignments(new Set());
                } else {
                  setFcAssignments(new Set(activeItems.map(i => i.id)));
                }
              }}
            >
              {fcAssignments.size === activeItems.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="flex-1 overflow-auto space-y-4 py-2">
            {(() => {
              const grouped = new Map<string, typeof activeItems>();
              for (const item of activeItems) {
                const group = grouped.get(item.sectionLabel) || [];
                group.push(item);
                grouped.set(item.sectionLabel, group);
              }
              return Array.from(grouped.entries()).map(([section, sectionItems]) => (
                <div key={section}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{section}</p>
                  <div className="space-y-1.5">
                    {sectionItems.map(item => (
                      <label key={item.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={fcAssignments.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="text-sm">{item.label}</span>
                        {fcAssignments.has(item.id) && (
                          <Badge className="ml-auto text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">FC</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
