import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { RFIWizardData } from '@/types/rfi';

interface RFIReviewStepProps {
  data: RFIWizardData;
  onChange: (updates: Partial<RFIWizardData>) => void;
}

export function RFIReviewStep({ data, onChange }: RFIReviewStepProps) {
  const loc = data.location_data;
  const locationSummary = loc.inside_outside === 'inside'
    ? [loc.level, loc.unit ? `Unit ${loc.unit}` : null, loc.room_area === 'Other' ? loc.custom_room_area : loc.room_area].filter(Boolean).join(', ')
    : loc.exterior_feature === 'other'
      ? loc.custom_exterior || 'Other'
      : (loc.exterior_feature || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="card-section-title">Review & Submit</h2>
        <p className="text-[0.68rem] text-muted-foreground mt-1">Edit the subject and question if needed</p>
      </div>

      {/* Location summary */}
      {locationSummary && (
        <div className="rounded-lg border bg-card p-3">
          <p className="kpi-label mb-1">Location</p>
          <p className="text-[0.82rem] font-medium text-foreground">{loc.inside_outside === 'inside' ? 'Inside' : 'Outside'} — {locationSummary}</p>
        </div>
      )}

      <div>
        <Label className="mb-2 block">Subject</Label>
        <Input
          value={data.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          className="h-11"
        />
      </div>

      <div>
        <Label className="mb-2 block">Question</Label>
        <Textarea
          value={data.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={6}
        />
      </div>
    </div>
  );
}
