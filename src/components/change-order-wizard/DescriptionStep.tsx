import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DescriptionStepProps {
  description: string;
  onChange: (description: string) => void;
}

export function DescriptionStep({ description, onChange }: DescriptionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Description</h3>
        <p className="text-sm text-muted-foreground">
          Describe the scope of work in detail. This helps the Trade Contractor understand exactly what needs to be done.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="description">Scope Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what needs to be done, including any specific requirements, dimensions, or materials..."
          value={description}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="resize-none"
        />
      </div>

      <div className="p-4 bg-muted/30 rounded-lg border-dashed border-2">
        <p className="text-sm text-muted-foreground">
          <strong>Tips:</strong>
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
          <li>Be specific about the scope of work</li>
          <li>Include measurements if applicable</li>
          <li>Mention any special conditions or access requirements</li>
          <li>Reference any drawings or photos if available</li>
        </ul>
      </div>
    </div>
  );
}
