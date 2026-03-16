import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { WorkOrderWizardData } from '@/types/workOrderWizard';
import { FinancialSummaryBar } from '../FinancialSummaryBar';

interface ReviewStepProps {
  data: WorkOrderWizardData;
  isTC: boolean;
  isFC: boolean;
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

export function ReviewStep({ data, isTC, isFC, onJumpToStep }: ReviewStepProps) {
  const laborSummary = useMemo(() => {
    if (data.labor_mode === 'lump_sum') {
      return `Lump sum: $${(data.lump_sum_amount || 0).toLocaleString()}`;
    }
    const rate = data.hourly_rate || 0;
    const hours = data.hours || 0;
    return `${hours} hrs × $${rate}/hr = $${(hours * rate).toLocaleString()}`;
  }, [data]);

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
        {data.location_tags.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">📍 {data.location_tags.join(', ')}</p>
        )}
      </Section>

      {/* Labor */}
      <Section title="Labor" onEdit={() => onJumpToStep('labor')}>
        <p className="text-sm">{laborSummary}</p>
        {data.use_fc_hours_at_tc_rate && (
          <p className="text-xs text-muted-foreground mt-1">FC hours billed at TC rate</p>
        )}
      </Section>

      {/* Materials */}
      {data.materials.length > 0 && (
        <Section title="Materials" onEdit={() => onJumpToStep('materials')}>
          <ul className="space-y-1">
            {data.materials.map(m => {
              const cost = m.quantity * m.unit_cost;
              const billed = cost * (1 + m.markup_percent / 100);
              return (
                <li key={m.tempId} className="text-sm flex items-center justify-between">
                  <span>{m.description || 'Untitled'}</span>
                  <span className="font-mono text-xs">
                    {isTC ? `$${cost.toFixed(0)} → $${billed.toFixed(0)}` : `$${cost.toFixed(0)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Equipment */}
      {data.equipment.length > 0 && (
        <Section title="Equipment" onEdit={() => onJumpToStep('equipment')}>
          <ul className="space-y-1">
            {data.equipment.map(e => {
              const billed = e.cost * (1 + e.markup_percent / 100);
              return (
                <li key={e.tempId} className="text-sm flex items-center justify-between">
                  <span>{e.description || 'Untitled'}</span>
                  <span className="font-mono text-xs">
                    {isTC ? `$${e.cost.toFixed(0)} → $${billed.toFixed(0)}` : `$${e.cost.toFixed(0)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Assign */}
      {(data.assigned_org_id || data.request_fc_input) && (
        <Section title="Assignment" onEdit={() => onJumpToStep('assign')}>
          {data.assigned_org_id && (
            <p className="text-sm">Assigned to TC</p>
          )}
          {data.request_fc_input && data.selected_fc_org_id && (
            <p className="text-sm text-muted-foreground">FC input requested</p>
          )}
        </Section>
      )}

      {/* Financial Summary */}
      <FinancialSummaryBar data={data} isTC={isTC} isFC={isFC} />
    </div>
  );
}
