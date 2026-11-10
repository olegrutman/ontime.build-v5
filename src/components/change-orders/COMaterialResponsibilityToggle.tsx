import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';

interface COMaterialResponsibilityToggleProps {
  type: 'material' | 'equipment';
  responsible: 'GC' | 'TC';
  isOverridden: boolean;
  canEdit: boolean;
  isSaving?: boolean;
  onSet: (value: 'GC' | 'TC' | null) => void;
}

export function COMaterialResponsibilityToggle({
  type,
  responsible,
  isOverridden,
  canEdit,
  isSaving = false,
  onSet,
}: COMaterialResponsibilityToggleProps) {
  const rl = useRoleLabelsContext();
  const label = type === 'material' ? 'Materials' : 'Equipment';
  const partyName = (party: 'GC' | 'TC') => (party === 'GC' ? rl.GCShort : rl.TCShort);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        {label} by:
      </span>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-1">
          {(['GC', 'TC'] as const).map(party => (
            <Button
              key={party}
              variant={responsible === party ? 'default' : 'secondary'}
              size="sm"
              type="button"
              aria-label={`${label} supplied by ${partyName(party)}`}
              aria-pressed={responsible === party}
              disabled={isSaving}
              onClick={() => onSet(party)}
              className={cn(
                'h-auto min-h-7 px-2 py-1 rounded text-[10px] font-semibold transition-colors max-w-[10rem] whitespace-normal break-words',
                responsible === party
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {partyName(party)}
            </Button>
          ))}

          {isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => onSet(null)}
              disabled={isSaving}
              aria-label={`Reset ${label.toLowerCase()} responsibility to default`}
              title="Reset to project default"
            >
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      ) : (
        <span className="text-[10px] font-semibold text-foreground">
          {partyName(responsible)}
          {isOverridden && (
            <span className="text-muted-foreground ml-1">(override)</span>
          )}
        </span>
      )}
    </div>
  );
}
