import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SOVLine, SOVVersion, ScopeCoverage, SOVPrerequisites } from '@/types/sov';

export function useSOVPage(projectId: string, contractId?: string | null) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Fetch all contracts for this project (for multi-contract selector)
  const { data: allContracts = [] } = useQuery({
    queryKey: ['sov-all-contracts', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('id, contract_sum, retainage_percent, from_role, to_role, trade, from_org_id, to_org_id')
        .eq('project_id', projectId)
        .neq('trade', 'Work Order')
        .neq('trade', 'Work Order Labor');
      return data || [];
    },
    enabled: !!projectId,
  });

  // Determine which contract to use
  const activeContractId = contractId || allContracts[0]?.id || null;
  const activeContract = allContracts.find(c => c.id === activeContractId) || allContracts[0] || null;

  // Fetch prerequisites using the active contract
  const { data: prereqs, isLoading: prereqsLoading } = useQuery<SOVPrerequisites>({
    queryKey: ['sov-prereqs', projectId, activeContractId],
    queryFn: async () => {
      const [profileRes, scopeRes] = await Promise.all([
        supabase.from('project_profiles').select('id, project_type_id, stories, units_per_building, number_of_buildings, foundation_types, roof_type, has_garage, garage_types, has_basement, basement_type, has_stairs, stair_types, has_deck_balcony, has_pool, has_elevator, has_clubhouse, has_commercial_spaces, has_shed, is_complete').eq('project_id', projectId).maybeSingle(),
        supabase.from('project_scope_selections').select('id', { count: 'exact' }).eq('project_id', projectId).eq('is_on', true),
      ]);

      const profile = profileRes.data;
      const scopeCount = scopeRes.count || 0;

      let profileSummary = '';
      if (profile) {
        const { data: pt } = await supabase.from('project_types').select('name').eq('id', profile.project_type_id).maybeSingle();
        profileSummary = `${pt?.name || 'Unknown'} · ${profile.stories} stories · ${profile.number_of_buildings} building(s)`;
      }

      return {
        hasProfile: !!profile?.is_complete,
        hasScope: scopeCount > 0,
        hasContract: !!activeContract?.contract_sum && activeContract.contract_sum > 0,
        profileSummary,
        scopeCount,
        contractValue: activeContract?.contract_sum || 0,
        retainagePct: activeContract?.retainage_percent || 0,
        contractId: activeContract?.id,
        profileId: profile?.id,
      };
    },
    enabled: !!projectId,
  });

  // Fetch current SOV (filtered by contract)
  const { data: currentSOV, isLoading: sovLoading } = useQuery<SOVVersion | null>({
    queryKey: ['sov-current', projectId, activeContractId],
    queryFn: async () => {
      let query = supabase
        .from('project_sov')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1);
      if (activeContractId) {
        query = query.eq('contract_id', activeContractId);
      }
      const { data } = await query.maybeSingle();
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
    queryKey: ['sov-scope-coverage', projectId, currentSOV?.id, items.length],
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
        body: JSON.stringify({
          project_id: projectId,
          contract_id: activeContractId,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to generate SOV');
      }
      await qc.invalidateQueries({ queryKey: ['sov-current', projectId, activeContractId] });
      await qc.invalidateQueries({ queryKey: ['sov-items'] });
      await qc.invalidateQueries({ queryKey: ['sov-versions', projectId] });
      toast({ title: 'SOV generated successfully' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [prereqs, projectId, activeContractId, qc, toast]);

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
    // Two-pass redistribution to handle clamped (negative) values
    let clampedExcess = 0;
    const rawAdjusted: { id: string; pct: number }[] = [];
    for (const u of unlocked) {
      const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
      const adjusted = (u.percent_of_contract || 0) - delta * share;
      if (adjusted < 0) {
        clampedExcess += Math.abs(adjusted);
        rawAdjusted.push({ id: u.id, pct: 0 });
      } else {
        rawAdjusted.push({ id: u.id, pct: adjusted });
      }
    }
    // Redistribute clamped excess across remaining positive lines
    if (clampedExcess > 0) {
      const positiveTotal = rawAdjusted.reduce((s, u) => s + u.pct, 0);
      for (const u of rawAdjusted) {
        if (u.pct > 0 && positiveTotal > 0) {
          u.pct = Math.max(0, u.pct - clampedExcess * (u.pct / positiveTotal));
        }
      }
    }
    updates.push(...rawAdjusted);

    // Normalize: account for locked lines + force last entry to absorb rounding remainder
    const locked = items.filter((i, j) => j !== idx && i.is_locked);
    const lockedTotal = locked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
    const runningTotal = lockedTotal + updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
    updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;

    await supabase.rpc('update_sov_line_percentages', {
      p_updates: updates,
      p_contract_value: contractValue,
      p_retainage_pct: prereqs?.retainagePct || 0,
    });
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

    if (unlocked.length > 0) {
      const updates: { id: string; pct: number }[] = [];
      for (const u of unlocked) {
        const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
        const newPct = (u.percent_of_contract || 0) + pctToRedist * share;
        updates.push({ id: u.id, pct: Math.max(0, newPct) });
      }
      // Normalize last
      const locked = items.filter(i => i.id !== lineId && i.is_locked);
      const lockedTotal = locked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
      const runningTotal = lockedTotal + updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
      updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;

      await supabase.rpc('update_sov_line_percentages', {
        p_updates: updates,
        p_contract_value: contractValue,
        p_retainage_pct: prereqs?.retainagePct || 0,
      });
    }
    qc.invalidateQueries({ queryKey: ['sov-items', currentSOV.id] });
  }, [items, currentSOV, prereqs, qc]);

  // Add a new line
  const addLine = useCallback(async (itemName: string, group: string, sectionSlug: string | null) => {
    if (!currentSOV || currentSOV.is_locked) return;
    const contractValue = prereqs?.contractValue || 0;
    const defaultPct = 1;
    const unlocked = items.filter(i => !i.is_locked);
    const unlockTotal = unlocked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);

    // Compute redistributed percentages for existing unlocked lines
    if (unlocked.length > 0) {
      const updates: { id: string; pct: number }[] = [];
      for (const u of unlocked) {
        const share = unlockTotal > 0 ? (u.percent_of_contract || 0) / unlockTotal : 1 / unlocked.length;
        const newPct = (u.percent_of_contract || 0) - defaultPct * share;
        updates.push({ id: u.id, pct: Math.max(0, newPct) });
      }
      // Normalize: account for locked lines + new line's 1%
      const locked = items.filter(i => i.is_locked);
      const lockedTotal = locked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
      const runningTotal = lockedTotal + defaultPct + updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
      updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;

      await supabase.rpc('update_sov_line_percentages', {
        p_updates: updates,
        p_contract_value: contractValue,
        p_retainage_pct: prereqs?.retainagePct || 0,
      });
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
      source: 'user',
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
    qc.invalidateQueries({ queryKey: ['sov-current', projectId, activeContractId] });
    toast({ title: 'SOV locked', description: 'This version is now the billing template' });
  }, [currentSOV, items, projectId, activeContractId, qc, toast]);

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
    contractMismatch,
    coveredCount,
    totalSections: scopeCoverage.length,
    allContracts,
    activeContractId,
  };
}
