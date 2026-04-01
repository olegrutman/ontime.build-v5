import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Save, Users, RotateCcw } from 'lucide-react';

interface Props {
  projectId: string;
  projectStatus: string;
  onRefresh: () => void;
}

interface ScopeSelection {
  id: string;
  category_slug: string;
  is_included: boolean;
  contract_id: string;
}

interface ScopeDetail {
  id: string;
  selection_id: string;
  detail_key: string;
  detail_value: string;
}

interface OrgOption {
  id: string;
  name: string;
  type: string;
}

export function PlatformScopeEditor({ projectId, projectStatus, onRefresh }: Props) {
  const [selections, setSelections] = useState<ScopeSelection[]>([]);
  const [details, setDetails] = useState<ScopeDetail[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [teamOrgs, setTeamOrgs] = useState<{ id: string; org_id: string; role: string; org_name: string }[]>([]);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    const [selRes, detRes, orgRes, teamRes] = await Promise.all([
      supabase.from('contract_scope_selections').select('*').eq('project_id', projectId),
      supabase.from('contract_scope_details').select('*'),
      supabase.from('organizations').select('id, name, type').order('name'),
      supabase.from('project_team').select('id, org_id, role, organization:organizations!project_team_org_id_fkey(name)').eq('project_id', projectId),
    ]);

    setSelections((selRes.data || []) as unknown as ScopeSelection[]);

    // Filter details to only those belonging to our selections
    const selIds = new Set((selRes.data || []).map((s: any) => s.id));
    setDetails(((detRes.data || []) as unknown as ScopeDetail[]).filter(d => selIds.has(d.selection_id)));

    setOrgs((orgRes.data || []) as unknown as OrgOption[]);
    setTeamOrgs(((teamRes.data || []) as unknown as any[]).map(t => ({
      id: t.id,
      org_id: t.org_id,
      role: t.role,
      org_name: (t.organization as any)?.name || '—',
    })));
    setLoading(false);
  };

  const handleToggleSelection = (selId: string) => {
    setSelections(prev => prev.map(s => s.id === selId ? { ...s, is_included: !s.is_included } : s));
  };

  const handleDetailChange = (detailId: string, value: string) => {
    setDetails(prev => prev.map(d => d.id === detailId ? { ...d, detail_value: value } : d));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save selections
      for (const sel of selections) {
        await supabase.from('contract_scope_selections').update({ is_included: sel.is_included }).eq('id', sel.id);
      }
      // Save details
      for (const det of details) {
        await supabase.from('contract_scope_details').update({ detail_value: det.detail_value }).eq('id', det.id);
      }
      toast.success('Scope selections saved');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const handleReassign = async () => {
    if (!reassignTarget) return;
    setSaving(true);
    try {
      // Find the GC team entry (creator) and update its org_id
      const gcTeam = teamOrgs.find(t => t.role === 'GC');
      if (gcTeam) {
        await supabase.from('project_team').update({ org_id: reassignTarget } as any).eq('id', gcTeam.id);
        toast.success('Project reassigned');
        onRefresh();
      } else {
        toast.error('No GC team entry found');
      }
    } catch (e) {
      toast.error('Failed to reassign');
    }
    setSaving(false);
  };

  const handleResetStatus = async (newStatus: string) => {
    setSaving(true);
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Project status set to ${newStatus}`);
      onRefresh();
    }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading scope data…</p>;

  // Group selections by category
  const grouped = selections.reduce<Record<string, ScopeSelection[]>>((acc, s) => {
    (acc[s.category_slug] = acc[s.category_slug] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Status Reset */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Project Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">{projectStatus}</Badge>
            <Button size="sm" variant="outline" onClick={() => handleResetStatus('setup')} disabled={saving || projectStatus === 'setup'}>
              Reset to Setup
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleResetStatus('draft')} disabled={saving || projectStatus === 'draft'}>
              Set Draft
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleResetStatus('active')} disabled={saving || projectStatus === 'active'}>
              Force Active
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reassign */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Reassign Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Team</p>
              <div className="flex flex-wrap gap-2">
                {teamOrgs.map(t => (
                  <Badge key={t.id} variant="outline" className="text-xs">
                    {t.org_name} ({t.role})
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={reassignTarget} onValueChange={setReassignTarget}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select new owner org…" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.filter(o => o.type === 'GC' || o.type === 'TC').map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name} ({o.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleReassign} disabled={!reassignTarget || saving}>
                Reassign GC
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scope Selections */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Scope Selections ({selections.length})</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(grouped).map(([category, sels]) => (
            <div key={category}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
              <div className="space-y-2">
                {sels.map(sel => {
                  const selDetails = details.filter(d => d.selection_id === sel.id);
                  return (
                    <div key={sel.id} className="border border-border rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleSelection(sel.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                            sel.is_included
                              ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-600 border-red-400/30'
                          }`}
                        >
                          {sel.is_included ? 'Included' : 'Excluded'}
                        </button>
                        <span className="text-sm font-medium">{sel.category_slug}</span>
                      </div>
                      {selDetails.length > 0 && (
                        <div className="mt-2 space-y-1.5 ml-4">
                          {selDetails.map(d => (
                            <div key={d.id} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-32 shrink-0">{d.detail_key}</span>
                              <Input
                                value={d.detail_value}
                                onChange={e => handleDetailChange(d.id, e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {selections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No scope selections found for this project</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
