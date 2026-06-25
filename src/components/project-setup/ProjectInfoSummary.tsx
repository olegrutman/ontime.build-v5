import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { formatCurrency } from '@/lib/utils';
import { Building2, MapPin, Calendar, Users, FileText, Layers, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EditableInfoRow } from './EditableInfoRow';

interface ProjectInfoSummaryProps {
  projectId: string;
}

const SECTION_LABELS: Record<string, string> = {
  contract_value: 'Contract',
  fc_contract_value: 'Contract',
  material_responsibility: 'Contract',
  mobilization_steel: 'Mobilization & Steel',
  per_floor: 'Structure',
  roof: 'Roof',
  envelope: 'Envelope',
  backout: 'Backout & Interior',
  exterior_finish: 'Exterior Finish',
};

const PROJECT_TYPE_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

const BUILD_TYPE_OPTIONS = [
  { value: 'new_construction', label: 'New Construction' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'addition', label: 'Addition' },
];

const HOME_TYPE_OPTIONS = [
  { value: 'custom_home', label: 'Custom Home' },
  { value: 'track_home', label: 'Track Home' },
  { value: 'townhomes', label: 'Townhomes' },
  { value: 'apartments_mf', label: 'Apartments / Multifamily' },
  { value: 'hotel_hospitality', label: 'Hotel / Hospitality' },
  { value: 'senior_living', label: 'Senior Living' },
];

const FOUNDATION_OPTIONS = [
  { value: 'slab', label: 'Slab' },
  { value: 'crawl', label: 'Crawl Space' },
  { value: 'basement', label: 'Basement' },
  { value: 'pier', label: 'Pier & Beam' },
];

const GARAGE_OPTIONS = [
  { value: 'attached', label: 'Attached' },
  { value: 'detached', label: 'Detached' },
  { value: 'none', label: 'None' },
];

const MATERIAL_RESP_OPTIONS = [
  { value: 'gc', label: 'GC' },
  { value: 'tc', label: 'TC' },
  { value: 'split', label: 'Split' },
];

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Fc /g, 'FC ').replace(/Gc /g, 'GC ').replace(/Tc /g, 'TC ').replace(/Sov /g, 'SOV ');
}

function detectAnswerType(value: unknown): 'boolean' | 'number' | 'text' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'text';
}

function formatAnswerDisplay(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('enabled' in obj) {
      let s = obj.enabled ? 'Yes' : 'No';
      if (obj.percent) s += ` — ${obj.percent}%`;
      if (obj.subtype) s += ` — ${obj.subtype}`;
      if (Array.isArray(obj.floors) && obj.floors.length) s += ` (${(obj.floors as unknown[]).join(', ')})`;
      return s;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

export function ProjectInfoSummary({ projectId }: ProjectInfoSummaryProps) {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['project_info_summary', projectId] });
    qc.invalidateQueries({ queryKey: ['project_setup_answers_summary', projectId] });
    qc.invalidateQueries({ queryKey: ['project_contracts_summary', projectId] });
    qc.invalidateQueries({ queryKey: ['project_team_summary', projectId] });
    qc.invalidateQueries({ queryKey: ['project_scope_details_summary', projectId] });
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['project_basic', projectId] });
  };

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project_info_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name, project_type, build_type, city, state, zip, start_date, address, status')
        .eq('id', projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: answers = [], isLoading: answersLoading } = useQuery({
    queryKey: ['project_setup_answers_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_setup_answers')
        .select('field_key, value').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['project_contracts_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('id, from_role, to_role, contract_sum, material_responsibility, retainage_percent, status')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ['project_team_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('role, trade, invited_name, invited_org_name, invited_email, status')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: scopeDetails, isLoading: scopeLoading } = useQuery({
    queryKey: ['project_scope_details_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scope_details')
        .select('id, home_type, floors, stories, foundation_type, basement_type, basement_finish, garage_type, siding_included, siding_materials, total_sqft')
        .eq('project_id', projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isLoading = projLoading || answersLoading || contractsLoading || teamLoading || scopeLoading;

  // --- Save handlers ---
  const saveProject = (field: string) => async (val: any) => {
    const payload: Record<string, any> = { [field]: val };
    const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
    if (error) throw error;
    invalidateAll();
  };

  const saveAddress = (field: 'street' | 'city' | 'state' | 'zip') => async (val: any) => {
    if (field === 'city' || field === 'state' || field === 'zip') {
      const { error } = await supabase.from('projects').update({ [field]: val }).eq('id', projectId);
      if (error) throw error;
    } else {
      const current = (project?.address as Record<string, any>) ?? {};
      const nextAddr = { ...current, street: val };
      const { error } = await supabase.from('projects').update({ address: nextAddr }).eq('id', projectId);
      if (error) throw error;
    }
    invalidateAll();
  };

  const saveScope = (field: string) => async (val: any) => {
    if (!scopeDetails?.id) {
      const { error } = await supabase.from('project_scope_details').insert({ project_id: projectId, [field]: val } as any);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('project_scope_details').update({ [field]: val }).eq('id', scopeDetails.id);
      if (error) throw error;
    }
    invalidateAll();
  };

  const saveContract = (contractId: string, field: string) => async (val: any) => {
    const { error } = await supabase.from('project_contracts').update({ [field]: val }).eq('id', contractId);
    if (error) throw error;
    invalidateAll();
  };

  const saveAnswer = (fieldKey: string, originalValue: unknown) => async (val: any) => {
    let nextValue: unknown = val;
    // Preserve object shape for {enabled, percent, ...}
    if (typeof originalValue === 'object' && originalValue !== null && 'enabled' in (originalValue as object)) {
      nextValue = { ...(originalValue as object), enabled: !!val };
    }
    const { error } = await supabase
      .from('project_setup_answers')
      .upsert({ project_id: projectId, field_key: fieldKey, value: nextValue as any }, { onConflict: 'project_id,field_key' });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['project_setup_answers_summary', projectId] });
  };

  if (isLoading) {
    return (
      <SurfaceCard>
        <SurfaceCardBody className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </SurfaceCardBody>
      </SurfaceCard>
    );
  }

  // Group setup answers by section
  const grouped = new Map<string, { key: string; value: unknown }[]>();
  const skipKeys = new Set(['contract_value', 'fc_contract_value', 'gc_tc_contract_value', 'material_responsibility', 'building_type']);
  for (const a of answers) {
    if (skipKeys.has(a.field_key)) continue;
    const phase = a.field_key.split('_').slice(0, 2).join('_');
    const section = SECTION_LABELS[phase] || 'Scope';
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section)!.push({ key: a.field_key, value: a.value });
  }

  const address = project?.address as Record<string, string> | null;

  return (
    <SurfaceCard>
      <SurfaceCardHeader title="Project Information" subtitle="Click any field to edit" />
      <SurfaceCardBody className="space-y-5">
        {/* Project Details */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Project Details
          </h4>
          <div className="rounded-lg border border-border divide-y divide-border">
            <EditableInfoRow label="Name" value={project?.name} type="text" onSave={saveProject('name')} />
            <EditableInfoRow label="Type" value={project?.project_type} type="select" options={PROJECT_TYPE_OPTIONS} onSave={saveProject('project_type')} />
            <EditableInfoRow label="Build" value={project?.build_type} type="select" options={BUILD_TYPE_OPTIONS} onSave={saveProject('build_type')} />
            <EditableInfoRow label="Street" value={address?.street ?? ''} type="text" onSave={saveAddress('street')} placeholder="123 Main St" />
            <EditableInfoRow label="City" value={project?.city} type="text" onSave={saveAddress('city')} />
            <EditableInfoRow label="State" value={project?.state} type="text" onSave={saveAddress('state')} />
            <EditableInfoRow label="Zip" value={project?.zip} type="text" onSave={saveAddress('zip')} />
            <EditableInfoRow label="Start Date" value={project?.start_date} type="date" onSave={saveProject('start_date')} />
          </div>
        </div>

        {/* Building Info */}
        {(scopeDetails || true) && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Building Info
            </h4>
            <div className="rounded-lg border border-border divide-y divide-border">
              <EditableInfoRow label="Building Type" value={scopeDetails?.home_type} type="select" options={HOME_TYPE_OPTIONS} onSave={saveScope('home_type')} />
              <EditableInfoRow label="Stories" value={scopeDetails?.stories ?? scopeDetails?.floors} type="number" onSave={saveScope('stories')} />
              <EditableInfoRow label="Foundation" value={scopeDetails?.foundation_type} type="select" options={FOUNDATION_OPTIONS} onSave={saveScope('foundation_type')} />
              <EditableInfoRow label="Basement Finish" value={scopeDetails?.basement_finish} type="text" onSave={saveScope('basement_finish')} />
              <EditableInfoRow label="Garage" value={scopeDetails?.garage_type} type="select" options={GARAGE_OPTIONS} onSave={saveScope('garage_type')} />
              <EditableInfoRow label="Siding Included" value={!!scopeDetails?.siding_included} type="boolean" onSave={saveScope('siding_included')} />
              <EditableInfoRow label="Total Sqft" value={scopeDetails?.total_sqft} type="number" onSave={saveScope('total_sqft')} />
            </div>
          </div>
        )}

        {/* Contracts */}
        {contracts.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Contracts
            </h4>
            <div className="space-y-2">
              {contracts.map((c) => {
                const locked = c.status === 'approved' || c.status === 'executed';
                return (
                  <div key={c.id} className="rounded-lg border border-border divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Direction</span>
                      <span className="font-medium text-foreground">{c.from_role} → {c.to_role}</span>
                    </div>
                    <EditableInfoRow
                      label="Contract Sum" value={c.contract_sum} type="currency" mono
                      display={<span className="font-mono font-semibold">{formatCurrency(c.contract_sum)}</span>}
                      onSave={saveContract(c.id, 'contract_sum')}
                      locked={locked} lockReason="Contract is approved — unlock by reverting status"
                    />
                    <EditableInfoRow
                      label="Material Responsibility" value={c.material_responsibility} type="select" options={MATERIAL_RESP_OPTIONS}
                      onSave={saveContract(c.id, 'material_responsibility')}
                      locked={locked} lockReason="Contract is approved"
                    />
                    <EditableInfoRow
                      label="Retainage" value={c.retainage_percent} type="percent"
                      onSave={saveContract(c.id, 'retainage_percent')}
                      locked={locked} lockReason="Contract is approved"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scope Selections — editable answers */}
        {grouped.size > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Scope Selections
            </h4>
            {Array.from(grouped.entries()).map(([section, items]) => (
              <div key={section} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground ml-1">{section}</p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {items.map(({ key, value }) => {
                    const isObj = typeof value === 'object' && value !== null && 'enabled' in (value as object);
                    const editType = isObj ? 'boolean' : detectAnswerType(value);
                    const editValue = isObj ? !!(value as any).enabled : value;
                    return (
                      <EditableInfoRow
                        key={key}
                        label={prettifyKey(key)}
                        value={editValue}
                        display={<span>{formatAnswerDisplay(value)}</span>}
                        type={editType}
                        onSave={saveAnswer(key, value)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team — link out, not edited here */}
        {team.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Team
            </h4>
            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              {team.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{m.invited_name || m.invited_org_name || m.invited_email || 'Member'}</span>
                    {m.invited_org_name && m.invited_name && (
                      <span className="text-muted-foreground ml-1.5 text-xs">({m.invited_org_name})</span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                    {m.role}{m.trade ? ` · ${m.trade}` : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground ml-1">Manage team members from the Team tab.</p>
          </div>
        )}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
