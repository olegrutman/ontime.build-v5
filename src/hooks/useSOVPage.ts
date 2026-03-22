import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SOVLine, SOVVersion, ScopeCoverage, SOVPrerequisites } from '@/types/sov';

export function useSOVPage(projectId: string) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Fetch prerequisites
  const { data: prereqs, isLoading: prereqsLoading } = useQuery<SOVPrerequisites>({
    queryKey: ['sov-prereqs', projectId],
    queryFn: async () => {
      const [profileRes, scopeRes, contractRes] = await Promise.all([
        supabase.from('project_profiles').select('id, project_type_id, stories, units_per_building, number_of_buildings, foundation_types, roof_type, has_garage, garage_types, has_basement, basement_type, has_stairs, stair_types, has_deck_balcony, has_pool, has_elevator, has_clubhouse, has_commercial_spaces, has_shed, is_complete').eq('project_id', projectId).maybeSingle(),
        supabase.from('project_scope_selections').select('id', { count: 'exact' }).eq('project_id', projectId).eq('is_on', true),
        supabase.from('project_contracts').select('id, contract_sum, retainage_percent, status').eq('project_id', projectId).limit(1).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const scopeCount = scopeRes.count || 0;
      const contract = contractRes.data;

      let profileSummary = '';
      if (profile) {
        // Fetch project type name
        const { data: pt } = await supabase.from('project_types').select('name').eq('id', profile.project_type_id).maybeSingle();
        profileSummary = `${pt?.name || 'Unknown'} · ${profile.stories} stories · ${profile.number_of_buildings} building(s)`;
      }

      return {
        hasProfile: !!profile?.is_complete,
        hasScope: scopeCount > 0,
        hasContract: !!contract?.contract_sum && contract.contract_sum > 0,
        profileSummary,
        scopeCount,
        contractValue: contract?.contract_sum || 0,
        retainagePct: contract?.retainage_percent || 0,
        contractId: contract?.id,
        profileId: profile?.id,
      };
    },
    enabled: !!projectId,
  });

  // Fetch current SOV
  const { data: currentSOV, isLoading: sovLoading } = useQuery<SOVVersion | null>({
    queryKey: ['sov-current', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_sov')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as SOVVersion | null;
    },
    enabled: !!projectId,
  });

  // Fetch SOV items
  const { data: items = [], isLoading: itemsLoading } = useQuery<SOVLine[]>({
    queryKey: ['sov-items', currentSOV?.id],
    queryFn: async () => {
      if (!currentSOV) return [];
      const { data } = await supabase
        .from('project_sov_items')
        .select('*')
        .eq('sov_id', currentSOV.id)
        .order('sort_order');
      return (data || []) as SOVLine[];
    },
    enabled: !!currentSOV?.id,
  });

  // Fetch scope sections for coverage panel
  const { data: scopeCoverage = [] } = useQuery<ScopeCoverage[]>({
    queryKey: ['sov-scope-coverage', projectId, items],
    queryFn: async () => {
      // Get active scope selections grouped by section
      const { data: selections } = await supabase
        .from('project_scope_selections')
        .select('scope_item_id, scope_items!inner(id, section_id, scope_sections!inner(slug, label))')
        .eq('project_id', projectId)
        .eq('is_on', true);

      if (!selections) return [];

      const sectionMap = new Map<string, { label: string; count: number }>();
      for (const s of selections) {
        const section = (s as any).scope_items?.scope_sections;
        if (!section) continue;
        const existing = sectionMap.get(section.slug);
        if (existing) existing.count++;
        else sectionMap.set(section.slug, { label: section.label, count: 1 });
      }

      return Array.from(sectionMap.entries()).map(([slug, { label, count }]) => {
        const coveredItems = items.filter(i => i.scope_section_slug === slug);
        const allocatedPct = coveredItems.reduce((sum, i) => sum + (i.percent_of_contract || 0), 0);
        return {
          sectionSlug: slug,
          sectionLabel: label,
          itemCount: count,
          covered: coveredItems.length > 0,
          allocatedPct,
        };
      });
    },
    enabled: !!projectId && items.length >= 0,
  });

  // Version history
  const { data: versions = [] } = useQuery<SOVVersion[]>({
    queryKey: ['sov-versions', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_sov')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });
      return (data || []) as SOVVersion[];
    },
    enabled: !!projectId,
  });

  // Generate SOV via edge function
  const generateSOV = useCallback(async () => {
    if (!prereqs?.hasProfile || !prereqs?.hasScope || !prereqs?.hasContract) return;
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sov`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to generate SOV');
      }
      await qc.invalidateQueries({ queryKey: ['sov-current', projectId] });
      await qc.invalidateQueries({ queryKey: ['sov-items'] });
      await qc.invalidateQueries({ queryKey: ['sov-versions', projectId] });
      toast({ title: 'SOV generated successfully' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [prereqs, projectId, qc, toast]);

  // Update a line's percentage and redistribute
  const updateLinePct = useCallback(async (lineId: string, newPct: number) => {
    if (!currentSOV || currentSOV.is_locked) return;
    const contractValue = prereqs?.contractValue || 0;
    const idx = items.findIndex(i => i.id === lineId);
    if (idx === -1) return;

    const oldPct = items[idx].percent_of_contract || 0;
    const delta = newPct - oldPct;
    const unlocked = items.filter((i, j) => j !== idx && !i.is_locked);
    const unlockTotal = unlocked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);

    const updates: { id: string; pct: number }[] = [{ id: lineId, pct: newPct }];
    for (const u of unlocked) {
      const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
      const adjusted = (u.percent_of_contract || 0) - delta * share;
      updates.push({ id: u.id, pct: Math.max(0, adjusted) });
    }

    for (const up of updates) {
      const value = contractValue * up.pct / 100;
      const retainage = value * (prereqs?.retainagePct || 0) / 100;
      await supabase.from('project_sov_items').update({
        percent_of_contract: up.pct,
        value_amount: value,
        scheduled_value: value - retainage,
        remaining_amount: value,
      }).eq('id', up.id);
    }
    qc.invalidateQueries({ queryKey: ['sov-items', currentSOV.id] });
  }, [items, currentSOV, prereqs, qc]);

  // Toggle line lock
  const toggleLineLock = useCallback(async (lineId: string) => {
    if (!currentSOV || currentSOV.is_locked) return;
    const line = items.find(i => i.id === lineId);
    if (!line) return;
    // Don't allow locking if it's the last unlocked
    const unlockedCount = items.filter(i => !i.is_locked).length;
    if (!line.is_locked && unlockedCount <= 1) {
      toast({ title: 'Cannot lock', description: 'At least one line must remain unlocked', variant: 'destructive' });
      return;
    }
    await supabase.from('project_sov_items').update({ is_locked: !line.is_locked }).eq('id', lineId);
    qc.invalidateQueries({ queryKey: ['sov-items', currentSOV.id] });
  }, [items, currentSOV, qc, toast]);

  // Delete a line and redistribute
  const deleteLine = useCallback(async (lineId: string) => {
    if (!currentSOV || currentSOV.is_locked) return;
    const line = items.find(i => i.id === lineId);
    if (!line) return;
    const contractValue = prereqs?.contractValue || 0;
    const pctToRedist = line.percent_of_contract || 0;
    const unlocked = items.filter(i => i.id !== lineId && !i.is_locked);
    const unlockTotal = unlocked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);

    await supabase.from('project_sov_items').delete().eq('id', lineId);

    for (const u of unlocked) {
      const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
      const newPct = (u.percent_of_contract || 0) + pctToRedist * share;
      const value = contractValue * newPct / 100;
      const retainage = value * (prereqs?.retainagePct || 0) / 100;
      await supabase.from('project_sov_items').update({
        percent_of_contract: newPct,
        value_amount: value,
        scheduled_value: value - retainage,
        remaining_amount: value,
      }).eq('id', u.id);
    }
    qc.invalidateQueries({ queryKey: ['sov-items', currentSOV.id] });
  }, [items, currentSOV, prereqs, qc]);

  // Add a new line
  const addLine = useCallback(async (itemName: string, group: string, sectionSlug: string | null) => {
    if (!currentSOV || currentSOV.is_locked) return;
    const contractValue = prereqs?.contractValue || 0;
    const defaultPct = 1;
    // Take from unlocked lines
    const unlocked = items.filter(i => !i.is_locked);
    const unlockTotal = unlocked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);

    for (const u of unlocked) {
      const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
      const newPct = (u.percent_of_contract || 0) - defaultPct * share;
      const value = contractValue * Math.max(0, newPct) / 100;
      const retainage = value * (prereqs?.retainagePct || 0) / 100;
      await supabase.from('project_sov_items').update({
        percent_of_contract: Math.max(0, newPct),
        value_amount: value,
        scheduled_value: value - retainage,
        remaining_amount: value,
      }).eq('id', u.id);
    }

    const value = contractValue * defaultPct / 100;
    const retainage = value * (prereqs?.retainagePct || 0) / 100;
    await supabase.from('project_sov_items').insert({
      sov_id: currentSOV.id,
      project_id: projectId,
      item_name: itemName,
      item_group: group,
      percent_of_contract: defaultPct,
      value_amount: value,
      scheduled_value: value - retainage,
      remaining_amount: value,
      sort_order: items.length + 1,
      source: 'manual',
      scope_section_slug: sectionSlug,
      default_enabled: true,
    });
    qc.invalidateQueries({ queryKey: ['sov-items', currentSOV.id] });
  }, [items, currentSOV, prereqs, projectId, qc]);

  // Reset a line to AI original
  const resetLine = useCallback(async (lineId: string) => {
    const line = items.find(i => i.id === lineId);
    if (!line || line.ai_original_pct == null || !currentSOV) return;
    await updateLinePct(lineId, line.ai_original_pct);
  }, [items, currentSOV, updateLinePct]);

  // Lock SOV
  const lockSOV = useCallback(async () => {
    if (!currentSOV) return;
    const total = items.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
    if (Math.abs(total - 100) > 0.05) {
      toast({ title: 'Cannot lock', description: `Total is ${total.toFixed(2)}%, must be 100%`, variant: 'destructive' });
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    await supabase.from('project_sov').update({
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: session.session?.user?.id || null,
    }).eq('id', currentSOV.id);
    qc.invalidateQueries({ queryKey: ['sov-current', projectId] });
    toast({ title: 'SOV locked', description: 'This version is now the billing template' });
  }, [currentSOV, items, projectId, qc, toast]);

  const totalPct = useMemo(() => items.reduce((s, i) => s + (i.percent_of_contract || 0), 0), [items]);
  const sovTotalValue = useMemo(() => items.reduce((s, i) => s + (i.value_amount || 0), 0), [items]);
  const contractMismatch = useMemo(() => {
    if (!currentSOV || items.length === 0) return false;
    return Math.abs(sovTotalValue - (prereqs?.contractValue || 0)) > 0.01;
  }, [sovTotalValue, prereqs?.contractValue, currentSOV, items.length]);
  const coveredCount = useMemo(() => scopeCoverage.filter(s => s.covered).length, [scopeCoverage]);

  return {
    prereqs: prereqs || { hasProfile: false, hasScope: false, hasContract: false },
    prereqsLoading,
    currentSOV,
    sovLoading,
    items,
    itemsLoading,
    scopeCoverage,
    versions,
    generating,
    generateSOV,
    updateLinePct,
    toggleLineLock,
    deleteLine,
    addLine,
    resetLine,
    lockSOV,
    totalPct,
    coveredCount,
    totalSections: scopeCoverage.length,
  };
}
