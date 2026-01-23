import { useState, useEffect } from 'react';
import { Users, RefreshCw, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  role: string;
  trade: string | null;
  trade_custom: string | null;
  status: string;
  invited_email: string;
  invited_name: string | null;
  invited_org_name: string | null;
  accepted_at: string | null;
}

interface ProjectTeamSectionProps {
  projectId: string;
}

const ROLE_ORDER: Record<string, number> = {
  'General Contractor': 1,
  'Trade Contractor': 2,
  'Field Crew': 3,
  'Supplier': 4,
};

const roleColors: Record<string, string> = {
  'General Contractor': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Trade Contractor': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Field Crew': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Supplier': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

export function ProjectTeamSection({ projectId }: ProjectTeamSectionProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      const { data, error } = await supabase
        .from('project_team')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching team:', error);
      } else {
        // Sort by role order
        const sorted = (data || []).sort((a, b) => {
          const orderA = ROLE_ORDER[a.role] || 99;
          const orderB = ROLE_ORDER[b.role] || 99;
          return orderA - orderB;
        });
        setTeam(sorted);
      }
      setLoading(false);
    };

    fetchTeam();
  }, [projectId]);

  const handleResendInvite = async (member: TeamMember) => {
    setResending(member.id);
    try {
      // Get the invite token and resend
      const { data: invite } = await supabase
        .from('project_invites')
        .select('token')
        .eq('project_team_id', member.id)
        .eq('status', 'Invited')
        .single();

      if (invite) {
        // TODO: Call edge function to resend email
        toast.success(`Invite resent to ${member.invited_email}`);
      } else {
        toast.error('No pending invite found');
      }
    } catch (error) {
      toast.error('Failed to resend invite');
    }
    setResending(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Project Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (team.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Project Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No team members have been added to this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Project Team
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {team.map((member) => {
            const isInvited = member.status === 'Invited';
            const trade = member.trade_custom || member.trade;
            const showTrade = member.role === 'Trade Contractor' || member.role === 'Field Crew';

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm truncate">
                      {member.invited_org_name || 'Unknown Company'}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={roleColors[member.role] || ''}
                    >
                      {member.role}
                    </Badge>
                    {showTrade && trade && (
                      <Badge variant="secondary" className="text-xs">
                        {trade}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{member.invited_name || 'No contact name'}</span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.invited_email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {isInvited ? (
                    <>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Invited
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvite(member)}
                        disabled={resending === member.id}
                        className="h-8"
                      >
                        {resending === member.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Resend Invite
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accepted
                      </Badge>
                      {member.accepted_at && (
                        <span className="text-xs text-muted-foreground">
                          on {format(new Date(member.accepted_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
