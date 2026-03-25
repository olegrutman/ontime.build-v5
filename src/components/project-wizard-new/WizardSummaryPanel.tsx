import { NewProjectWizardData } from '@/types/projectWizard';
import { MapPin, Calendar, Users, Building2 } from 'lucide-react';

interface WizardSummaryPanelProps {
  data: NewProjectWizardData;
}

export function WizardSummaryPanel({ data }: WizardSummaryPanelProps) {
  const { basics, team } = data;
  const hasBasics = !!(basics.name || basics.projectType);
  const hasAddress = !!(basics.city && basics.state);
  const hasTeam = team.length > 0;

  if (!hasBasics && !hasTeam) return null;

  // Group team by role
  const roleCounts = team.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Project Summary
      </p>

      {basics.name && (
        <div className="flex items-start gap-2">
          <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{basics.name}</p>
            {basics.projectType && (
              <p className="text-xs text-muted-foreground">{basics.projectType}</p>
            )}
          </div>
        </div>
      )}

      {hasAddress && (
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {[basics.city, basics.state].filter(Boolean).join(', ')}
            {basics.zip ? ` ${basics.zip}` : ''}
          </p>
        </div>
      )}

      {basics.startDate && (
        <div className="flex items-start gap-2">
          <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {new Date(basics.startDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {hasTeam && (
        <div className="flex items-start gap-2">
          <Users className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground">
            {Object.entries(roleCounts).map(([role, count]) => (
              <p key={role}>
                {count} {role}{count > 1 ? 's' : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
