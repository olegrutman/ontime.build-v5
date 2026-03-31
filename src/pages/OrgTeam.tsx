import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useOrgTeam } from '@/hooks/useOrgTeam';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ROLE_LABELS,
  ALLOWED_ROLES_BY_ORG_TYPE,
  AppRole,
} from '@/types/organization';
import { Users, Mail, Clock, X, UserPlus, Settings, Check, XCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { MemberDetailDialog } from '@/components/team/MemberDetailDialog';

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  job_title?: string | null;
  profile?: { full_name: string | null; email: string } | null;
}

export default function OrgTeam() {
  const { user, userOrgRoles, refreshUserData, permissions } = useAuth();
  const { members, pendingInvites, loading, sendInvite, cancelInvite, changeRole, updateMemberPermissions, transferAdmin, removeMember, updateMemberJobTitle, refetch } = useOrgTeam();
  const { toast } = useToast();

  const currentOrg = userOrgRoles[0]?.organization;
  const orgType = currentOrg?.type;
  const orgId = currentOrg?.id;
  const isCurrentUserAdmin = userOrgRoles[0]?.is_admin ?? false;
  const canManageTeam = permissions?.canManageOrg ?? false;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [sending, setSending] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(true);
  const [allowJoinRequests, setAllowJoinRequests] = useState(true);
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);

  // Sync selectedMember with refreshed members array to avoid stale data in dialog
  useEffect(() => {
    if (selectedMember) {
      const updated = members.find(m => m.id === selectedMember.id);
      if (updated) setSelectedMember(updated);
    }
  }, [members]);

  const allowedRoles = orgType ? ALLOWED_ROLES_BY_ORG_TYPE[orgType] : [];
  const singleRoleOrg = allowedRoles.length === 1;

  // Fetch join requests and org settings
  const fetchJoinRequests = useCallback(async () => {
    if (!orgId) return;
    setJoinRequestsLoading(true);

    const [reqRes, orgRes] = await Promise.all([
      supabase
        .from('org_join_requests')
        .select('id, user_id, status, created_at, job_title')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('organizations')
        .select('allow_join_requests')
        .eq('id', orgId)
        .single(),
    ]);

    if (orgRes.data) {
      setAllowJoinRequests(orgRes.data.allow_join_requests);
    }

    if (reqRes.data && reqRes.data.length > 0) {
      // Fetch profiles for each request
      const userIds = reqRes.data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map<string, { full_name: string | null; email: string }>();
      (profiles || []).forEach(p => profileMap.set(p.user_id, { full_name: p.full_name, email: p.email }));

      setJoinRequests(reqRes.data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      })));
    } else {
      setJoinRequests([]);
    }

    setJoinRequestsLoading(false);
  }, [orgId]);

  useEffect(() => { fetchJoinRequests(); }, [fetchJoinRequests]);

  // Refresh auth context on mount so recently-approved users see their org data
  useEffect(() => { refreshUserData(); }, []);

  const handleSendInvite = async () => {
    const effectiveRole = singleRoleOrg ? allowedRoles[0] : role;
    if (!email || !effectiveRole) return;
    setSending(true);
    const ok = await sendInvite(email, effectiveRole as AppRole);
    if (ok) {
      setEmail('');
      if (!singleRoleOrg) setRole('');
    }
    setSending(false);
  };

  const handleApproveJoinRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('approve_join_request', { _request_id: requestId });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Team member has been added.' });
      fetchJoinRequests();
      refetch();
    }
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('reject_join_request', { _request_id: requestId });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rejected', description: 'Join request has been declined.' });
      fetchJoinRequests();
    }
  };

  const handleToggleJoinRequests = async (checked: boolean) => {
    if (!orgId) return;
    const { error } = await supabase
      .from('organizations')
      .update({ allow_join_requests: checked })
      .eq('id', orgId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAllowJoinRequests(checked);
    }
  };

  if (loading) {
    return (
      <AppLayout title="My Team">
        <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Team">
      <div className="space-y-6 max-w-3xl">
        {/* Org Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{currentOrg?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization's team members and invitations
          </p>
        </div>

        {/* Organization Settings */}
        <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Organization Settings</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-join">Allow team members to join via search</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, users can find and request to join your organization
                </p>
              </div>
              <Switch
                id="allow-join"
                checked={allowJoinRequests}
                onCheckedChange={handleToggleJoinRequests}
              />
            </div>
          </div>
        </div>

        {/* Join Requests */}
        {joinRequests.length > 0 && (
          <div className="bg-card border border-border rounded-lg border-l-4 border-l-amber-500 px-3.5 py-3.5">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <p className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Join Requests ({joinRequests.length})</p>
              </div>
            </div>
            <div className="space-y-3">
              {joinRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {req.profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.profile?.email}
                      {req.job_title && ` · ${req.job_title}`}
                      {' · Requested '}
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApproveJoinRequest(req.id)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRejectJoinRequest(req.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Current Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => {
              const isSelf = m.user_id === user?.id;
              const showDropdown = !isSelf && allowedRoles.length > 1 && canManageTeam;

              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between py-2 border-b border-border last:border-0 ${
                    isCurrentUserAdmin && !isSelf ? 'cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2' : ''
                  }`}
                  onClick={() => {
                    if (isCurrentUserAdmin || isSelf) setSelectedMember(m);
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {m.profile?.full_name || 'Unknown'}
                      {m.is_admin && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          <ShieldCheck className="h-3 w-3 mr-0.5" />
                          Admin
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.profile?.email}
                      {m.profile?.job_title && ` · ${m.profile.job_title}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {showDropdown ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => {
                          changeRole(m.id, v as AppRole);
                        }}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {m.profile?.job_title || ROLE_LABELS[m.role]}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}
          </CardContent>
        </Card>

        {/* Invite New Member */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              {!singleRoleOrg && (
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={handleSendInvite}
                disabled={!email || (!singleRoleOrg && !role) || sending}
              >
                {sending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Invitations ({pendingInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} · Sent{' '}
                      {format(new Date(inv.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cancelInvite(inv.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <MemberDetailDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
        onUpdatePermissions={updateMemberPermissions}
        onTransferAdmin={transferAdmin}
        onRemoveMember={async (id) => {
          const ok = await removeMember(id);
          if (ok) setSelectedMember(null);
          return ok;
        }}
        onUpdateJobTitle={async (userId, jobTitle) => {
          return updateMemberJobTitle(userId, jobTitle);
        }}
        onAfterTransfer={refreshUserData}
        isCurrentUserAdmin={isCurrentUserAdmin}
        isSelf={selectedMember?.user_id === user?.id}
      />
    </AppLayout>
  );
}
