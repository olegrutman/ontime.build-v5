import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SupportBadgeProps {
  editedAt?: string | null;
  label?: string;
}

export function SupportBadge({ editedAt, label = 'Edited by Ontime Support' }: SupportBadgeProps) {
  return (
    <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary bg-primary/5">
      <Shield className="h-3 w-3" />
      {label}
      {editedAt && (
        <span className="text-muted-foreground ml-1">
          {format(new Date(editedAt), 'MMM d, yyyy')}
        </span>
      )}
    </Badge>
  );
}
