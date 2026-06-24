import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { sendNotificationEmail } from '@/hooks/useNotificationEmail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, 
  Crown,
  User,
  Loader2,
  Plus,
  Trash2,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_id: string | null;
  company_name: string;
  role_on_project: string;
  is_creator: boolean;
  source: 'member' | 'context_gc' | 'context_fc' | 'context_gc_pending' | 'context_fc_pending';
  is_pending: boolean;
}

interface ProjectTeamManagerProps {
  projectId: string;
  projectName: string;
  createdBy: string;
  counterpartyId?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  'FIELD_CREW': 'Field Crew',
  'TRADE_CONTRACTOR': 'Trade Contractor',
  'GC': 'General Contractor'
};

const ROLE_OPTIONS = [
  { value: 'FIELD_CREW', label: 'Field Crew' },
  { value: 'TRADE_CONTRACTOR', label: 'Trade Contractor' },
  { value: 'GC', label: 'General Contractor' },
] as const;

export default function ProjectTeamManager({
  projectId,
  projectName,
  createdBy
}: ProjectTeamManagerProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('FIELD_CREW');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, [projectId, createdBy]);

  const fetchTeamData = async () => {
    try {
      // Use RPC to fetch all project members with profiles (bypasses RLS issues)
      const { data: members, error } = await supabase
        .rpc('get_project_members_with_profiles', { _project_id: projectId });

      if (error) throw error;

      // Deduplicate by user_id to prevent showing same user twice
      const seenUserIds = new Set<string>();
      const teamList: TeamMember[] = [];
      
      for (const member of (members || [])) {
        // Skip if we've already seen this user (except for context placeholders with null user_id)
        if (member.user_id) {
          if (seenUserIds.has(member.user_id)) {
            continue;
          }
          seenUserIds.add(member.user_id);
        }
        
        teamList.push({
          id: member.member_id,
          user_id: member.user_id,
          company_name: member.company_name || member.email?.split('@')[0] || 'Unknown',
          role_on_project: member.project_role,
          is_creator: member.user_id === createdBy,
          source: member.source as TeamMember['source'],
          is_pending: member.source?.includes('pending') ?? false
        });
      }

      // Sort: creator first, then members, then context parties
      teamList.sort((a, b) => {
        if (a.is_creator) return -1;
        if (b.is_creator) return 1;
        if (a.source === 'member' && b.source !== 'member') return -1;
        if (a.source !== 'member' && b.source === 'member') return 1;
        return 0;
      });

      setTeamMembers(teamList);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setAdding(true);
    try {
      // Look up user by email
      const { data: userId, error: lookupError } = await supabase
        .rpc('get_user_id_by_email', { lookup_email: newMemberEmail.trim().toLowerCase() });

      if (lookupError || !userId) {
        toast.error('No user found with that email address');
        return;
      }

      // Check if already a member in project_members table
      const { data: existingMemberRecord } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMemberRecord) {
        toast.error('This user is already a team member');
        return;
      }

      // Check if there's a pending invitation for this user - if so, mark it as accepted
      const { data: pendingInvitation } = await supabase
        .from('project_invitations')
        .select('id')
        .eq('project_id', projectId)
        .eq('invitee_user_id', userId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (pendingInvitation) {
        // Mark the pending invitation as accepted since we're adding them directly
        await supabase
          .from('project_invitations')
          .update({ status: 'ACCEPTED', responded_at: new Date().toISOString() })
          .eq('id', pendingInvitation.id);
      }

      // Add to project_members
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role_on_project: newMemberRole as 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC',
          added_by_user_id: user!.id,
        });

      if (insertError) {
        // If it's a unique constraint violation, the user was added by another process
        if (insertError.code === '23505') {
          toast.error('This user is already a team member');
          fetchTeamData();
          return;
        }
        throw insertError;
      }

      // Send project invite email
      try {
        // Get inviter's company name
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('company_id, companies(name)')
          .eq('id', user!.id)
          .single();

        await sendNotificationEmail({
          type: 'project_invite',
          recipientEmail: newMemberEmail.trim().toLowerCase(),
          projectName: projectName,
          projectId: projectId,
          senderName: (inviterProfile?.companies as any)?.name || 'A team member'
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }

      toast.success('Team member added successfully');
      setNewMemberEmail('');
      setNewMemberRole('FIELD_CREW');
      setShowAddDialog(false);
      fetchTeamData();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Failed to add team member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Team member removed');
      fetchTeamData();
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast.error(error.message || 'Failed to remove team member');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isCreator = user?.id === createdBy;

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Team Members
            </CardTitle>
            {isCreator && (
              <Button variant="accent" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No team members yet
              </p>
            ) : (
              teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    member.is_pending ? 'bg-muted/20 border border-dashed border-muted-foreground/30' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {member.is_creator ? (
                      <Crown className="h-5 w-5 text-warning" />
                    ) : member.source !== 'member' ? (
                      <Building2 className={`h-5 w-5 ${member.is_pending ? 'text-muted-foreground' : 'text-accent'}`} />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className={`font-medium text-sm ${member.is_pending ? 'text-muted-foreground italic' : ''}`}>
                        {member.company_name}
                      </p>
                      <Badge variant={member.is_pending ? 'outline' : 'secondary'} className="mt-1">
                        {member.is_creator ? 'Creator' : (ROLE_LABELS[member.role_on_project] || member.role_on_project)}
                      </Badge>
                    </div>
                  </div>
                  {isCreator && !member.is_creator && member.source === 'member' && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add an existing user to {projectName} by their email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="team@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role on Project</label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={handleAddMember} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
