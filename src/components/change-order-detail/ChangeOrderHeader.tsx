import { ChangeOrderProject, WORK_TYPE_LABELS, LocationData } from '@/types/changeOrderProject';
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge';
import { MapPin, Hammer, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeOrderHeaderProps {
  changeOrder: ChangeOrderProject;
}

function formatLocation(location: LocationData): string {
  const parts: string[] = [];
  if (location.inside_outside) {
    parts.push(location.inside_outside === 'inside' ? 'Interior' : 'Exterior');
  }
  if (location.level) parts.push(location.level);
  if (location.unit) parts.push(`Unit ${location.unit}`);
  if (location.room_area) parts.push(location.room_area);
  // Add exterior feature for outside locations
  if (location.exterior_feature) {
    const formatted = location.exterior_feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    parts.push(formatted);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No location specified';
}

export function ChangeOrderHeader({ changeOrder }: ChangeOrderHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{changeOrder.title}</h1>
          {changeOrder.project && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{changeOrder.project.name}</span>
            </div>
          )}
        </div>
        <ChangeOrderStatusBadge status={changeOrder.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{formatLocation(changeOrder.location_data)}</span>
        </div>

        {/* Work Type */}
        {changeOrder.work_type && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hammer className="w-4 h-4" />
            <span>{WORK_TYPE_LABELS[changeOrder.work_type]}</span>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(changeOrder.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

    </div>
  );
}
