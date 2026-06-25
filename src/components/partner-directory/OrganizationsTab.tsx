import { Building2, Wrench, HardHat, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartnerOrg, ORG_TYPE_ORDER } from '@/hooks/usePartnerDirectory';

const ORG_TYPE_CONFIG: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  GC: { label: 'General Contractors', icon: Building2, color: 'text-blue-600' },
  TC: { label: 'Trade Contractors', icon: Wrench, color: 'text-orange-600' },
  FC: { label: 'Field Crews', icon: HardHat, color: 'text-green-600' },
  SUPPLIER: { label: 'Suppliers', icon: Package, color: 'text-purple-600' },
};

interface OrganizationsTabProps {
  groupedPartners: Record<string, PartnerOrg[]>;
}

export function OrganizationsTab({ groupedPartners }: OrganizationsTabProps) {
  return (
    <div className="space-y-6">
      {ORG_TYPE_ORDER.map((type) => {
        const typePartners = groupedPartners[type];
        if (!typePartners || typePartners.length === 0) return null;

        const config = ORG_TYPE_CONFIG[type];
        const Icon = config.icon;

        return (
          <Card key={type} data-sasha-card="Partner Organization">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                {config.label}
                <Badge variant="secondary" className="ml-auto">
                  {typePartners.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {typePartners.map((partner) => (
                  <div
                    key={partner.org_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{partner.name}</p>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            {partner.org_code}
                          </Badge>
                        </div>
                        {partner.most_recent_project && (
                          <p className="text-xs text-muted-foreground truncate">
                            Last: {partner.most_recent_project}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
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
