import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Contract types
export interface ProjectContract {
  id: string;
  project_id: string;
  from_role: string;
  to_role: string;
  trade: string | null;
  contract_sum: number;
  retainage_percent: number;
  allow_mobilization_line_item: boolean;
  status: string;
  to_project_team_id: string | null;
  from_org_id?: string | null;
  to_org_id?: string | null;
  from_org_name?: string | null;
  to_org_name?: string | null;
}

// SOV types
export interface ContractSOV {
  id: string;
  project_id: string;
  contract_id: string | null;
  sov_name: string | null;
  created_from_template_key: string | null;
  created_at: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
}

export interface ContractSOVItem {
  id: string;
  sov_id: string;
  project_id: string;
  sort_order: number;
  item_name: string;
  item_group: string | null;
  percent_of_contract: number;
  value_amount: number;
  billed_to_date: number;
  source: 'template' | 'user';
  created_at: string;
}

interface SOVTemplate {
  id: string;
  template_key: string;
  display_name: string;
  generator_rules: GeneratorRules;
}

interface StaticListRules {
  type: 'static_list';
  items: string[];
}

interface StoryGeneratorRules {
  type: 'story_generator';
  defaults: {
    include_windows?: boolean;
    include_wrb?: boolean;
    include_siding_sides?: string[];
    include_per_floor_inspection?: boolean;
    include_per_floor_final_punch?: boolean;
  };
  story_patterns: {
    level_1: string[];
    levels_2_to_n: string[];
    roof: string[];
    per_level_closeout: string[];
    global_exterior: string[];
    per_level_inspections: string[];
    per_level_final_punch: string[];
  };
}

interface InheritRules {
  type: 'inherit';
  inherit_from: string;
  add_items_end?: string[];
}

type GeneratorRules = StaticListRules | StoryGeneratorRules | InheritRules;

interface ProjectScopeDetails {
  home_type: string | null;
  floors: number | null;
  stories: number | null;
  windows_included: boolean | null;
  wrb_included: boolean | null;
  siding_included: boolean | null;
  decking_included: boolean | null;
  fascia_included: boolean | null;
  soffit_included: boolean | null;
  decorative_included: boolean | null;
  has_roof_deck: boolean | null;
}

// Get contract display name - uses org names if available, falls back to roles
export function getContractDisplayName(
  fromRole: string, 
  toRole: string,
  fromOrgName?: string | null,
  toOrgName?: string | null
): string {
  const from = fromOrgName || fromRole;
  const to = toOrgName || toRole;
  return `${from} → ${to}`;
}

// Map project type to template key
export function getTemplateKeyForProject(
  projectType: string,
  homeType: string | null
): string {
  const normalizedType = projectType?.toLowerCase().replace(/[^a-z]/g, '') || '';
  
  if (normalizedType.includes('apartment') || normalizedType.includes('condo')) {
    return 'APARTMENT_CONDO';
  }
  if (normalizedType.includes('hotel')) {
    return 'HOTEL';
  }
  if (normalizedType.includes('townhome') || normalizedType.includes('townhouse')) {
    return 'TOWNHOME';
  }
  if (normalizedType.includes('duplex')) {
    return 'DUPLEX';
  }
  if (normalizedType.includes('singlefamily') || normalizedType.includes('residential')) {
    if (homeType === 'Track Home') {
      return 'TRACK_HOME';
    }
    return 'CUSTOM_HOME';
  }
  
  return 'CUSTOM_HOME';
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function generateStoryBasedItems(
  rules: StoryGeneratorRules,
  stories: number,
  scope: ProjectScopeDetails | null
): string[] {
  const items: string[] = [];
  const numStories = Math.max(1, stories);
  
  for (const pattern of rules.story_patterns.level_1) {
    items.push(pattern.replace('{L}', getOrdinal(1)));
  }
  
  for (let level = 2; level <= numStories; level++) {
    for (const pattern of rules.story_patterns.levels_2_to_n) {
      items.push(pattern.replace('{L}', getOrdinal(level)));
    }
  }
  
  items.push(...rules.story_patterns.roof);
  
  if (scope?.has_roof_deck) {
    items.push('Roof Deck Framing');
  }
  
  for (let level = 1; level <= numStories; level++) {
    for (const pattern of rules.story_patterns.per_level_closeout) {
      items.push(pattern.replace('{L}', getOrdinal(level)));
    }
  }
  
  for (const item of rules.story_patterns.global_exterior) {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('window') && scope?.windows_included === false) continue;
    if ((lowerItem.includes('tyvek') || lowerItem.includes('wrb')) && scope?.wrb_included === false) continue;
    if (lowerItem.includes('siding') && scope?.siding_included === false) continue;
    items.push(item);
  }
  
  if (rules.defaults.include_per_floor_inspection) {
    for (let level = 1; level <= numStories; level++) {
      for (const pattern of rules.story_patterns.per_level_inspections) {
        items.push(pattern.replace('{L}', getOrdinal(level)));
      }
    }
  }
  
  if (rules.defaults.include_per_floor_final_punch) {
    for (let level = 1; level <= numStories; level++) {
      for (const pattern of rules.story_patterns.per_level_final_punch) {
        items.push(pattern.replace('{L}', getOrdinal(level)));
      }
    }
  }
  
  return items;
}

function generateStaticListItems(
  rules: StaticListRules,
  scope: ProjectScopeDetails | null
): string[] {
  const items: string[] = [];
  
  for (const item of rules.items) {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('window') && scope?.windows_included === false) continue;
    if (lowerItem.includes('siding') && scope?.siding_included === false) continue;
    if (lowerItem === 'decks' && scope?.decking_included === false) continue;
    if ((lowerItem.includes('fascia') || lowerItem.includes('soffit')) && 
        scope?.fascia_included === false && scope?.soffit_included === false) continue;
    if (lowerItem.includes('decorative') && scope?.decorative_included === false) continue;
    items.push(item);
  }
  
  return items;
}

export function useContractSOV(projectId: string | undefined) {
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [sovs, setSovs] = useState<ContractSOV[]>([]);
  const [sovItems, setSovItems] = useState<Record<string, ContractSOVItem[]>>({});
  const [templates, setTemplates] = useState<SOVTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    
    try {
      // Fetch contracts, SOVs, and items in parallel
      const [contractsResult, sovsResult, templatesResult] = await Promise.all([
        supabase
          .from('project_contracts')
          .select(`
            *,
            from_org:organizations!project_contracts_from_org_id_fkey(name),
            to_org:organizations!project_contracts_to_org_id_fkey(name)
          `)
          .eq('project_id', projectId),
        supabase
          .from('project_sov')
          .select('*')
          .eq('project_id', projectId),
        supabase
          .from('sov_templates')
          .select('*')
          .order('display_name')
      ]);
      
      // Map contracts with org names
      const fetchedContracts: ProjectContract[] = (contractsResult.data || []).map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        from_role: c.from_role,
        to_role: c.to_role,
        trade: c.trade,
        contract_sum: c.contract_sum,
        retainage_percent: c.retainage_percent,
        allow_mobilization_line_item: c.allow_mobilization_line_item,
        status: c.status,
        to_project_team_id: c.to_project_team_id,
        from_org_id: c.from_org_id,
        to_org_id: c.to_org_id,
        from_org_name: c.from_org?.name || null,
        to_org_name: c.to_org?.name || null,
      }));
      const fetchedSovs = (sovsResult.data || []) as ContractSOV[];
      
      setContracts(fetchedContracts);
      setSovs(fetchedSovs);
      setTemplates((templatesResult.data || []) as unknown as SOVTemplate[]);
      
      // Fetch items for each SOV
      if (fetchedSovs.length > 0) {
        const itemsResult = await supabase
          .from('project_sov_items')
          .select('*')
          .in('sov_id', fetchedSovs.map(s => s.id))
          .order('sort_order');
        
        const itemsBySov: Record<string, ContractSOVItem[]> = {};
        for (const item of (itemsResult.data || []) as ContractSOVItem[]) {
          if (!itemsBySov[item.sov_id]) {
            itemsBySov[item.sov_id] = [];
          }
          itemsBySov[item.sov_id].push(item);
        }
        setSovItems(itemsBySov);
      } else {
        setSovItems({});
      }
    } catch (error) {
      console.error('Error fetching SOV data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate SOV items from template
  const generateItemsFromTemplate = useCallback(async (
    templateKey: string,
    stories: number,
    scope: ProjectScopeDetails | null
  ): Promise<string[]> => {
    let template = templates.find(t => t.template_key === templateKey);
    if (!template) {
      const { data } = await supabase
        .from('sov_templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      if (data) template = data as unknown as SOVTemplate;
    }
    
    if (!template) throw new Error(`Template ${templateKey} not found`);
    
    const rules = template.generator_rules;
    
    if (rules.type === 'inherit') {
      const parentItems = await generateItemsFromTemplate(rules.inherit_from, stories, scope);
      if (rules.add_items_end) parentItems.push(...rules.add_items_end);
      return parentItems;
    }
    
    if (rules.type === 'static_list') {
      return generateStaticListItems(rules, scope);
    }
    
    if (rules.type === 'story_generator') {
      return generateStoryBasedItems(rules, stories, scope);
    }
    
    return [];
  }, [templates]);

  // Create SOVs for all contracts (only for contracts with a price > 0 AND not work order contracts)
  const createAllSOVs = useCallback(async () => {
    if (!projectId || contracts.length === 0) return;
    
    // Filter to only PRIMARY contracts (not work orders) with a contract_sum > 0
    // Work order contracts have trade = 'Work Order' or 'Work Order Labor'
    const isWorkOrderContract = (c: ProjectContract) => 
      c.trade === 'Work Order' || c.trade === 'Work Order Labor';
    
    const contractsWithValue = contracts.filter(c => 
      (c.contract_sum || 0) > 0 && !isWorkOrderContract(c)
    );
    
    if (contractsWithValue.length === 0) {
      toast({
        title: 'No Eligible Contracts',
        description: 'Add contract prices to primary contracts (not work orders) before creating SOVs.',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('project_type')
        .eq('id', projectId)
        .single();
      
      if (!project) throw new Error('Project not found');
      
      // Get scope details
      const { data: scope } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      const scopeDetails = scope as ProjectScopeDetails | null;
      const stories = scopeDetails?.stories || scopeDetails?.floors || 2;
      const homeType = scopeDetails?.home_type || null;
      const templateKey = getTemplateKeyForProject(project.project_type, homeType);
      
      // Generate master item list
      const itemNames = await generateItemsFromTemplate(templateKey, stories, scopeDetails);
      
      // Calculate default percent (even distribution)
      const defaultPercent = parseFloat((100 / itemNames.length).toFixed(2));
      // Adjust last item to ensure total = 100
      const lastItemPercent = parseFloat((100 - (defaultPercent * (itemNames.length - 1))).toFixed(2));
      
      // Delete only PRIMARY contract SOVs for this project (not work order SOVs)
      // Work order SOVs are managed separately by the work order finalization process
      const primaryContractIds = contractsWithValue.map(c => c.id);
      const existingPrimarySovs = sovs.filter(s => primaryContractIds.includes(s.contract_id));
      const existingSovIds = existingPrimarySovs.map(s => s.id);
      
      if (existingSovIds.length > 0) {
        await supabase.from('project_sov_items').delete().in('sov_id', existingSovIds);
        await supabase.from('project_sov').delete().in('id', existingSovIds);
      }
      
      // Create SOV for each contract WITH value
      for (const contract of contractsWithValue) {
        const sovName = getContractDisplayName(contract.from_role, contract.to_role, contract.from_org_name, contract.to_org_name);
        
        // Create SOV record
        const { data: newSov, error: sovError } = await supabase
          .from('project_sov')
          .insert({
            project_id: projectId,
            contract_id: contract.id,
            sov_name: sovName,
            created_from_template_key: templateKey
          })
          .select()
          .single();
        
        if (sovError) throw sovError;
        
        // Create SOV items with percentages
        const itemsToInsert = itemNames.map((name, index) => {
          const percent = index === itemNames.length - 1 ? lastItemPercent : defaultPercent;
          const value = Math.round((contract.contract_sum * percent / 100) * 100) / 100;
          
          return {
            project_id: projectId,
            sov_id: newSov.id,
            sort_order: index,
            item_name: name,
            percent_of_contract: percent,
            value_amount: value,
            source: 'template' as const
          };
        });
        
        const { error: itemsError } = await supabase
          .from('project_sov_items')
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }
      
      toast({
        title: 'SOVs Created',
        description: `Created ${contractsWithValue.length} SOV(s) with ${itemNames.length} items each.`
      });
      
      await fetchData();
    } catch (error: any) {
      console.error('Error creating SOVs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create SOVs',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, contracts, sovs, generateItemsFromTemplate, fetchData]);

  // Update item percent (and recalculate value)
  const updateItemPercent = useCallback(async (
    sovId: string,
    itemId: string,
    newPercent: number
  ) => {
    const sov = sovs.find(s => s.id === sovId);
    if (!sov) return;
    
    const contract = contracts.find(c => c.id === sov.contract_id);
    if (!contract) return;
    
    const newValue = Math.round((contract.contract_sum * newPercent / 100) * 100) / 100;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_sov_items')
        .update({
          percent_of_contract: newPercent,
          value_amount: newValue
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setSovItems(prev => ({
        ...prev,
        [sovId]: prev[sovId]?.map(item =>
          item.id === itemId
            ? { ...item, percent_of_contract: newPercent, value_amount: newValue }
            : item
        ) || []
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update percentage',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [sovs, contracts]);

  // Update item name
  const updateItemName = useCallback(async (
    sovId: string,
    itemId: string,
    newName: string
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_sov_items')
        .update({ item_name: newName })
        .eq('id', itemId);
      
      if (error) throw error;
      
      setSovItems(prev => ({
        ...prev,
        [sovId]: prev[sovId]?.map(item =>
          item.id === itemId ? { ...item, item_name: newName } : item
        ) || []
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item name',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Add item to SOV (blocked if locked)
  const addItem = useCallback(async (sovId: string, itemName: string) => {
    const sov = sovs.find(s => s.id === sovId);
    if (!sov) return;
    
    // Block if SOV is locked
    if (sov.is_locked) {
      toast({
        title: 'SOV Locked',
        description: 'This SOV is locked and cannot be modified.',
        variant: 'destructive'
      });
      return;
    }
    
    const contract = contracts.find(c => c.id === sov.contract_id);
    if (!contract) return;
    
    const items = sovItems[sovId] || [];
    const sortOrder = items.length;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('project_sov_items')
        .insert({
          project_id: projectId,
          sov_id: sovId,
          sort_order: sortOrder,
          item_name: itemName,
          percent_of_contract: 0,
          value_amount: 0,
          source: 'user'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSovItems(prev => ({
        ...prev,
        [sovId]: [...(prev[sovId] || []), data as ContractSOVItem]
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, sovs, contracts, sovItems]);

  // Delete item from SOV
  const deleteItem = useCallback(async (sovId: string, itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_sov_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      setSovItems(prev => ({
        ...prev,
        [sovId]: prev[sovId]?.filter(item => item.id !== itemId) || []
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Reorder items
  const reorderItems = useCallback(async (sovId: string, reorderedItems: ContractSOVItem[]) => {
    setSaving(true);
    try {
      for (let i = 0; i < reorderedItems.length; i++) {
        await supabase
          .from('project_sov_items')
          .update({ sort_order: i })
          .eq('id', reorderedItems[i].id);
      }
      
      setSovItems(prev => ({
        ...prev,
        [sovId]: reorderedItems.map((item, index) => ({ ...item, sort_order: index }))
      }));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder items',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Calculate totals for a SOV
  const getSOVTotals = useCallback((sovId: string) => {
    const items = sovItems[sovId] || [];
    const totalPercent = items.reduce((sum, item) => sum + (item.percent_of_contract || 0), 0);
    const totalValue = items.reduce((sum, item) => sum + (item.value_amount || 0), 0);
    const totalBilled = items.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);
    const isValid = Math.abs(totalPercent - 100) <= 0.01;
    const remaining = 100 - totalPercent;
    
    return { totalPercent, totalValue, totalBilled, isValid, remaining };
  }, [sovItems]);

  // Delete an entire SOV (only if no items have been billed)
  const deleteSOV = useCallback(async (sovId: string) => {
    const items = sovItems[sovId] || [];
    const hasBilledItems = items.some(item => (item.billed_to_date || 0) > 0);
    
    if (hasBilledItems) {
      toast({
        title: 'Cannot Delete',
        description: 'This SOV has items with billing history and cannot be deleted.',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    try {
      // Delete all items first
      await supabase
        .from('project_sov_items')
        .delete()
        .eq('sov_id', sovId);
      
      // Delete the SOV
      const { error } = await supabase
        .from('project_sov')
        .delete()
        .eq('id', sovId);
      
      if (error) throw error;
      
      // Update local state
      setSovs(prev => prev.filter(s => s.id !== sovId));
      setSovItems(prev => {
        const next = { ...prev };
        delete next[sovId];
        return next;
      });
      
      toast({
        title: 'SOV Deleted',
        description: 'Schedule of Values has been removed.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete SOV',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [sovItems]);

  // Lock/unlock an SOV
  const toggleSOVLock = useCallback(async (sovId: string, lock: boolean) => {
    const sov = sovs.find(s => s.id === sovId);
    if (!sov) return;
    
    // Check totals before locking
    if (lock) {
      const totals = getSOVTotals(sovId);
      if (!totals.isValid) {
        toast({
          title: 'Cannot Lock',
          description: 'SOV percentages must total 100% before locking.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_sov')
        .update({
          is_locked: lock,
          locked_at: lock ? new Date().toISOString() : null,
          locked_by: lock ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', sovId);
      
      if (error) throw error;
      
      // Update local state
      setSovs(prev => prev.map(s =>
        s.id === sovId
          ? { ...s, is_locked: lock, locked_at: lock ? new Date().toISOString() : null }
          : s
      ));
      
      toast({
        title: lock ? 'SOV Locked' : 'SOV Unlocked',
        description: lock
          ? 'This SOV is now locked and cannot be edited.'
          : 'This SOV is now unlocked and can be edited.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lock status',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [sovs, getSOVTotals]);

  return {
    contracts,
    sovs,
    sovItems,
    loading,
    saving,
    hasSOVs: sovs.length > 0,
    createAllSOVs,
    updateItemPercent,
    updateItemName,
    addItem,
    deleteItem,
    deleteSOV,
    reorderItems,
    getSOVTotals,
    toggleSOVLock,
    refresh: fetchData
  };
}
