import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, MapPin, Users, Building2, DollarSign, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WizardSummary } from '@/components/setup-wizard-v2/WizardSummary';
import type { BuildingType, Answers, WizardQuestion, SOVLine } from '@/hooks/useSetupWizardV2';

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
  projectId?: string;
}

export function UnifiedReviewStep({
  basics,
  buildingType,
  answers,
  visibleQuestions,
  sovLines,
  projectId,
}: UnifiedReviewStepProps) {
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('id, org_id, role, trade, trade_custom, invited_org_name, invited_email, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

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
                      <Badge variant="outline">
                        {member.trade === 'Other' ? member.trade_custom : member.trade}
                      </Badge>
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
            <p className="text-sm text-muted-foreground">No team members added yet</p>
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
