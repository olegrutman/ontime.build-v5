import { MapPin, Settings, ClipboardList, Share2 } from 'lucide-react';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COReasonCode } from '@/types/changeOrder';
import type { COWizardData } from './COWizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StepReviewProps {
  data: COWizardData;
  projectId: string;
}

export function StepReview({ data, projectId }: StepReviewProps) {
  const { data: assignedOrg } = useQuery({
    queryKey: ['org-name', data.assignedToOrgId],
    enabled: !!data.assignedToOrgId,
    queryFn: async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', data.assignedToOrgId)
        .single();
      return org?.name ?? data.assignedToOrgId;
    },
  });

  const { data: fcOrgName } = useQuery({
    queryKey: ['org-name', data.fcOrgId],
    enabled: !!data.fcOrgId,
    queryFn: async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', data.fcOrgId)
        .single();
      return org?.name ?? '';
    },
  });

  // Resolve GC org name (project owner) for responsibility labels
  const { data: projectOrg } = useQuery({
    queryKey: ['project-owner-org', projectId],
    queryFn: async () => {
      const { data: proj } = await supabase
        .from('projects')
        .select('organization_id, organizations:organization_id(name)')
        .eq('id', projectId)
        .single();
      return (proj as any)?.organizations?.name ?? 'GC';
    },
  });

  const { data: coCount } = useQuery({
    queryKey: ['co-count-preview', projectId],
    queryFn: async () => {
      const { count } = await supabase
        .from('change_orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      return (count ?? 0) + 1;
    },
  });

  const coNumberPreview = coCount ? `CO-${String(coCount).padStart(3, '0')} · ${format(new Date(), 'MMM d, yyyy')}` : '...';

  const pricingLabel =
    data.pricingType === 'fixed' ? 'Fixed Price' :
    data.pricingType === 'tm' ? 'Time & Material' : 'Not-to-Exceed';

  return (
    <div className="space-y-5">
      <div className="text-base font-semibold text-foreground">{coNumberPreview}</div>

      <Section icon={Settings} title="Configuration">
        <Row label="Pricing" value={pricingLabel} />
        {data.pricingType === 'nte' && data.nteCap && (
          <Row label="NTE Cap" value={`$${parseFloat(data.nteCap).toLocaleString()}`} />
        )}
        {data.assignedToOrgId && (
          <Row label="Assigned To" value={assignedOrg ?? '...'} />
        )}
         {data.materialsNeeded && (
          <Row label="Materials" value={`Needed · ${data.materialsResponsible === 'TC' ? (assignedOrg ?? 'TC') : data.materialsResponsible === 'GC' ? (projectOrg ?? 'GC') : '—'} responsible${data.materialsOnSite ? ' · On site' : ''}`} />
        )}
        {data.equipmentNeeded && (
          <Row label="Equipment" value={`Needed · ${data.equipmentResponsible === 'TC' ? (assignedOrg ?? 'TC') : data.equipmentResponsible === 'GC' ? (projectOrg ?? 'GC') : '—'} responsible`} />
        )}
        {data.fcInputNeeded && <Row label="Field crew input" value={fcOrgName ? `Requested — ${fcOrgName}` : 'Requested'} />}
      </Section>

      <Section icon={ClipboardList} title="Scope & locations">
        {data.selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items selected</p>
        ) : (
          <ul className="space-y-3">
            {data.selectedItems.map((item) => (
              <li key={item.id} className="space-y-1 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-foreground">{item.item_name}</span>
                  {item.category_name && (
                    <span className="text-xs text-muted-foreground">{item.category_name}</span>
                  )}
                </div>
                {item.locationTag && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{item.locationTag}</span>
                  </div>
                )}
                {item.reason && (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block px-1.5 py-0 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: CO_REASON_COLORS[item.reason as COReasonCode].bg, color: CO_REASON_COLORS[item.reason as COReasonCode].text }}
                    >
                      {CO_REASON_LABELS[item.reason as COReasonCode]}
                    </span>
                    {item.reasonDescription && (
                      <span className="text-xs text-muted-foreground">{item.reasonDescription}</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data.shareDraftNow && (
        <Section icon={Share2} title="Sharing">
          <p className="text-sm text-foreground">Draft will be shared immediately after creation</p>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 kpi-label">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[0.82rem]">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
