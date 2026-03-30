import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Helper: create schedule tasks for a list of newly-created SOV items
export async function createScheduleItemsFromSOVItems(
  projectId: string,
  sovItems: { id: string; item_name: string; sort_order: number }[]
) {
  if (!sovItems.length) return;
  const today = new Date().toISOString().split('T')[0];
  const scheduleItems = sovItems.map((item) => ({
    project_id: projectId,
    title: item.item_name,
    item_type: 'task' as const,
    sov_item_id: item.id,
    start_date: today,
    end_date: null,
    progress: 0,
    sort_order: item.sort_order,
    dependency_ids: [],
    work_order_id: null,
    color: null,
    created_by: null,
  }));
  const { error } = await supabase.from('project_schedule_items').insert(scheduleItems);
  if (error) throw error;
}

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
  floor_label: string | null;
  percent_of_contract: number;
  value_amount: number;
  billed_to_date: number;
  total_billed_amount: number;
  total_completion_percent: number;
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
  return `${to} → ${from}`;
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

// Industry-standard percentage weights for SOV items
function getDefaultPercentForItem(itemName: string): number {
  const lower = itemName.toLowerCase();
  
  // Mobilization
  if (lower.includes('mobilization')) return 3;
  
  // Wall framing (highest value - labor intensive)
  if (lower.includes('walls frame') || 
      (lower.includes('walls') && !lower.includes('sheet') && !lower.includes('parapet'))) return 9;
  
  // Sheathing/sheeting
  if (lower.includes('sheat') || lower.includes('sheet')) return 5;
  
  // Subfloor
  if (lower.includes('sub-floor') || lower.includes('subfloor')) return 6;
  
  // Trusses (not sheathing)
  if ((lower.includes('truss') && !lower.includes('sheat') && !lower.includes('sheet')) || 
      lower.includes('roof framing')) return 10;
  
  // Backout/blocking
  if (lower.includes('backout') || lower.includes('blocking')) return 3;
  
  // Fascia and Soffit
  if (lower.includes('fascia') || lower.includes('soffit')) return 4;
  
  // Siding
  if (lower.includes('siding')) return 5;
  
  // Windows
  if (lower.includes('window')) return 4;
  
  // Doors
  if (lower.includes('door')) return 3;
  
  // Decorative
  if (lower.includes('decorative')) return 3;
  
  // Decks
  if (lower.includes('deck')) return 4;
  
  // Tyvek/WRB
  if (lower.includes('tyvek') || lower.includes('wrb')) return 2;
  
  // Hardware
  if (lower.includes('hardware')) return 2;
  
  // Parapet/special structural
  if (lower.includes('parapet')) return 3;
  
  // Inspections
  if (lower.includes('inspection')) return 1;
  
  // Shim and shave
  if (lower.includes('shim')) return 2;
  
  // Final punch
  if (lower.includes('punch') || lower.includes('final')) return 4;
  
  // Basement framing
  if (lower.includes('basement')) return 7;
  
  // Default fallback
  return 5;
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

// Helper: fetch existing SOV items from any SOV on this project (for inheritance)
export async function getExistingSOVItems(projectId: string): Promise<{item_name: string, percent_of_contract: number, sort_order: number}[] | null> {
  const { data: existingSov } = await supabase
    .from('project_sov')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle();
  
  if (!existingSov) return null;
  
  const { data: items } = await supabase
    .from('project_sov_items')
    .select('item_name, percent_of_contract, sort_order')
    .eq('sov_id', existingSov.id)
    .order('sort_order');
  
  return items?.length ? items : null;
}

export function useContractSOV(projectId: string | undefined) {
  const { userOrgRoles, user } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  
  const [contracts, setContracts] = useState<ProjectContract[]>([]);
  const [sovs, setSovs] = useState<ContractSOV[]>([]);
  const [sovItems, setSovItems] = useState<Record<string, ContractSOVItem[]>>({});
  const [templates, setTemplates] = useState<SOVTemplate[]>([]);
  const [sovBillingStatus, setSovBillingStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProjectCreator, setIsProjectCreator] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    
    try {
      // Fetch contracts, SOVs, project creator info, and items in parallel
      const [contractsResult, sovsResult, templatesResult, projectResult] = await Promise.all([
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
          .order('display_name'),
        supabase
          .from('projects')
          .select('created_by')
          .eq('id', projectId)
          .single()
      ]);
      
      const creatorMatch = !!(user && projectResult.data?.created_by === user.id);
      setIsProjectCreator(creatorMatch);
      
      // Map contracts with org names and filter to only contracts where current org is a party
      const fetchedContracts: ProjectContract[] = (contractsResult.data || [])
        .map((c: any) => ({
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
        }))
        // Filter to only contracts where current user's org is a party
        // Project creators see ALL project contracts
        .filter((c: ProjectContract) => 
          creatorMatch || c.from_org_id === currentOrgId || c.to_org_id === currentOrgId
        );
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
        
        // Check billing status for each SOV (has submitted/approved/paid invoices)
        const billingResult = await supabase
          .from('invoices')
          .select('sov_id, status')
          .in('sov_id', fetchedSovs.map(s => s.id))
          .in('status', ['SUBMITTED', 'APPROVED', 'PAID']);
        
        const billingStatus: Record<string, boolean> = {};
        for (const sov of fetchedSovs) {
          billingStatus[sov.id] = (billingResult.data || []).some(inv => inv.sov_id === sov.id);
        }
        setSovBillingStatus(billingStatus);
      } else {
        setSovItems({});
        setSovBillingStatus({});
      }
    } catch (error) {
      console.error('Error fetching SOV data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, currentOrgId]);

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

  // Helper to check if contract is a work order
  const isWorkOrderContract = useCallback((c: ProjectContract) => 
    c.trade === 'Work Order' || c.trade === 'Work Order Labor', []);

  // Calculate contracts that need SOVs (current org is payer, has value, no SOV yet)
  const contractsMissingSOVs = (() => {
    const contractsWithSOVs = new Set(sovs.map(s => s.contract_id).filter(Boolean));
    
    return contracts.filter(c => 
      (c.contract_sum || 0) > 0 &&
      !isWorkOrderContract(c) &&
      (isProjectCreator ? (c.from_org_id === currentOrgId || c.to_org_id === currentOrgId) : c.to_org_id === currentOrgId) &&
      !contractsWithSOVs.has(c.id)     // No SOV exists
    );
  })();

  // Create SOVs for all contracts (only for contracts where current org is PAYER)
  const createAllSOVs = useCallback(async () => {
    if (!projectId || contracts.length === 0) return;
    
    // Filter to only PRIMARY contracts (not work orders) with a contract_sum > 0
    // AND where the current org is the PAYER (to_org_id)
    const contractsWithValue = contracts.filter(c => 
      (c.contract_sum || 0) > 0 && 
      !isWorkOrderContract(c) &&
      (isProjectCreator ? (c.from_org_id === currentOrgId || c.to_org_id === currentOrgId) : c.to_org_id === currentOrgId)
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
      // Check for existing SOV items on this project (inheritance rule)
      const existingItems = await getExistingSOVItems(projectId);
      
      let itemNames: string[];
      let normalizedPercents: number[];
      let templateKey = 'inherited';
      
      if (existingItems) {
        // Inherit from existing SOV
        itemNames = existingItems.map(i => i.item_name);
        normalizedPercents = existingItems.map(i => i.percent_of_contract);
      } else {
        // No existing SOV — generate from template
        const { data: project } = await supabase
          .from('projects')
          .select('project_type')
          .eq('id', projectId)
          .single();
        
        if (!project) throw new Error('Project not found');
        
        const { data: scope } = await supabase
          .from('project_scope_details')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        
        const scopeDetails = scope as ProjectScopeDetails | null;
        const stories = scopeDetails?.stories || scopeDetails?.floors || 2;
        const homeType = scopeDetails?.home_type || null;
        templateKey = getTemplateKeyForProject(project.project_type, homeType);
        
        itemNames = await generateItemsFromTemplate(templateKey, stories, scopeDetails);
        
        const rawPercents = itemNames.map(name => getDefaultPercentForItem(name));
        const totalRaw = rawPercents.reduce((a, b) => a + b, 0);
        
        normalizedPercents = [];
        for (let i = 0; i < rawPercents.length; i++) {
          if (i === rawPercents.length - 1) {
            const sumSoFar = normalizedPercents.reduce((a, b) => a + b, 0);
            normalizedPercents.push(parseFloat((100 - sumSoFar).toFixed(2)));
          } else {
            normalizedPercents.push(parseFloat(((rawPercents[i] / totalRaw) * 100).toFixed(2)));
          }
        }
      }
      
      // Delete only PRIMARY contract SOVs for this project (not work order SOVs)
      // Work order SOVs are managed separately by the work order finalization process
      const primaryContractIds = contractsWithValue.map(c => c.id);
      const existingPrimarySovs = sovs.filter(s => primaryContractIds.includes(s.contract_id));
      const existingSovIds = existingPrimarySovs.map(s => s.id);
      
      if (existingSovIds.length > 0) {
        // Clean up linked schedule tasks before deleting SOV items
        const { data: sovItemIds } = await supabase
          .from('project_sov_items')
          .select('id')
          .in('sov_id', existingSovIds);
        if (sovItemIds?.length) {
          await supabase
            .from('project_schedule_items')
            .delete()
            .in('sov_item_id', sovItemIds.map(i => i.id));
        }
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
        
        // Create SOV items with industry-standard percentages
        const itemsToInsert = itemNames.map((name, index) => {
          const percent = normalizedPercents[index];
          const value = Math.round((contract.contract_sum * percent / 100) * 100) / 100;
          
          return {
            project_id: projectId,
            sov_id: newSov.id,
            sort_order: index,
            item_name: name,
            percent_of_contract: percent,
            value_amount: value,
            floor_label: null,
            source: 'template' as const
          };
        });
        
        const { data: insertedItems, error: itemsError } = await supabase
          .from('project_sov_items')
          .insert(itemsToInsert)
          .select('id, item_name, sort_order');
        
        if (itemsError) throw itemsError;

        // Schedule tasks are now auto-created by database trigger on project_sov_items INSERT
      }
      
      toast({
        title: 'SOVs Created',
        description: `Created ${contractsWithValue.length} SOV(s) with ${itemNames.length} items each, and added them as schedule tasks.`
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
  }, [projectId, contracts, sovs, generateItemsFromTemplate, fetchData, currentOrgId, isWorkOrderContract]);

  // Create SOV for a single contract
  const createSOVForContract = useCallback(async (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract || !projectId) return;
    
    // Verify current org is the payer
    if (contract.to_org_id !== currentOrgId && !isProjectCreator) {
      toast({
        title: 'Cannot Create SOV',
        description: 'Only the payer organization can create an SOV for this contract.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if SOV already exists
    if (sovs.find(s => s.contract_id === contractId)) {
      toast({
        title: 'SOV Already Exists',
        description: 'An SOV already exists for this contract.',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Check for existing SOV items on this project (inheritance rule)
      const existingItems = await getExistingSOVItems(projectId);
      
      let itemNames: string[];
      let normalizedPercents: number[];
      let templateKey = 'inherited';
      
      if (existingItems) {
        // Inherit from existing SOV
        itemNames = existingItems.map(i => i.item_name);
        normalizedPercents = existingItems.map(i => i.percent_of_contract);
      } else {
        // No existing SOV — generate from template
        const { data: project } = await supabase
          .from('projects')
          .select('project_type')
          .eq('id', projectId)
          .single();
        
        if (!project) throw new Error('Project not found');
        
        const { data: scope } = await supabase
          .from('project_scope_details')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        
        const scopeDetails = scope as ProjectScopeDetails | null;
        const stories = scopeDetails?.stories || scopeDetails?.floors || 2;
        const homeType = scopeDetails?.home_type || null;
        templateKey = getTemplateKeyForProject(project.project_type, homeType);
        
        itemNames = await generateItemsFromTemplate(templateKey, stories, scopeDetails);
        
        const rawPercents = itemNames.map(name => getDefaultPercentForItem(name));
        const totalRaw = rawPercents.reduce((a, b) => a + b, 0);
        
        normalizedPercents = [];
        for (let i = 0; i < rawPercents.length; i++) {
          if (i === rawPercents.length - 1) {
            const sumSoFar = normalizedPercents.reduce((a, b) => a + b, 0);
            normalizedPercents.push(parseFloat((100 - sumSoFar).toFixed(2)));
          } else {
            normalizedPercents.push(parseFloat(((rawPercents[i] / totalRaw) * 100).toFixed(2)));
          }
        }
      }
      
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
      
      // Create SOV items with industry-standard percentages
      const itemsToInsert = itemNames.map((name, index) => {
        const percent = normalizedPercents[index];
        const value = Math.round((contract.contract_sum * percent / 100) * 100) / 100;
        
        return {
          project_id: projectId,
          sov_id: newSov.id,
          sort_order: index,
          item_name: name,
          percent_of_contract: percent,
          value_amount: value,
          floor_label: null,
          source: 'template' as const
        };
      });
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from('project_sov_items')
        .insert(itemsToInsert)
        .select('id, item_name, sort_order');
      
      if (itemsError) throw itemsError;

      // Schedule tasks are now auto-created by database trigger on project_sov_items INSERT
      
      toast({
        title: 'SOV Created',
        description: `Created SOV with ${itemNames.length} items for ${sovName}, and added them as schedule tasks.`
      });
      
      await fetchData();
    } catch (error: any) {
      console.error('Error creating SOV:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create SOV',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, contracts, sovs, currentOrgId, generateItemsFromTemplate, fetchData]);

  // Update item percent with auto-redistribution across unlocked lines
  const updateItemPercent = useCallback(async (
    sovId: string,
    itemId: string,
    newPercent: number
  ) => {
    const sov = sovs.find(s => s.id === sovId);
    if (!sov) return;
    
    const contract = contracts.find(c => c.id === sov.contract_id);
    if (!contract) return;

    const items = sovItems[sovId] || [];
    const idx = items.findIndex(i => i.id === itemId);
    if (idx === -1) return;

    const oldPct = items[idx].percent_of_contract || 0;
    const delta = newPercent - oldPct;
    if (Math.abs(delta) < 0.001) return;

    const contractValue = contract.contract_sum;
    const retainagePct = contract.retainage_percent || 0;

    // Build updates array starting with the edited line
    const updates: { id: string; pct: number }[] = [{ id: itemId, pct: newPercent }];

    // Get other unlocked lines
    const unlocked = items.filter((i, j) => j !== idx && !(i as any).is_locked);
    const unlockTotal = unlocked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);

    // First pass: proportionally redistribute delta
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

    // Second pass: redistribute clamped excess across remaining positive lines
    if (clampedExcess > 0) {
      const positiveTotal = rawAdjusted.reduce((s, u) => s + u.pct, 0);
      for (const u of rawAdjusted) {
        if (u.pct > 0 && positiveTotal > 0) {
          u.pct = Math.max(0, u.pct - clampedExcess * (u.pct / positiveTotal));
        }
      }
    }
    updates.push(...rawAdjusted);

    // Normalize: force last entry to absorb rounding remainder
    const locked = items.filter((i, j) => j !== idx && i.is_locked);
    const lockedTotal = locked.reduce((s, i) => s + (i.percent_of_contract || 0), 0);
    const runningTotal = lockedTotal + updates.slice(0, -1).reduce((s, u) => s + u.pct, 0);
    if (updates.length > 0) {
      updates[updates.length - 1].pct = Math.round((100 - runningTotal) * 100) / 100;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_sov_line_percentages', {
        p_updates: updates,
        p_contract_value: contractValue,
        p_retainage_pct: retainagePct,
      });
      
      if (error) throw error;
      
      // Update local state for all affected items
      const updateMap = new Map(updates.map(u => [u.id, u.pct]));
      setSovItems(prev => ({
        ...prev,
        [sovId]: prev[sovId]?.map(item => {
          const newPct = updateMap.get(item.id);
          if (newPct == null) return item;
          const newVal = Math.round((contractValue * newPct / 100) * 100) / 100;
          return { ...item, percent_of_contract: newPct, value_amount: newVal };
        }) || []
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
  }, [sovs, contracts, sovItems]);

  // Update item by dollar amount (converts to % and delegates to updateItemPercent)
  const updateItemAmount = useCallback(async (
    sovId: string,
    itemId: string,
    newAmount: number
  ) => {
    const sov = sovs.find(s => s.id === sovId);
    if (!sov) return;
    
    const contract = contracts.find(c => c.id === sov.contract_id);
    if (!contract || contract.contract_sum <= 0) return;
    
    const newPct = Math.round((newAmount / contract.contract_sum) * 10000) / 100;
    await updateItemPercent(sovId, itemId, newPct);
  }, [sovs, contracts, updateItemPercent]);

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
    const totalBilled = items.reduce((sum, item) => sum + (item.total_billed_amount || 0), 0);
    const isValid = Math.abs(totalPercent - 100) <= 0.01;
    const remaining = 100 - totalPercent;
    
    return { totalPercent, totalValue, totalBilled, isValid, remaining };
  }, [sovItems]);

  // Delete an entire SOV (only if no items have been billed)
  const deleteSOV = useCallback(async (sovId: string) => {
    const items = sovItems[sovId] || [];
    const hasBilledItems = items.some(item => (item.total_billed_amount || 0) > 0);
    
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

  // Check if an SOV has billing activity (submitted/approved/paid invoices)
  const hasBillingActivity = useCallback((sovId: string): boolean => {
    return sovBillingStatus[sovId] || false;
  }, [sovBillingStatus]);

  // AI-powered floor-based SOV generation via edge function
  const [generating, setGenerating] = useState(false);

  const generateSOV = useCallback(async (contractId: string) => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-sov`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, contract_id: contractId }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to generate SOV');
      }
      toast({ title: 'SOV Generated', description: 'AI-powered floor-based SOV created successfully.' });
      await fetchData();
    } catch (error: any) {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [projectId, fetchData]);

  const generateAllSOVs = useCallback(async () => {
    if (!projectId) return;
    const eligible = contractsMissingSOVs.length > 0 ? contractsMissingSOVs : contracts.filter(c =>
      (c.contract_sum || 0) > 0 && !isWorkOrderContract(c)
    );
    for (const c of eligible) {
      await generateSOV(c.id);
    }
  }, [projectId, contracts, contractsMissingSOVs, generateSOV, isWorkOrderContract]);

  return {
    contracts,
    sovs,
    sovItems,
    loading,
    saving,
    generating,
    hasSOVs: sovs.length > 0,
    contractsMissingSOVs,
    createAllSOVs,
    createSOVForContract,
    generateSOV,
    generateAllSOVs,
    updateItemPercent,
    updateItemAmount,
    updateItemName,
    addItem,
    deleteItem,
    deleteSOV,
    reorderItems,
    getSOVTotals,
    toggleSOVLock,
    hasBillingActivity,
    refresh: fetchData
  };
}
