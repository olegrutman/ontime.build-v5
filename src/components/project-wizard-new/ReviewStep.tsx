import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, MapPin, Users } from 'lucide-react';
import { NewProjectWizardData, TeamRole } from '@/types/projectWizard';
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

  const getTradeDisplay = (member: ProjectTeamMember) => {
    return member.trade === 'Other' ? member.trade_custom : member.trade;
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
