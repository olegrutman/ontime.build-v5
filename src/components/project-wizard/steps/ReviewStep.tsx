import { Check, Building2, Users, Layout, FileText, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ProjectWizardData, 
  PROJECT_TYPE_LABELS, 
  BUILD_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  FOUNDATION_LABELS,
  FRAMING_METHOD_LABELS 
} from '@/types/project';

interface ReviewStepProps {
  data: ProjectWizardData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalAmount = data.sov_items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Create</h2>
        <p className="text-sm text-muted-foreground">
          Review your project details before creating.
        </p>
      </div>

      {/* Basics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Project Basics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Project Name</p>
              <p className="font-medium">{data.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{PROJECT_TYPE_LABELS[data.project_type]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Build Type</p>
              <p className="font-medium">{BUILD_TYPE_LABELS[data.build_type]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {data.address?.street ? (
                  <>
                    {data.address.street}<br />
                    {data.address.city}, {data.address.state} {data.address.zip}
                  </>
                ) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Structures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Structures ({data.structures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.structures.map((structure) => (
              <Badge key={structure.id} variant="secondary">
                {structure.name} ({STRUCTURE_TYPE_LABELS[structure.type]})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Parties ({data.parties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.parties.length > 0 ? (
            <div className="space-y-2">
              {data.parties.map((party) => (
                <div key={party.org_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{party.org_name}</span>
                    <Badge variant="outline">{party.org_code}</Badge>
                  </div>
                  <Badge>{party.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No parties added</p>
          )}
        </CardContent>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Project Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Floors</p>
              <p className="font-medium">{data.scope.floors || 1}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Foundation</p>
              <p className="font-medium">{FOUNDATION_LABELS[data.scope.foundation || 'slab']}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Framing</p>
              <p className="font-medium">{FRAMING_METHOD_LABELS[data.scope.framing_method || 'stick']}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retainage</p>
              <p className="font-medium">{data.retainage_percent}%</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex flex-wrap gap-1">
            {data.scope.has_stairs && <Badge variant="outline">Stairs</Badge>}
            {data.scope.has_elevator && <Badge variant="outline">Elevator</Badge>}
            {data.mobilization_enabled && <Badge variant="outline">Mobilization</Badge>}
          </div>

          {((data.scope.areas || []).length > 0 || (data.scope.custom_areas || []).length > 0) && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Areas</p>
                <div className="flex flex-wrap gap-1">
                  {[...(data.scope.areas || []), ...(data.scope.custom_areas || [])].map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SOV Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Schedule of Values ({data.sov_items.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.sov_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.code}
                  </Badge>
                  <span>{item.title}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Contract Value</span>
            <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Ready to create */}
      <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Check className="h-5 w-5 text-primary" />
        <p className="text-sm">
          Ready to create project. Click "Create Project" to activate.
        </p>
      </div>
    </div>
  );
}
