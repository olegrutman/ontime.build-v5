import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Route, Undo2 } from 'lucide-react';

export type ZoomLevel = 'day' | 'week' | 'month';

interface GanttToolbarProps {
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  criticalPath: boolean;
  onCriticalPathToggle: () => void;
  undoAvailable: boolean;
  onUndo: () => void;
}

export function GanttToolbar({ zoom, onZoomChange, criticalPath, onCriticalPathToggle, undoAvailable, onUndo }: GanttToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ToggleGroup type="single" value={zoom} onValueChange={v => v && onZoomChange(v as ZoomLevel)} size="sm">
        <ToggleGroupItem value="day" className="text-xs px-2.5">Day</ToggleGroupItem>
        <ToggleGroupItem value="week" className="text-xs px-2.5">Week</ToggleGroupItem>
        <ToggleGroupItem value="month" className="text-xs px-2.5">Month</ToggleGroupItem>
      </ToggleGroup>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={criticalPath ? 'default' : 'outline'}
            size="sm"
            onClick={onCriticalPathToggle}
            className="gap-1.5 text-xs"
          >
            <Route className="h-3.5 w-3.5" />
            Critical Path
          </Button>
        </TooltipTrigger>
        <TooltipContent>Highlight the longest dependency chain</TooltipContent>
      </Tooltip>

      {undoAvailable && (
        <Button variant="outline" size="sm" onClick={onUndo} className="gap-1.5 text-xs animate-in fade-in">
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </Button>
      )}
    </div>
  );
}
