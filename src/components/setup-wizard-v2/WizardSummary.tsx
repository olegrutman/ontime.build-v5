import type { Answers, BuildingType, WizardQuestion, SOVLine } from '@/hooks/useSetupWizardV2';
import { BUILDING_TYPES, SOV_PHASE_LABELS, SOV_PHASE_ORDER } from '@/hooks/useSetupWizardV2';

interface Props {
  buildingType: BuildingType;
  answers: Answers;
  visibleQuestions: WizardQuestion[];
  sovLines: SOVLine[];
}

const SECTION_LABELS: Record<string, string> = {
  mobilization_steel: 'Mobilization & Steel',
  per_floor: 'Structure',
  roof: 'Roof',
  envelope: 'Envelope',
  backout: 'Backout & Interior',
  exterior_finish: 'Exterior Finish',
};

function formatAnswer(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'object') {
    if ('enabled' in val) {
      let s = val.enabled ? 'Yes' : 'No';
      if (val.percent) s += ` — ${val.percent}%`;
      if (val.subtype) s += ` — ${val.subtype}`;
      if (val.floors?.length) s += ` (${val.floors.join(', ')})`;
      return s;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

export function WizardSummary({ buildingType, answers, visibleQuestions, sovLines }: Props) {
  const btInfo = BUILDING_TYPES.find(b => b.slug === buildingType);
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;

  // Group questions by phase
  const grouped = new Map<string, WizardQuestion[]>();
  for (const q of visibleQuestions) {
    if (q.fieldKey === 'contract_value') continue; // show separately
    const section = SECTION_LABELS[q.phase] || q.phase;
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section)!.push(q);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">Review & Complete</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review your selections, then save to generate your official SOV.
        </p>
      </div>

      {/* Building type + contract */}
      <div className="p-4 rounded-lg border border-border bg-muted/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{btInfo?.icon}</span>
          <span className="font-heading text-sm font-bold">{btInfo?.label}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Contract value</span>
          <span className="font-mono font-semibold">${contractValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">SOV line items</span>
          <span className="font-mono font-semibold">{sovLines.length}</span>
        </div>
      </div>

      {/* Answers by section */}
      {Array.from(grouped.entries()).map(([section, questions]) => (
        <div key={section} className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section}</h3>
          <div className="rounded-lg border border-border divide-y divide-border">
            {questions.map(q => {
              const val = answers[q.fieldKey];
              if (val === undefined || val === null) return null;
              return (
                <div key={q.fieldKey} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{q.label}</span>
                  <span className="font-medium text-foreground">{formatAnswer(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
