import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, MapPin, Users, FileText, DollarSign, ArrowUp, ArrowDown, Building2, Home, Layers, Mountain, PaintBucket } from 'lucide-react';
import { NewProjectWizardData, TeamRole, ProjectContract } from '@/types/projectWizard';
import { supabase } from '@/integrations/supabase/client';

interface ProjectTeamMember {
  id: string;
  org_id: string | null;
  role: string;
  trade: string | null;
  trade_custom: string | null;
  invited_org_name: string | null;
  invited_email: string | null;
  status: string;
}

interface ReviewStepProps {
  data: NewProjectWizardData;
  creatorRole?: TeamRole;
}

export function ReviewStepNew({ data, creatorRole = 'General Contractor' }: ReviewStepProps) {
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch team members from database
  const fetchTeamMembers = useCallback(async () => {
    if (!data.projectId) return;
    
    setLoading(true);
    try {
      const { data: dbData, error } = await supabase
        .from('project_team')
        .select('id, org_id, role, trade, trade_custom, invited_org_name, invited_email, status')
        .eq('project_id', data.projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setTeamMembers(dbData || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }, [data.projectId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getTradeDisplay = (member: ProjectTeamMember) => {
    return member.trade === 'Other' ? member.trade_custom : member.trade;
  };

  // Helper functions for formatting scope details
  const formatFoundation = () => {
    if (!data.scope.foundationType) return null;
    if (data.scope.foundationType === 'Basement') {
      const parts = [data.scope.basementType, data.scope.basementFinish].filter(Boolean);
      return parts.length > 0 
        ? `Basement (${parts.join(', ')})` 
        : 'Basement';
    }
    return data.scope.foundationType;
  };

  const formatElevator = () => {
    if (!data.scope.hasElevator) return null;
    return data.scope.shaftType 
      ? `Yes (${data.scope.shaftType} shaft)` 
      : 'Yes';
  };

  const formatRoofDeck = () => {
    if (!data.scope.hasRoofDeck) return null;
    return data.scope.roofDeckType || 'Yes';
  };

  const formatBalconies = () => {
    if (!data.scope.hasBalconies) return null;
    return data.scope.balconyType || 'Yes';
  };

  const formatDecking = () => {
    if (!data.scope.deckingIncluded) return null;
    return data.scope.deckingType || 'Yes';
  };

  const formatSiding = () => {
    if (!data.scope.sidingIncluded) return null;
    const materials = data.scope.sidingMaterials;
    if (materials && materials.length > 0) {
      return materials.join(', ');
    }
    return 'Included';
  };

  const formatFasciaSoffit = () => {
    if (!data.scope.fasciaIncluded && !data.scope.soffitIncluded) return null;
    return data.scope.fasciaSoffitMaterial || 'Included';
  };

  const formatDecorative = () => {
    const items = data.scope.decorativeItems;
    if (!items || items.length === 0) return null;
    return items.join(', ');
  };

  // Check if sections have data
  const hasStructureDetails = data.scope.homeType || data.scope.floors || data.scope.foundationType;
  const hasBuildingBasics = data.scope.numBuildings || data.scope.stories || data.scope.constructionType;
  const hasUnitDetails = data.scope.numUnits || data.scope.storiesPerUnit || data.scope.hasSharedWalls;
  const hasStairsOrElevator = data.scope.stairsType || data.scope.hasElevator;
  const hasRoofDetails = data.scope.roofType || data.scope.hasRoofDeck;
  const hasExteriorFeatures = data.scope.hasCoveredPorches || data.scope.hasBalconies || data.scope.deckingIncluded;
  const hasFinishes = data.scope.sidingIncluded || data.scope.fasciaIncluded || data.scope.soffitIncluded || formatDecorative() || 
    data.scope.windowsIncluded || data.scope.wrbIncluded || data.scope.extDoorsIncluded;

  // Separate upstream (GC) and downstream (FC/TC) contracts for TC creators
  const upstreamGC = teamMembers.find(m => m.role === 'General Contractor');
  const upstreamContract = upstreamGC 
    ? data.contracts.find(c => c.toTeamMemberId === upstreamGC.id)
    : null;

  const downstreamMembers = teamMembers.filter(m => 
    m.role === 'Field Crew' || m.role === 'Trade Contractor' || m.role === 'Supplier'
  );
  const downstreamContracts = data.contracts.filter(c => 
    downstreamMembers.some(m => m.id === c.toTeamMemberId)
  );

  const isTC = creatorRole === 'Trade Contractor';

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
            Project Team ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{member.invited_org_name || 'Unknown Company'}</p>
                    <p className="text-muted-foreground">{member.invited_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    {member.trade && (
                      <Badge variant="outline">{getTradeDisplay(member)}</Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={member.status === 'Accepted' 
                        ? 'text-green-600 border-green-600' 
                        : 'text-yellow-600 border-yellow-600'
                      }
                    >
                      {member.status}
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
        <CardContent className="space-y-4">
          {/* Structure Details */}
          {hasStructureDetails && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Home className="h-3 w-3" />
                Structure
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                {data.scope.homeType && (
                  <div>
                    <p className="text-muted-foreground text-xs">Home Type</p>
                    <p className="font-medium">{data.scope.homeType}</p>
                  </div>
                )}
                {data.scope.floors && (
                  <div>
                    <p className="text-muted-foreground text-xs">Floors</p>
                    <p className="font-medium">{data.scope.floors}</p>
                  </div>
                )}
                {formatFoundation() && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Foundation</p>
                    <p className="font-medium">{formatFoundation()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Building Basics (for multi-family) */}
          {hasBuildingBasics && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  Building Basics
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {data.scope.numBuildings && (
                    <div>
                      <p className="text-muted-foreground text-xs">Buildings</p>
                      <p className="font-medium">{data.scope.numBuildings}</p>
                    </div>
                  )}
                  {data.scope.stories && (
                    <div>
                      <p className="text-muted-foreground text-xs">Stories</p>
                      <p className="font-medium">{data.scope.stories}</p>
                    </div>
                  )}
                  {data.scope.constructionType && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Construction Type</p>
                      <p className="font-medium">
                        {data.scope.constructionType === 'Other' 
                          ? data.scope.constructionTypeOther 
                          : data.scope.constructionType}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Unit Details (for townhomes/duplexes) */}
          {hasUnitDetails && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="h-3 w-3" />
                  Unit Details
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {data.scope.numUnits && (
                    <div>
                      <p className="text-muted-foreground text-xs">Number of Units</p>
                      <p className="font-medium">{data.scope.numUnits}</p>
                    </div>
                  )}
                  {data.scope.storiesPerUnit && (
                    <div>
                      <p className="text-muted-foreground text-xs">Stories per Unit</p>
                      <p className="font-medium">{data.scope.storiesPerUnit}</p>
                    </div>
                  )}
                  {data.scope.hasSharedWalls && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Shared Walls</p>
                      <p className="font-medium">Yes</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Stairs & Elevator */}
          {hasStairsOrElevator && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stairs & Elevator</p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {data.scope.stairsType && (
                    <div>
                      <p className="text-muted-foreground text-xs">Stairs</p>
                      <p className="font-medium">{data.scope.stairsType}</p>
                    </div>
                  )}
                  {formatElevator() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Elevator</p>
                      <p className="font-medium">{formatElevator()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Roof */}
          {hasRoofDetails && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mountain className="h-3 w-3" />
                  Roof
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {data.scope.roofType && (
                    <div>
                      <p className="text-muted-foreground text-xs">Roof Type</p>
                      <p className="font-medium">{data.scope.roofType}</p>
                    </div>
                  )}
                  {formatRoofDeck() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Roof Deck</p>
                      <p className="font-medium">{formatRoofDeck()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Exterior Features */}
          {hasExteriorFeatures && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exterior Features</p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {data.scope.hasCoveredPorches && (
                    <div>
                      <p className="text-muted-foreground text-xs">Covered Porches</p>
                      <p className="font-medium">Yes</p>
                    </div>
                  )}
                  {formatBalconies() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Balconies</p>
                      <p className="font-medium">{formatBalconies()}</p>
                    </div>
                  )}
                  {formatDecking() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Decking</p>
                      <p className="font-medium">{formatDecking()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Finishes Included */}
          {hasFinishes && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <PaintBucket className="h-3 w-3" />
                  Finishes Included
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm pl-4">
                  {formatSiding() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Siding</p>
                      <p className="font-medium">{formatSiding()}</p>
                    </div>
                  )}
                  {formatFasciaSoffit() && (
                    <div>
                      <p className="text-muted-foreground text-xs">Fascia/Soffit</p>
                      <p className="font-medium">{formatFasciaSoffit()}</p>
                    </div>
                  )}
                  {formatDecorative() && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Decorative</p>
                      <p className="font-medium">{formatDecorative()}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pl-4 pt-1">
                  {data.scope.windowsIncluded && <Badge variant="outline" className="text-xs">Windows Install</Badge>}
                  {data.scope.wrbIncluded && <Badge variant="outline" className="text-xs">WRB/Tyvek</Badge>}
                  {data.scope.extDoorsIncluded && <Badge variant="outline" className="text-xs">Exterior Doors</Badge>}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contracts - Split for TC */}
      {isTC && upstreamContract && upstreamGC && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-blue-600" />
              <span>Your Contract with General Contractor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm py-2">
              <div>
                <p className="font-medium">{upstreamGC.invited_org_name}</p>
                <p className="text-muted-foreground">General Contractor</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(upstreamContract.contractSum)}</p>
                <p className="text-muted-foreground text-xs">
                  {upstreamContract.retainagePercent}% retainage
                  {upstreamContract.allowMobilization && ' • Mobilization'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isTC && downstreamContracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-green-600" />
              <span>Your Contracts with Field Crew ({downstreamContracts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {downstreamContracts.map((contract) => {
                const member = teamMembers.find(t => t.id === contract.toTeamMemberId);
                if (!member) return null;
                return (
                  <div key={contract.toTeamMemberId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{member.invited_org_name}</p>
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

      {/* GC view - single contracts card */}
      {!isTC && data.contracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contracts ({data.contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {data.contracts.map((contract) => {
                  const member = teamMembers.find(t => t.id === contract.toTeamMemberId);
                  if (!member) return null;
                  return (
                    <div key={contract.toTeamMemberId} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{member.invited_org_name}</p>
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
            )}
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
