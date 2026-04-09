import { useState, useEffect } from 'react';
import { resendProjectInvite } from '@/lib/inviteUtils';
import { Users, RefreshCw, Mail, CheckCircle, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
import { DesignateSupplierDialog } from './DesignateSupplierDialog';
import { ROLE_PERMISSIONS, OrgType } from '@/types/organization';
import { cn } from '@/lib/utils';

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

const roleDotColors: Record<string, string> = {
  'General Contractor': 'bg-blue-500',
  'Trade Contractor': 'bg-emerald-500',
  'Field Crew': 'bg-purple-500',
  'Supplier': 'bg-amber-500',
};

const roleAbbreviations: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUP',
};

export function ProjectTeamSection({ projectId }: ProjectTeamSectionProps) {
  const { userOrgRoles } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [designateDialogOpen, setDesignateDialogOpen] = useState(false);
  const [designatedSupplier, setDesignatedSupplier] = useState<{ invited_name: string | null; invited_email: string | null; po_email: string | null; status: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Get current user's org type and permissions
  const currentOrg = userOrgRoles[0]?.organization;
  const currentOrgType = currentOrg?.type as OrgType | undefined;
  const currentRole = userOrgRoles[0]?.role;
  const canInviteMembers = currentRole ? ROLE_PERMISSIONS[currentRole]?.canInviteMembers : false;

  const fetchTeam = async () => {
    const [teamResult, dsResult] = await Promise.all([
      supabase.from('project_team').select('*').eq('project_id', projectId),
      supabase.from('project_designated_suppliers').select('invited_name, invited_email, po_email, status').eq('project_id', projectId).maybeSingle(),
    ]);

    if (teamResult.error) {
      console.error('Error fetching team:', teamResult.error);
    } else {
      const sorted = (teamResult.data || []).sort((a, b) => {
        const orderA = ROLE_ORDER[a.role] || 99;
        const orderB = ROLE_ORDER[b.role] || 99;
        return orderA - orderB;
      });
      setTeam(sorted);
    }
    setDesignatedSupplier(dsResult.data || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [projectId]);

  const hasSupplierOnTeam = team.some(m => m.role === 'Supplier');
  const canDesignateSupplier = canInviteMembers && !hasSupplierOnTeam && (currentOrgType === 'GC' || currentOrgType === 'TC');

  const handleResendInvite = async (member: TeamMember) => {
    setResending(member.id);
    try {
      await resendProjectInvite(projectId, member.id);
      toast.success(`Invite resent to ${member.invited_email || member.invited_org_name}`);
      fetchTeam();
    } catch (error) {
      toast.error('Failed to resend invite');
    }
    setResending(null);
  };

  // Group team by role
  const groupedTeam = team.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, TeamMember[]>);

  const acceptedCount = team.filter(m => m.status === 'Accepted').length;
  const pendingCount = team.filter(m => m.status === 'Invited').length;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="bg-muted/30 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">Team</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {acceptedCount} active{pendingCount > 0 && ` • ${pendingCount} pending`}
                    </p>
                  </div>
                </div>
                {canInviteMembers && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-10 text-sm px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddDialogOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-0">
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">
                  No team members added yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {Object.entries(groupedTeam)
                    .sort(([a], [b]) => (ROLE_ORDER[a] || 99) - (ROLE_ORDER[b] || 99))
                    .map(([role, members]) => (
                      <div key={role} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn("h-2 w-2 rounded-full", roleDotColors[role])} />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {role}
                          </span>
                          <span className="text-xs text-muted-foreground">({members.length})</span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {members.map((member) => {
                            const isInvited = member.status === 'Invited';
                            const trade = member.trade_custom || member.trade;

                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-1.5"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {member.invited_org_name || 'Unknown'}
                                    </span>
                                    {trade && (
                                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                        {trade}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {member.invited_name || member.invited_email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  {isInvited ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-amber-600">Pending</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleResendInvite(member)}
                                        disabled={resending === member.id}
                                        className="h-6 px-2 text-xs"
                                      >
                                        {resending === member.id ? (
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Designated Supplier Section */}
              {canDesignateSupplier && (
                <div className="p-3 border-t">
                  {designatedSupplier && designatedSupplier.status !== 'removed' ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Designated Supplier Contact</p>
                        <p className="text-sm font-medium">{designatedSupplier.invited_name || designatedSupplier.invited_email || 'System Catalog'}</p>
                        <p className="text-xs text-muted-foreground">{designatedSupplier.status === 'invited' ? 'Invitation pending' : 'Active'}</p>
                        {designatedSupplier.po_email && (
                          <p className="text-xs text-muted-foreground">PO → {designatedSupplier.po_email}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setDesignateDialogOpen(true)}>Change</Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDesignateDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Designate Supplier Contact
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      <AddTeamMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        creatorOrgType={currentOrgType || null}
        onMemberAdded={fetchTeam}
      />

      <DesignateSupplierDialog
        open={designateDialogOpen}
        onOpenChange={setDesignateDialogOpen}
        projectId={projectId}
        onDesignated={fetchTeam}
      />
    </>
  );
}
