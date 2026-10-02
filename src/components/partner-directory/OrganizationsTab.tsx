import { Building2, Wrench, HardHat, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartnerOrg, ORG_TYPE_ORDER } from '@/hooks/usePartnerDirectory';

const ORG_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  GC: { label: 'General Contractors', icon: Building2, color: 'text-blue-600' },
  TC: { label: 'Subcontractors', icon: Wrench, color: 'text-orange-600' },
  FC: { label: 'Crews', icon: HardHat, color: 'text-green-600' },
  SUPPLIER: { label: 'Suppliers', icon: Package, color: 'text-purple-600' },
};

interface OrganizationsTabProps {
  groupedPartners: Record<string, PartnerOrg[]>;
}

export function OrganizationsTab({ groupedPartners }: OrganizationsTabProps) {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      {ORG_TYPE_ORDER.map((type) => {
        const typePartners = groupedPartners[type];
        if (!typePartners || typePartners.length === 0) return null;

        const config = ORG_TYPE_CONFIG[type];
        const Icon = config.icon;

        return (
          <Card key={type} data-sasha-card="Partner Organization">
            <CardHeader className="px-4 pb-3 sm:px-6">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                {config.label}
                <Badge variant="secondary" className="ml-auto">
                  {typePartners.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0 sm:px-6">
              <div className="space-y-2">
                {typePartners.map((partner) => (
                  <div
                    key={partner.org_id}
                    className="flex min-w-0 flex-col items-start gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words text-sm font-medium">{partner.name}</p>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            {partner.org_code}
                          </Badge>
                        </div>
                        {partner.most_recent_project && (
                          <p className="line-clamp-2 text-xs text-muted-foreground break-words">
                            Last: {partner.most_recent_project}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="ml-12 text-xs text-muted-foreground min-[380px]:ml-3 min-[380px]:shrink-0">
                      {partner.project_count} project{partner.project_count !== 1 ? 's' : ''}
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
