import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Users, FileText, Shield, Building2, DollarSign, Hammer } from 'lucide-react';
import { WizardSummary } from '@/components/setup-wizard-v2/WizardSummary';
import { SOVLivePreview } from '@/components/setup-wizard-v2/SOVLivePreview';
import { generateSOVLines } from '@/hooks/useSetupWizardV2';
import type { BuildingType, Answers, WizardQuestion, SOVLine } from '@/hooks/useSetupWizardV2';
import type { TeamMember } from '@/types/projectWizard';
import type { OrgType } from '@/types/organization';
import type { TMBuildingInfo } from './TMBuildingInfoStep';
import { formatCurrency } from '@/lib/utils';

interface ProjectBasicsData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  startDate?: string;
}

export interface UnifiedReviewStepProps {
  basics: ProjectBasicsData;
  buildingType: BuildingType | null;
  answers: Answers;
  visibleQuestions: WizardQuestion[];
  sovLines: SOVLine[];
  team: TeamMember[];
  creatorOrgName?: string;
  creatorRole?: string | null;
  creatorOrgType?: OrgType;
  contractMode?: 'fixed' | 'tm';
  tmBuildingInfo?: TMBuildingInfo;
}

export function UnifiedReviewStep({
  basics,
  buildingType,
  answers,
  visibleQuestions,
  sovLines,
  team,
  creatorOrgName,
  creatorRole,
  creatorOrgType,
  contractMode = 'fixed',
  tmBuildingInfo,
}: UnifiedReviewStepProps) {
  const isTC = creatorOrgType === 'TC';
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
  const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;

  const fcSovLines = useMemo(() => {
    if (!isTC || !buildingType || fcContractValue <= 0) return [];
    return generateSOVLines(buildingType, { ...answers, contract_value: fcContractValue });
  }, [isTC, buildingType, answers, fcContractValue]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Create</h2>
        <p className="text-sm text-muted-foreground">
          Review everything before creating your project.
        </p>
      </div>

      {/* Project Basics */}
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
              <p className="font-medium">{basics.name || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {basics.address}<br />
                {basics.city}, {basics.state} {basics.zip}
              </p>
            </div>
            {basics.startDate && (
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{basics.startDate}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* T&M mode info */}
      {contractMode === 'tm' && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Remodel / Time & Material Project</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No fixed contract value or scope is set. You'll add Work Orders as the project progresses, and the contract total will grow with each approved Work Order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* T&M Building Info */}
      {contractMode === 'tm' && tmBuildingInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hammer className="h-4 w-4" />
              Building Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Material Responsibility</p>
                <p className="font-medium">{tmBuildingInfo.materialResponsibility === 'SPLIT' ? 'Split' : tmBuildingInfo.materialResponsibility}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Building Type</p>
                <p className="font-medium">{tmBuildingInfo.buildingType || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stories</p>
                <p className="font-medium">{tmBuildingInfo.stories}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Foundation</p>
                <p className="font-medium">{tmBuildingInfo.foundationType || '—'}</p>
              </div>
              {tmBuildingInfo.foundationType === 'Basement' && (
                <div>
                  <p className="text-muted-foreground">Basement</p>
                  <p className="font-medium">{tmBuildingInfo.basementType}{tmBuildingInfo.basementFinish ? ` · ${tmBuildingInfo.basementFinish}` : ''}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Garage</p>
                <p className="font-medium">{tmBuildingInfo.garageType}</p>
              </div>
              {tmBuildingInfo.sidingIncluded && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Siding</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {tmBuildingInfo.sidingMaterials.map((m) => (
                      <Badge key={m} variant="outline">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {tmBuildingInfo.totalSqft && (
                <div>
                  <p className="text-muted-foreground">Total Sqft</p>
                  <p className="font-medium">{tmBuildingInfo.totalSqft.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {contractMode !== 'tm' && buildingType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WizardSummary
              buildingType={buildingType}
              answers={answers}
              visibleQuestions={visibleQuestions}
              sovLines={sovLines}
            />
          </CardContent>
        </Card>
      )}

      {/* Contracts & SOV */}
      {contractMode !== 'tm' && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {isTC ? 'Contracts & SOV' : 'Contract & SOV'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={isTC ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
            {/* GC / Primary contract */}
            <div className="space-y-2">
              <div className="text-sm">
                <p className="text-muted-foreground">{isTC ? 'General Contractor → Trade Contractor Contract' : 'Contract Value'}</p>
                <p className="font-medium text-lg">{contractValue > 0 ? formatCurrency(contractValue) : '—'}</p>
              </div>
              {sovLines.length > 0 && (
                <div className="border rounded-lg overflow-hidden max-h-[300px]">
                  <SOVLivePreview lines={sovLines} buildingType={buildingType} />
                </div>
              )}
            </div>

            {/* FC contract (TC only) */}
            {isTC && fcContractValue > 0 && (
              <div className="space-y-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">Trade Contractor → Field Crew Contract</p>
                  <p className="font-medium text-lg">{formatCurrency(fcContractValue)}</p>
                </div>
                {fcSovLines.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-[300px]">
                    <SOVLivePreview lines={fcSovLines} buildingType={buildingType} />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Project Team ({1 + team.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {creatorOrgName && creatorRole && (
            <div className="flex items-center justify-between text-sm py-2 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{creatorOrgName}</p>
                  <p className="text-muted-foreground text-xs">Project Owner</p>
                </div>
              </div>
              <Badge variant="secondary">{creatorRole}</Badge>
            </div>
          )}

          {team.length > 0 ? (
            team.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{member.companyName}</p>
                    <p className="text-muted-foreground text-xs">{member.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  {member.trade && (
                    <Badge variant="outline">
                      {member.trade === 'Other' ? member.tradeCustom : member.trade}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Will be invited
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">No additional team members added.</p>
          )}
        </CardContent>
      </Card>

      {/* Ready */}
      <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Check className="h-5 w-5 text-primary" />
        <p className="text-sm">
          Ready to create project. Click "Create Project" to activate and send invitations.
        </p>
      </div>
    </div>
  );
}
