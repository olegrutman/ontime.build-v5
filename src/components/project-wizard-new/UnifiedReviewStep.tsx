import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, MapPin, Users, FileText, Shield, Building2 } from 'lucide-react';
import { WizardSummary } from '@/components/setup-wizard-v2/WizardSummary';
import type { BuildingType, Answers, WizardQuestion, SOVLine } from '@/hooks/useSetupWizardV2';
import type { TeamMember } from '@/types/projectWizard';

interface ProjectBasicsData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  startDate?: string;
}

interface UnifiedReviewStepProps {
  basics: ProjectBasicsData;
  buildingType: BuildingType | null;
  answers: Answers;
  visibleQuestions: WizardQuestion[];
  sovLines: SOVLine[];
  team: TeamMember[];
  creatorOrgName?: string;
  creatorRole?: string | null;
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
}: UnifiedReviewStepProps) {
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

      {/* Scope Summary */}
      {buildingType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Scope & Contract
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

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Project Team ({1 + team.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Owner */}
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

          {/* Invited members */}
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
