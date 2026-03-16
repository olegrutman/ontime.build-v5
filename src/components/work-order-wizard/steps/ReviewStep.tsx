import { ChevronRight } from 'lucide-react';
import type { WorkOrderWizardData } from '@/types/workOrderWizard';

interface ReviewStepProps {
  data: WorkOrderWizardData;
  onJumpToStep: (key: string) => void;
}

function Section({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <button onClick={onEdit} className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Edit <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ReviewStep({ data, onJumpToStep }: ReviewStepProps) {
  return (
    <div className="space-y-5">
      {/* Scope */}
      <Section title="Scope" onEdit={() => onJumpToStep('scope')}>
        {data.title && <p className="text-sm font-medium mb-1">{data.title}</p>}
        {data.selectedCatalogItems.length > 0 ? (
          <ul className="space-y-1">
            {data.selectedCatalogItems.map(item => (
              <li key={item.id} className="text-sm flex items-center justify-between">
                <span>{item.item_name}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.unit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No items selected</p>
        )}
        {data.description && (
          <p className="text-sm text-muted-foreground mt-2 italic">"{data.description}"</p>
        )}
      </Section>

      {/* Location */}
      <Section title="Location" onEdit={() => onJumpToStep('location')}>
        {data.location_tags.length > 0 ? (
          <p className="text-sm">📍 {data.location_tags.join(', ')}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No location selected</p>
        )}
      </Section>

      {/* Assignment */}
      <Section title="Assignment" onEdit={() => onJumpToStep('assign')}>
        {data.assigned_org_id ? (
          <p className="text-sm">Assigned to Trade Contractor</p>
        ) : data.request_fc_input && data.selected_fc_org_id ? (
          <p className="text-sm">FC input requested</p>
        ) : data.participant_org_ids.length > 0 ? (
          <p className="text-sm">{data.participant_org_ids.length} participant(s) added</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No assignments yet</p>
        )}
      </Section>

      <div className="rounded-lg border border-muted bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          After creation, assigned parties can open this work order to add labor rates, materials, equipment, and other details.
        </p>
      </div>
    </div>
  );
}
