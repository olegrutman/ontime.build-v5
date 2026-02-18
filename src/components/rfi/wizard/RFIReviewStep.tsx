import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Review & Submit</h2>
        <p className="text-muted-foreground text-sm mt-1">Edit the subject and question if needed</p>
      </div>

      {/* Location summary */}
      {locationSummary && (
        <div className="border-l-2 border-primary/50 pl-3 py-2 bg-muted/30 rounded-r-lg">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="font-medium text-sm">{loc.inside_outside === 'inside' ? 'Inside' : 'Outside'} — {locationSummary}</p>
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
