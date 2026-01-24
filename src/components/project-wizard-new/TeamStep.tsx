import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2, User, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { TeamMember, TeamRole } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { supabase } from '@/integrations/supabase/client';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TeamStepProps {
  team: TeamMember[];
  onChange: (team: TeamMember[]) => void;
  creatorRole: string | null;
  projectId?: string;
  creatorOrgType?: OrgType | null;
}

interface ProjectTeamMember {
  id: string;
  org_id: string | null;
  user_id: string | null;
  role: string;
  trade: string | null;
  trade_custom: string | null;
  invited_email: string | null;
  invited_name: string | null;
  invited_org_name: string | null;
  status: string;
  accepted_at: string | null;
  created_at: string;
}

export function TeamStep({ team, onChange, creatorRole, projectId, creatorOrgType }: TeamStepProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch team members from database when projectId exists
  const fetchTeamMembers = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('*')
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

  const handleMemberAdded = () => {
    fetchTeamMembers();
  };

  const handleRemoveMember = async (member: ProjectTeamMember) => {
    if (!projectId) return;
    
    setRemovingId(member.id);
    try {
      // Delete from project_invites first (if exists)
      await supabase
        .from('project_invites')
        .delete()
        .eq('project_team_id', member.id);
      
      // Delete from project_team
      const { error } = await supabase
        .from('project_team')
        .delete()
        .eq('id', member.id);
      
      if (error) throw error;
      
      toast.success('Team member removed');
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Failed to remove team member');
    } finally {
      setRemovingId(null);
    }
  };

  const handleResendInvite = async (member: ProjectTeamMember) => {
    if (!projectId || !user?.id) return;
    
    setResendingId(member.id);
    try {
      // Check if invite exists
      const { data: existingInvite } = await supabase
        .from('project_invites')
        .select('id')
        .eq('project_team_id', member.id)
        .maybeSingle();
      
      if (existingInvite) {
        // Update existing invite with new expiry
        await supabase
          .from('project_invites')
          .update({
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
          })
          .eq('id', existingInvite.id);
      } else {
        // Create new invite
        await supabase.from('project_invites').insert({
          project_id: projectId,
          project_team_id: member.id,
          role: member.role,
          trade: member.trade,
          trade_custom: member.trade_custom,
          invited_email: member.invited_email,
          invited_name: member.invited_name,
          invited_org_name: member.invited_org_name,
          invited_by_user_id: user.id,
        });
      }
      
      toast.success('Invitation resent');
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'default';
      case 'Invited':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // If no projectId yet, show message to complete basics first
  if (!projectId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Project Team</h2>
          <p className="text-sm text-muted-foreground">
            Complete the Project Basics step first to add team members.
          </p>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Next" on the Basics step to continue.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Team</h2>
          <p className="text-sm text-muted-foreground">
            Add team members to invite to this project.
          </p>
        </div>
        
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Team members list */}
      {loading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : teamMembers.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            Team Members ({teamMembers.length})
          </h3>
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{member.invited_org_name || 'Unknown Company'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {member.invited_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {member.invited_name}
                        </span>
                      )}
                      {member.invited_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.invited_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(member.status)}>
                    {member.status}
                  </Badge>
                  <Badge variant="secondary">{member.role}</Badge>
                  {member.trade && (
                    <Badge variant="outline">
                      {member.trade === 'Other' ? member.trade_custom : member.trade}
                    </Badge>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {member.status === 'Invited' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResendInvite(member)}
                        disabled={resendingId === member.id}
                        title="Resend Invite"
                      >
                        {resendingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removingId === member.id}
                      title="Remove"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No team members added yet.</p>
            <p className="text-sm">
              Click "Add Team Member" to search for existing organizations or invite new ones.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Team Member Dialog */}
      <AddTeamMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        creatorOrgType={creatorOrgType || null}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}
