import { MapPin, FileText, Settings, ClipboardList, Share2 } from 'lucide-react';
import { CO_REASON_LABELS } from '@/types/changeOrder';
import type { COWizardData } from './COWizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const pricingLabel =
    data.pricingType === 'fixed' ? 'Fixed Price' :
    data.pricingType === 'tm' ? 'Time & Material' : 'Not-to-Exceed';

  return (
    <div className="space-y-5">
      {data.title && (
        <div className="text-base font-semibold text-foreground">{data.title}</div>
      )}

      <Section icon={FileText} title="Reason">
        <Row label="Code" value={data.reason ? CO_REASON_LABELS[data.reason] : '—'} />
        {data.reasonNote && <Row label="Note" value={data.reasonNote} />}
      </Section>

      <Section icon={Settings} title="Configuration">
        <Row label="Pricing" value={pricingLabel} />
        {data.pricingType === 'nte' && data.nteCap && (
          <Row label="NTE Cap" value={`$${parseFloat(data.nteCap).toLocaleString()}`} />
        )}
        {data.assignedToOrgId && (
          <Row label="Assigned To" value={assignedOrg ?? '...'} />
        )}
        {data.materialsNeeded && (
          <Row label="Materials" value={`Needed · ${data.materialsResponsible ?? '—'} responsible${data.materialsOnSite ? ' · On site' : ''}`} />
        )}
        {data.equipmentNeeded && (
          <Row label="Equipment" value={`Needed · ${data.equipmentResponsible ?? '—'} responsible`} />
        )}
        {data.fcInputNeeded && <Row label="FC Input" value="Requested" />}
      </Section>

      <Section icon={MapPin} title="Location">
        <p className="text-sm text-foreground">{data.locationTags.join(' · ') || '—'}</p>
      </Section>

      <Section icon={ClipboardList} title="Scope">
        {data.selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items selected</p>
        ) : (
          <ul className="space-y-1.5">
            {data.selectedItems.map((item) => (
              <li key={item.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-foreground">{item.item_name}</span>
                {item.category_name && (
                  <span className="text-xs text-muted-foreground">{item.category_name}</span>
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
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
