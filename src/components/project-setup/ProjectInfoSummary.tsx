import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { formatCurrency } from '@/lib/utils';
import { Building2, MapPin, Calendar, Users, FileText, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

function formatAnswerValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('enabled' in obj) {
      let s = obj.enabled ? 'Yes' : 'No';
      if (obj.percent) s += ` — ${obj.percent}%`;
      if (obj.subtype) s += ` — ${obj.subtype}`;
      if (Array.isArray(obj.floors) && obj.floors.length) s += ` (${obj.floors.join(', ')})`;
      return s;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Fc /g, 'FC ')
    .replace(/Gc /g, 'GC ')
    .replace(/Tc /g, 'TC ')
    .replace(/Sov /g, 'SOV ');
}

export function ProjectInfoSummary({ projectId }: ProjectInfoSummaryProps) {
  // Fetch project basics
  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project_info_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('name, project_type, build_type, city, state, zip, start_date, address, status')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch setup answers
  const { data: answers = [], isLoading: answersLoading } = useQuery({
    queryKey: ['project_setup_answers_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_setup_answers')
        .select('field_key, value')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['project_contracts_summary', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('from_role, to_role, contract_sum, material_responsibility, retainage_percent, status')
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch team
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

  const isLoading = projLoading || answersLoading || contractsLoading || teamLoading;

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

  // Group answers by section
  const grouped = new Map<string, { key: string; value: unknown }[]>();
  const skipKeys = new Set(['contract_value', 'fc_contract_value', 'material_responsibility', 'building_type']);
  for (const a of answers) {
    if (skipKeys.has(a.field_key)) continue;
    // Derive section from key prefix
    const phase = a.field_key.split('_').slice(0, 2).join('_');
    const section = SECTION_LABELS[phase] || 'Scope';
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section)!.push({ key: a.field_key, value: a.value });
  }

  const address = project?.address as Record<string, string> | null;
  const addressLine = [
    address?.street,
    [project?.city, project?.state].filter(Boolean).join(', '),
    project?.zip,
  ].filter(Boolean).join(' · ');

  return (
    <SurfaceCard>
      <SurfaceCardHeader title="Project Summary" subtitle="Overview of project configuration" />
      <SurfaceCardBody className="space-y-5">
        {/* Basics */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Project Details
          </h4>
          <div className="rounded-lg border border-border divide-y divide-border text-sm">
            {project?.name && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{project.name}</span>
              </div>
            )}
            {project?.project_type && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground capitalize">{project.project_type.replace(/_/g, ' ')}</span>
              </div>
            )}
            {project?.build_type && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Build</span>
                <span className="font-medium text-foreground capitalize">{project.build_type.replace(/_/g, ' ')}</span>
              </div>
            )}
            {addressLine && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                <span className="font-medium text-foreground">{addressLine}</span>
              </div>
            )}
            {project?.start_date && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Start</span>
                <span className="font-medium text-foreground">{new Date(project.start_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contracts */}
        {contracts.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Contracts
            </h4>
            <div className="space-y-2">
              {contracts.map((c, i) => (
                <div key={i} className="rounded-lg border border-border divide-y divide-border text-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Direction</span>
                    <span className="font-medium text-foreground">{c.from_role} → {c.to_role}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Contract Sum</span>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(c.contract_sum)}</span>
                  </div>
                  {c.material_responsibility && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Material Responsibility</span>
                      <span className="font-medium text-foreground">{c.material_responsibility}</span>
                    </div>
                  )}
                  {c.retainage_percent != null && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Retainage</span>
                      <span className="font-medium text-foreground">{c.retainage_percent}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scope Answers */}
        {grouped.size > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Scope Selections
            </h4>
            {Array.from(grouped.entries()).map(([section, items]) => (
              <div key={section} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground ml-1">{section}</p>
                <div className="rounded-lg border border-border divide-y divide-border text-sm">
                  {items.map(({ key, value }) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">{prettifyKey(key)}</span>
                      <span className="font-medium text-foreground">{formatAnswerValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team */}
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
          </div>
        )}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
