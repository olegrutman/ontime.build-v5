import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SOVTemplate {
  id: string;
  template_key: string;
  display_name: string;
  description: string | null;
  generator_rules: GeneratorRules;
}

export interface ProjectSOVItem {
  id: string;
  project_id: string;
  sort_order: number;
  item_name: string;
  item_group: string | null;
  default_enabled: boolean;
  source: 'template' | 'user';
  scheduled_value: number;
  billed_to_date: number;
  created_at: string;
}

export interface ProjectSOV {
  id: string;
  project_id: string;
  created_from_template_key: string | null;
  created_at: string;
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

// Map project type to template key
export function getTemplateKeyForProject(
  projectType: string,
  homeType: string | null
): string {
  const normalizedType = projectType?.toLowerCase().replace(/[^a-z]/g, '') || '';
  
  // Handle apartments and condos
  if (normalizedType.includes('apartment') || normalizedType.includes('condo')) {
    return 'APARTMENT_CONDO';
  }
  
  // Handle hotels
  if (normalizedType.includes('hotel')) {
    return 'HOTEL';
  }
  
  // Handle townhomes
  if (normalizedType.includes('townhome') || normalizedType.includes('townhouse')) {
    return 'TOWNHOME';
  }
  
  // Handle duplex
  if (normalizedType.includes('duplex')) {
    return 'DUPLEX';
  }
  
  // Handle single family homes
  if (normalizedType.includes('singlefamily') || normalizedType.includes('residential')) {
    if (homeType === 'Track Home') {
      return 'TRACK_HOME';
    }
    return 'CUSTOM_HOME';
  }
  
  // Default to custom home
  return 'CUSTOM_HOME';
}

// Generate ordinal suffix for floor numbers
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Generate items from story-based template
function generateStoryBasedItems(
  rules: StoryGeneratorRules,
  stories: number,
  scope: ProjectScopeDetails | null
): string[] {
  const items: string[] = [];
  const numStories = Math.max(1, stories);
  
  // Level 1 items
  for (const pattern of rules.story_patterns.level_1) {
    items.push(pattern.replace('{L}', getOrdinal(1)));
  }
  
  // Levels 2 to N
  for (let level = 2; level <= numStories; level++) {
    for (const pattern of rules.story_patterns.levels_2_to_n) {
      items.push(pattern.replace('{L}', getOrdinal(level)));
    }
  }
  
  // Roof items
  items.push(...rules.story_patterns.roof);
  
  // Add roof deck if applicable
  if (scope?.has_roof_deck) {
    items.push('Roof Deck Framing');
  }
  
  // Per-level closeout for all levels
  for (let level = 1; level <= numStories; level++) {
    for (const pattern of rules.story_patterns.per_level_closeout) {
      items.push(pattern.replace('{L}', getOrdinal(level)));
    }
  }
  
  // Global exterior items (filtered by scope)
  for (const item of rules.story_patterns.global_exterior) {
    const lowerItem = item.toLowerCase();
    
    // Filter windows
    if (lowerItem.includes('window') && scope?.windows_included === false) {
      continue;
    }
    
    // Filter WRB/Tyvek
    if ((lowerItem.includes('tyvek') || lowerItem.includes('wrb')) && scope?.wrb_included === false) {
      continue;
    }
    
    // Filter siding
    if (lowerItem.includes('siding') && scope?.siding_included === false) {
      continue;
    }
    
    items.push(item);
  }
  
  // Per-level inspections
  if (rules.defaults.include_per_floor_inspection) {
    for (let level = 1; level <= numStories; level++) {
      for (const pattern of rules.story_patterns.per_level_inspections) {
        items.push(pattern.replace('{L}', getOrdinal(level)));
      }
    }
  }
  
  // Per-level final punch
  if (rules.defaults.include_per_floor_final_punch) {
    for (let level = 1; level <= numStories; level++) {
      for (const pattern of rules.story_patterns.per_level_final_punch) {
        items.push(pattern.replace('{L}', getOrdinal(level)));
      }
    }
  }
  
  return items;
}

// Generate items from static list, filtered by scope
function generateStaticListItems(
  rules: StaticListRules,
  scope: ProjectScopeDetails | null
): string[] {
  const items: string[] = [];
  
  for (const item of rules.items) {
    const lowerItem = item.toLowerCase();
    
    // Filter windows
    if (lowerItem.includes('window') && scope?.windows_included === false) {
      continue;
    }
    
    // Filter siding
    if (lowerItem.includes('siding') && scope?.siding_included === false) {
      continue;
    }
    
    // Filter decks
    if (lowerItem === 'decks' && scope?.decking_included === false) {
      continue;
    }
    
    // Filter fascia and soffit
    if (lowerItem.includes('fascia') || lowerItem.includes('soffit')) {
      if (scope?.fascia_included === false && scope?.soffit_included === false) {
        continue;
      }
    }
    
    // Filter decorative elements
    if (lowerItem.includes('decorative') && scope?.decorative_included === false) {
      continue;
    }
    
    items.push(item);
  }
  
  // Add items based on scope if not already present
  if (scope?.decking_included && !items.some(i => i.toLowerCase() === 'decks')) {
    // Insert before Final Punch if exists, else at end
    const finalPunchIdx = items.findIndex(i => i.toLowerCase().includes('final punch'));
    if (finalPunchIdx >= 0) {
      items.splice(finalPunchIdx, 0, 'Decks');
    } else {
      items.push('Decks');
    }
  }
  
  if ((scope?.fascia_included || scope?.soffit_included) && 
      !items.some(i => i.toLowerCase().includes('fascia'))) {
    const finalPunchIdx = items.findIndex(i => i.toLowerCase().includes('final punch'));
    if (finalPunchIdx >= 0) {
      items.splice(finalPunchIdx, 0, 'Fascia and Soffit');
    } else {
      items.push('Fascia and Soffit');
    }
  }
  
  if (scope?.decorative_included && 
      !items.some(i => i.toLowerCase().includes('decorative'))) {
    const finalPunchIdx = items.findIndex(i => i.toLowerCase().includes('final punch'));
    if (finalPunchIdx >= 0) {
      items.splice(finalPunchIdx, 0, 'Decorative Elements');
    } else {
      items.push('Decorative Elements');
    }
  }
  
  if (scope?.has_roof_deck && !items.some(i => i.toLowerCase().includes('roof deck'))) {
    // Insert after roof items
    const roofIdx = items.findIndex(i => i.toLowerCase().includes('truss'));
    if (roofIdx >= 0) {
      items.splice(roofIdx + 1, 0, 'Roof Deck Framing');
    } else {
      items.push('Roof Deck Framing');
    }
  }
  
  return items;
}

export function useProjectSOV(projectId: string | undefined) {
  const [projectSOV, setProjectSOV] = useState<ProjectSOV | null>(null);
  const [sovItems, setSOVItems] = useState<ProjectSOVItem[]>([]);
  const [templates, setTemplates] = useState<SOVTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('sov_templates')
      .select('*')
      .order('display_name');
    
    if (data) {
      setTemplates(data as unknown as SOVTemplate[]);
    }
  }, []);

  // Fetch existing project SOV and items
  const fetchProjectSOV = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    
    const [sovResult, itemsResult] = await Promise.all([
      supabase
        .from('project_sov')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabase
        .from('project_sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order')
    ]);
    
    if (sovResult.data) {
      setProjectSOV(sovResult.data as ProjectSOV);
    } else {
      setProjectSOV(null);
    }
    
    if (itemsResult.data) {
      setSOVItems(itemsResult.data as ProjectSOVItem[]);
    } else {
      setSOVItems([]);
    }
    
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTemplates();
    fetchProjectSOV();
  }, [fetchTemplates, fetchProjectSOV]);

  // Generate SOV from template
  const generateSOVFromTemplate = useCallback(async (
    templateKey: string,
    stories: number,
    scope: ProjectScopeDetails | null
  ): Promise<string[]> => {
    // Find template
    let template = templates.find(t => t.template_key === templateKey);
    if (!template) {
      // Fetch it directly
      const { data } = await supabase
        .from('sov_templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      if (data) {
        template = data as unknown as SOVTemplate;
      }
    }
    
    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }
    
    const rules = template.generator_rules;
    
    // Handle inherit type
    if (rules.type === 'inherit') {
      const parentItems = await generateSOVFromTemplate(
        rules.inherit_from,
        stories,
        scope
      );
      // Add items at end
      if (rules.add_items_end) {
        parentItems.push(...rules.add_items_end);
      }
      return parentItems;
    }
    
    // Handle static_list type
    if (rules.type === 'static_list') {
      return generateStaticListItems(rules, scope);
    }
    
    // Handle story_generator type
    if (rules.type === 'story_generator') {
      return generateStoryBasedItems(rules, stories, scope);
    }
    
    return [];
  }, [templates]);

  // Create SOV for project
  const createProjectSOV = useCallback(async () => {
    if (!projectId) return;
    
    setSaving(true);
    
    try {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('project_type')
        .eq('id', projectId)
        .single();
      
      if (projectError) throw projectError;
      
      // Get scope details
      const { data: scope } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      const scopeDetails = scope as ProjectScopeDetails | null;
      const stories = scopeDetails?.stories || scopeDetails?.floors || 2;
      const homeType = scopeDetails?.home_type || null;
      
      // Determine template
      const templateKey = getTemplateKeyForProject(project.project_type, homeType);
      
      // Generate items
      const itemNames = await generateSOVFromTemplate(templateKey, stories, scopeDetails);
      
      // Delete existing SOV if any
      if (projectSOV) {
        await supabase.from('project_sov_items').delete().eq('project_id', projectId);
        await supabase.from('project_sov').delete().eq('project_id', projectId);
      }
      
      // Create new project_sov
      const { error: sovError } = await supabase
        .from('project_sov')
        .insert({
          project_id: projectId,
          created_from_template_key: templateKey
        });
      
      if (sovError) throw sovError;
      
      // Create SOV items
      const itemsToInsert = itemNames.map((name, index) => ({
        project_id: projectId,
        sort_order: index,
        item_name: name,
        item_group: null,
        default_enabled: true,
        source: 'template' as const
      }));
      
      const { error: itemsError } = await supabase
        .from('project_sov_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
      
      toast({
        title: 'SOV Created',
        description: `Generated ${itemNames.length} line items from ${templateKey} template.`
      });
      
      // Refresh data
      await fetchProjectSOV();
      
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
  }, [projectId, projectSOV, generateSOVFromTemplate, fetchProjectSOV]);

  // Add new item
  const addItem = useCallback(async (itemName: string, insertAfterIndex?: number) => {
    if (!projectId) return;
    
    setSaving(true);
    
    try {
      // Calculate sort order
      let sortOrder = sovItems.length;
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
        sortOrder = insertAfterIndex + 1;
        // Shift subsequent items
        const itemsToUpdate = sovItems
          .filter(item => item.sort_order >= sortOrder)
          .map(item => ({
            id: item.id,
            sort_order: item.sort_order + 1
          }));
        
        for (const item of itemsToUpdate) {
          await supabase
            .from('project_sov_items')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id);
        }
      }
      
      const { error } = await supabase
        .from('project_sov_items')
        .insert({
          project_id: projectId,
          sort_order: sortOrder,
          item_name: itemName,
          source: 'user'
        });
      
      if (error) throw error;
      
      await fetchProjectSOV();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, sovItems, fetchProjectSOV]);

  // Update item
  const updateItem = useCallback(async (itemId: string, updates: Partial<ProjectSOVItem>) => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('project_sov_items')
        .update(updates)
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setSOVItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('project_sov_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      await fetchProjectSOV();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [fetchProjectSOV]);

  // Reorder items
  const reorderItems = useCallback(async (reorderedItems: ProjectSOVItem[]) => {
    setSaving(true);
    
    try {
      // Update sort orders
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        sort_order: index
      }));
      
      for (const update of updates) {
        await supabase
          .from('project_sov_items')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
      
      setSOVItems(reorderedItems.map((item, index) => ({
        ...item,
        sort_order: index
      })));
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

  return {
    projectSOV,
    sovItems,
    templates,
    loading,
    saving,
    hasSOV: !!projectSOV,
    createProjectSOV,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    refresh: fetchProjectSOV
  };
}
