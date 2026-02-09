import { Building2, Wrench, HardHat, Package, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { PartnerPerson, ORG_TYPE_ORDER } from '@/hooks/usePartnerDirectory';
import type { OrgType } from '@/types/organization';

const ORG_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2 }> = {
  GC: { label: 'General Contractors', icon: Building2 },
  TC: { label: 'Trade Contractors', icon: Wrench },
  FC: { label: 'Field Crews', icon: HardHat },
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
    <div className="space-y-6">
      {ORG_TYPE_ORDER.map((type) => {
        const typePeople = groupedPeople[type];
        if (!typePeople || typePeople.length === 0) return null;

        const config = ORG_TYPE_CONFIG[type];

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <config.icon className="h-4 w-4 text-muted-foreground" />
                {config.label}
                <Badge variant="secondary" className="ml-auto">
                  {typePeople.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {typePeople.map((person) => (
                  <div
                    key={person.key}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{person.name}</p>
                          <RoleBadge orgType={type as OrgType} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{person.email}</p>
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
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
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
