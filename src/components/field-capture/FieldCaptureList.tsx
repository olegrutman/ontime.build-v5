import { useState } from 'react';
import { Camera, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFieldCaptures, type FieldCapture } from '@/hooks/useFieldCaptures';
import { FieldCaptureCard } from './FieldCaptureCard';
import { FieldCaptureSheet } from './FieldCaptureSheet';

interface FieldCaptureListProps {
  projectId: string;
  organizationId: string;
  date?: string;
  /** Called when user wants to convert a capture to a task */
  onConvert?: (capture: FieldCapture) => void;
}

export function FieldCaptureList({ projectId, organizationId, date, onConvert }: FieldCaptureListProps) {
  const { captures, loading } = useFieldCaptures(projectId, date);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Field Captures</h3>
          {captures.length > 0 && (
            <span className="text-xs text-muted-foreground">({captures.length})</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          className="min-h-[44px] gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Capture
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : captures.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No field captures yet
        </p>
      ) : (
        <div className="space-y-3">
          {captures.map((c) => (
            <FieldCaptureCard key={c.id} capture={c} onConvert={onConvert} />
          ))}
        </div>
      )}

      <FieldCaptureSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={projectId}
        organizationId={organizationId}
      />
    </div>
  );
}
