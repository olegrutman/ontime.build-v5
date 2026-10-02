import { Building2, Wrench, HardHat, Package, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { PartnerPerson, ORG_TYPE_ORDER } from '@/hooks/usePartnerDirectory';
import type { OrgType } from '@/types/organization';

const ORG_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2 }> = {
  GC: { label: 'General Contractors', icon: Building2 },
  TC: { label: 'Subcontractors', icon: Wrench },
  FC: { label: 'Crews', icon: HardHat },
  SUPPLIER: { label: 'Suppliers', icon: Package },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface PeopleTabProps {
  groupedPeople: Record<string, PartnerPerson[]>;
}

export function PeopleTab({ groupedPeople }: PeopleTabProps) {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      {ORG_TYPE_ORDER.map((type) => {
        const typePeople = groupedPeople[type];
        if (!typePeople || typePeople.length === 0) return null;

        const config = ORG_TYPE_CONFIG[type];

        return (
          <Card key={type} data-sasha-card="Partner Contact">
            <CardHeader className="px-4 pb-3 sm:px-6">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <config.icon className="h-4 w-4 text-muted-foreground" />
                {config.label}
                <Badge variant="secondary" className="ml-auto">
                  {typePeople.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0 sm:px-6">
              <div className="space-y-2">
                {typePeople.map((person) => (
                  <div
                    key={person.key}
                    className="flex min-w-0 flex-col items-start gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="min-w-0 break-words text-sm font-medium">{person.name}</p>
                          <RoleBadge orgType={type as OrgType} size="sm" />
                        </div>
                        <p className="break-all text-xs text-muted-foreground">{person.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">{person.org_name}</p>
                          {person.most_recent_project && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <p className="text-xs text-muted-foreground truncate">
                                Last: {person.most_recent_project}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                      <p className="ml-12 text-xs text-muted-foreground min-[380px]:ml-3 min-[380px]:shrink-0">
                      {person.project_count} project{person.project_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
