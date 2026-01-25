import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LocationData } from '@/types/changeOrderProject';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface TitleStepProps {
  title: string;
  locationData: LocationData;
  onChange: (title: string) => void;
}

export function TitleStep({ title, locationData, onChange }: TitleStepProps) {
  // Generate auto-title from location
  const generateTitle = (): string => {
    const parts: string[] = [];
    if (locationData.room_area) parts.push(locationData.room_area);
    if (locationData.level) parts.push(locationData.level);
    if (locationData.unit) parts.push(`Unit ${locationData.unit}`);
    if (locationData.inside_outside) {
      parts.push(locationData.inside_outside === 'inside' ? 'Interior' : 'Exterior');
    }
    return parts.length > 0 ? parts.join(' - ') : 'New Change Order';
  };

  const suggestedTitle = generateTitle();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Change Order Title</h3>
        <p className="text-sm text-muted-foreground">
          Give this change order a descriptive title, or leave it empty to use the auto-generated title.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="title">Title (Optional)</Label>
        <Input
          id="title"
          placeholder="Enter a custom title..."
          value={title}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Auto-generated title</span>
        </div>
        <Badge variant="secondary" className="text-sm">
          {suggestedTitle}
        </Badge>
        <p className="text-xs text-muted-foreground mt-2">
          If you leave the title empty, this will be used.
        </p>
      </div>
    </div>
  );
}
