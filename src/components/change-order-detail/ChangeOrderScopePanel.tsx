import { ChangeOrderProject } from '@/types/changeOrderProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Building2, HardHat } from 'lucide-react';

interface ChangeOrderScopePanelProps {
  changeOrder: ChangeOrderProject;
}

export function ChangeOrderScopePanel({ changeOrder }: ChangeOrderScopePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scope Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Materials */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Materials Required</span>
          </div>
          {changeOrder.requires_materials ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Yes</Badge>
              {changeOrder.material_cost_responsibility && (
                <Badge variant="secondary" className="gap-1">
                  {changeOrder.material_cost_responsibility === 'GC' ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      General Contractor
                    </>
                  ) : (
                    <>
                      <HardHat className="w-3 h-3" />
                      Trade Contractor
                    </>
                  )}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>

        {/* Equipment */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Equipment Required</span>
          </div>
          {changeOrder.requires_equipment ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Yes</Badge>
              {changeOrder.equipment_cost_responsibility && (
                <Badge variant="secondary" className="gap-1">
                  {changeOrder.equipment_cost_responsibility === 'GC' ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      General Contractor
                    </>
                  ) : (
                    <>
                      <HardHat className="w-3 h-3" />
                      Trade Contractor
                    </>
                  )}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
