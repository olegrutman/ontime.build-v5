import { ChangeOrderProject, WORK_TYPE_LABELS, LocationData } from '@/types/changeOrderProject';
import { WorkOrderLocationData } from '@/types/workOrderWizard';
import { ChangeOrderStatusBadge } from './ChangeOrderStatusBadge';
import { MapPin, Hammer, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeOrderHeaderProps {
  changeOrder: ChangeOrderProject;
}

function formatLocation(location: LocationData & Partial<WorkOrderLocationData>): string {
  const parts: string[] = [];
  if (location.inside_outside) {
    parts.push(location.inside_outside === 'inside' ? 'Interior' : 'Exterior');
  }
  // Interior fields
  if (location.level) parts.push(location.level);
  if (location.unit) parts.push(`Unit ${location.unit}`);
  if (location.room_area) parts.push(location.room_area);
  if (location.custom_room_area) parts.push(location.custom_room_area);
  // Exterior fields (from wizard data)
  if (location.exterior_level) parts.push(location.exterior_level);
  if (location.exterior_feature_type) {
    parts.push(location.exterior_feature_type);
  } else if (location.exterior_feature) {
    const formatted = location.exterior_feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    parts.push(formatted);
  }
  if (location.exterior_direction) parts.push(location.exterior_direction);
  if (location.custom_exterior) parts.push(location.custom_exterior);
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

      <div className="flex flex-wrap gap-4 text-base">
        {/* Location */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-5 h-5" />
          <span>{formatLocation(changeOrder.location_data)}</span>
        </div>

        {/* Work Type */}
        {changeOrder.work_type && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hammer className="w-5 h-5" />
            <span>{WORK_TYPE_LABELS[changeOrder.work_type]}</span>
          </div>
        )}

        {/* Created Date */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-5 h-5" />
          <span>{format(new Date(changeOrder.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>

    </div>
  );
}
