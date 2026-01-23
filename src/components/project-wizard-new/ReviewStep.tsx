import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, MapPin, Users, FileText, DollarSign } from 'lucide-react';
import { NewProjectWizardData } from '@/types/projectWizard';

interface ReviewStepProps {
  data: NewProjectWizardData;
}

export function ReviewStepNew({ data }: ReviewStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

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
              <p className="font-medium">{data.basics.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Project Type</p>
              <p className="font-medium">{data.basics.projectType || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {data.basics.address}<br />
                {data.basics.city}, {data.basics.state} {data.basics.zip}
              </p>
            </div>
            {data.basics.startDate && (
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{data.basics.startDate}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Project Team ({data.team.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.team.length > 0 ? (
            <div className="space-y-2">
              {data.team.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{member.companyName}</p>
                    <p className="text-muted-foreground">{member.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    {member.trade && (
                      <Badge variant="outline">{member.trade}</Badge>
                    )}
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Invited
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team members added</p>
          )}
        </CardContent>
      </Card>

      {/* Scope Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Scope & Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {data.scope.homeType && (
              <div>
                <p className="text-muted-foreground">Home Type</p>
                <p className="font-medium">{data.scope.homeType}</p>
              </div>
            )}
            {data.scope.floors && (
              <div>
                <p className="text-muted-foreground">Floors</p>
                <p className="font-medium">{data.scope.floors}</p>
              </div>
            )}
            {data.scope.foundationType && (
              <div>
                <p className="text-muted-foreground">Foundation</p>
                <p className="font-medium">{data.scope.foundationType}</p>
              </div>
            )}
            {data.scope.roofType && (
              <div>
                <p className="text-muted-foreground">Roof Type</p>
                <p className="font-medium">{data.scope.roofType}</p>
              </div>
            )}
            {data.scope.stairsType && (
              <div>
                <p className="text-muted-foreground">Stairs</p>
                <p className="font-medium">{data.scope.stairsType}</p>
              </div>
            )}
            {data.scope.numBuildings && (
              <div>
                <p className="text-muted-foreground">Buildings</p>
                <p className="font-medium">{data.scope.numBuildings}</p>
              </div>
            )}
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex flex-wrap gap-1">
            {data.scope.hasElevator && <Badge variant="outline">Elevator</Badge>}
            {data.scope.hasRoofDeck && <Badge variant="outline">Roof Deck</Badge>}
            {data.scope.hasCoveredPorches && <Badge variant="outline">Covered Porches</Badge>}
            {data.scope.hasBalconies && <Badge variant="outline">Balconies</Badge>}
            {data.scope.deckingIncluded && <Badge variant="outline">Decking</Badge>}
            {data.scope.sidingIncluded && <Badge variant="outline">Siding</Badge>}
            {data.scope.windowsIncluded && <Badge variant="outline">Windows Install</Badge>}
            {data.scope.wrbIncluded && <Badge variant="outline">WRB/Tyvek</Badge>}
            {data.scope.extDoorsIncluded && <Badge variant="outline">Exterior Doors</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Contracts */}
      {data.contracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contracts ({data.contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.contracts.map((contract) => {
                const member = data.team.find(t => t.id === contract.toTeamMemberId);
                if (!member) return null;
                return (
                  <div key={contract.toTeamMemberId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{member.companyName}</p>
                      <p className="text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(contract.contractSum)}</p>
                      <p className="text-muted-foreground text-xs">
                        {contract.retainagePercent}% retainage
                        {contract.allowMobilization && ' • Mobilization'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to create */}
      <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Check className="h-5 w-5 text-primary" />
        <p className="text-sm">
          Ready to create project. Click "Create Project" to activate and send invitations.
        </p>
      </div>
    </div>
  );
}
