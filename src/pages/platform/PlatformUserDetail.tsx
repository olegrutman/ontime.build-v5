import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupportActionDialog } from '@/components/platform/SupportActionDialog';
import { UserProfileCard } from '@/components/platform/UserProfileCard';
import { EditAddressDialog } from '@/components/platform/EditAddressDialog';
import { AssignToOrgDialog } from '@/components/platform/AssignToOrgDialog';
import { UserPermissionsCard } from '@/components/platform/UserPermissionsCard';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS, ORG_TYPE_LABELS, ALLOWED_ROLES_BY_ORG_TYPE, type AppRole, type OrgType, type MemberPermissions } from '@/types/organization';
import { useSupportAction } from '@/hooks/useSupportAction';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { KeyRound, Mail, LogIn, Trash2, Pencil, MapPin, UserPlus, Briefcase, Phone } from 'lucide-react';
import { formatPhone } from '@/lib/formatPhone';
import { getJobTitlesForOrgType } from '@/types/organization';

interface ProfileData {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title: string | null;
  timezone: string | null;
  language: string | null;
  preferred_contact_method: string | null;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
  created_at: string;
}

interface OrgMembership {
  id: string;
  role: AppRole;
  is_admin: boolean;
  organization: { id: string; name: string; type: OrgType };
}

export default function PlatformUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { platformRole } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, MemberPermissions | null>>({});
  const [loading, setLoading] = useState(true);

  const { execute, loading: actionLoading } = useSupportAction();
  const { startImpersonation } = useImpersonation();

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [loginAsOpen, setLoginAsOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailReasonOpen, setChangeEmailReasonOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [assignOrgOpen, setAssignOrgOpen] = useState(false);

  // Role editing state
  const [editingMembership, setEditingMembership] = useState<OrgMembership | null>(null);
  const [editRole, setEditRole] = useState<AppRole | ''>('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [changeRoleReasonOpen, setChangeRoleReasonOpen] = useState(false);

  // Edit profile fields state
  const [editJobTitleOpen, setEditJobTitleOpen] = useState(false);
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editJobTitleReasonOpen, setEditJobTitleReasonOpen] = useState(false);
  const [editPhoneReasonOpen, setEditPhoneReasonOpen] = useState(false);

  const refreshData = async () => {
    if (!userId) return;
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase
        .from('user_org_roles')
        .select('id, role, is_admin, organization:organizations(id, name, type)')
        .eq('user_id', userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data as unknown as ProfileData);
    const mems = (rolesRes.data || []) as unknown as OrgMembership[];
    setMemberships(mems);

    // Fetch permissions for each membership
    if (mems.length > 0) {
      const roleIds = mems.map((m) => m.id);
      const { data: permsData } = await supabase
        .from('member_permissions')
        .select('*')
        .in('user_org_role_id', roleIds);
      const map: Record<string, MemberPermissions | null> = {};
      for (const m of mems) {
        map[m.id] = (permsData || []).find((p: any) => p.user_org_role_id === m.id) as MemberPermissions | null || null;
      }
      setPermissionsMap(map);
    } else {
      setPermissionsMap({});
    }
  };

  useEffect(() => {
    if (!userId) return;
    refreshData().then(() => setLoading(false));
  }, [userId]);

  const handleResetPassword = async (reason: string) => {
    const ok = await execute({ action_type: 'RESET_PASSWORD_LINK', reason, user_id: userId });
    if (ok) setResetPasswordOpen(false);
  };

  const handleChangeEmail = async (reason: string) => {
    const ok = await execute({ action_type: 'CHANGE_USER_EMAIL', reason, user_id: userId, new_email: newEmail });
    if (ok) {
      setChangeEmailReasonOpen(false);
      setChangeEmailOpen(false);
      setNewEmail('');
      refreshData();
    }
  };

  const handleLoginAs = async (reason: string) => {
    setLoginAsOpen(false);
    await startImpersonation(userId!, reason, navigate);
  };

  const handleDeleteUser = async (reason: string) => {
    const ok = await execute({ action_type: 'DELETE_USER', reason, user_id: userId });
    if (ok) {
      setDeleteUserOpen(false);
      navigate('/platform/users');
    }
  };

  const handleChangeRole = async (reason: string) => {
    if (!editingMembership || !editRole) return;
    const ok = await execute({
      action_type: 'CHANGE_USER_ROLE',
      reason,
      user_org_role_id: editingMembership.id,
      new_role: editRole,
      new_is_admin: editIsAdmin,
    });
    if (ok) {
      setChangeRoleReasonOpen(false);
      setEditingMembership(null);
      refreshData();
    }
  };

  const openEditRole = (m: OrgMembership) => {
    setEditingMembership(m);
    setEditRole(m.role);
    setEditIsAdmin(m.is_admin);
  };

  const handleEditJobTitle = async (reason: string) => {
    const ok = await execute({ action_type: 'EDIT_USER_PROFILE', reason, user_id: userId, fields: { job_title: newJobTitle || null } });
    if (ok) {
      setEditJobTitleReasonOpen(false);
      setEditJobTitleOpen(false);
      setNewJobTitle('');
      refreshData();
    }
  };

  const handleEditPhone = async (reason: string) => {
    const ok = await execute({ action_type: 'EDIT_USER_PROFILE', reason, user_id: userId, fields: { phone: newPhone || null } });
    if (ok) {
      setEditPhoneReasonOpen(false);
      setEditPhoneOpen(false);
      setNewPhone('');
      refreshData();
    }
  };

  const handleEditPermissions = async (userOrgRoleId: string, permissions: Partial<MemberPermissions>, reason: string): Promise<boolean> => {
    const ok = await execute({ action_type: 'EDIT_MEMBER_PERMISSIONS', reason, user_org_role_id: userOrgRoleId, permissions });
    if (ok) refreshData();
    return ok;
  };

  const primaryOrgType = memberships[0]?.organization?.type as OrgType | undefined;
  const jobTitles = getJobTitlesForOrgType(primaryOrgType);

  if (loading) {
    return (
      <PlatformLayout title="User Detail">
        <Skeleton className="h-40 w-full" />
      </PlatformLayout>
    );
  }

  if (!profile) {
    return (
      <PlatformLayout title="Not Found">
        <p className="text-muted-foreground">User not found.</p>
      </PlatformLayout>
    );
  }

  const canImpersonate = platformRole === 'PLATFORM_OWNER' || platformRole === 'PLATFORM_ADMIN';
  const canChangeEmail = platformRole === 'PLATFORM_OWNER' || platformRole === 'PLATFORM_ADMIN';
  const canDelete = platformRole === 'PLATFORM_OWNER';
  const isOwner = platformRole === 'PLATFORM_OWNER';

  return (
    <PlatformLayout
      title={profile.full_name || profile.email}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Users', href: '/platform/users' },
        { label: profile.full_name || profile.email },
      ]}
    >
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => setResetPasswordOpen(true)}>
          <KeyRound className="h-4 w-4 mr-1" /> Reset Password
        </Button>
        {canChangeEmail && (
          <Button variant="outline" size="sm" onClick={() => setChangeEmailOpen(true)}>
            <Mail className="h-4 w-4 mr-1" /> Change Email
          </Button>
        )}
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setEditAddressOpen(true)}>
            <MapPin className="h-4 w-4 mr-1" /> Edit Address
          </Button>
        )}
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => { setNewJobTitle(profile.job_title || ''); setEditJobTitleOpen(true); }}>
            <Briefcase className="h-4 w-4 mr-1" /> Edit Job Title
          </Button>
        )}
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => { setNewPhone(profile.phone || ''); setEditPhoneOpen(true); }}>
            <Phone className="h-4 w-4 mr-1" /> Edit Phone
          </Button>
        )}
        {canImpersonate && (
          <Button variant="outline" size="sm" onClick={() => setLoginAsOpen(true)}>
            <LogIn className="h-4 w-4 mr-1" /> Login As
          </Button>
        )}
        {canDelete && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteUserOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete User
          </Button>
        )}
      </div>

      <UserProfileCard profile={profile} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Organization Memberships</CardTitle>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setAssignOrgOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Assign to Org
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organization memberships</p>
          ) : (
            <div className="space-y-3">
              {memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{m.organization?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ORG_TYPE_LABELS[m.organization?.type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                    {m.is_admin && (
                      <Badge className="text-xs bg-primary/10 text-primary border-0">Admin</Badge>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditRole(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserPermissionsCard
        memberships={memberships}
        permissionsMap={permissionsMap}
        isOwner={isOwner}
        onSave={handleEditPermissions}
        actionLoading={actionLoading}
      />

      {/* Dialogs */}
      <SupportActionDialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen} title="Reset Password" description={`Generate a password recovery link for ${profile.email}.`} onConfirm={handleResetPassword} loading={actionLoading} />

      <Dialog open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change User Email</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Current Email</Label>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <Label htmlFor="new-email">New Email</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeEmailOpen(false)}>Cancel</Button>
            <Button onClick={() => { setChangeEmailOpen(false); setChangeEmailReasonOpen(true); }} disabled={!newEmail || !newEmail.includes('@')}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportActionDialog open={changeEmailReasonOpen} onOpenChange={setChangeEmailReasonOpen} title="Change User Email" description={`Change email from ${profile.email} to ${newEmail}.`} onConfirm={handleChangeEmail} loading={actionLoading} />
      <SupportActionDialog open={loginAsOpen} onOpenChange={setLoginAsOpen} title="Login As User" description={`You will be logged in as ${profile.email}. Session expires after 30 minutes.`} onConfirm={handleLoginAs} loading={actionLoading} />
      <SupportActionDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen} title="Delete User" description={`Permanently delete ${profile.email} and all associated data. This cannot be undone.`} onConfirm={handleDeleteUser} loading={actionLoading} />

      <EditAddressDialog open={editAddressOpen} onOpenChange={setEditAddressOpen} userId={profile.user_id} currentAddress={profile.address} onSaved={(addr) => setProfile((p) => p ? { ...p, address: addr } : p)} />
      <AssignToOrgDialog open={assignOrgOpen} onOpenChange={setAssignOrgOpen} userId={profile.user_id} userEmail={profile.email} onAssigned={refreshData} />

      {/* Edit Role Dialog */}
      <Dialog open={!!editingMembership && !changeRoleReasonOpen} onOpenChange={(open) => { if (!open) setEditingMembership(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Role</DialogTitle></DialogHeader>
          {editingMembership && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Organization: <span className="font-medium text-foreground">{editingMembership.organization?.name}</span></p>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(ALLOWED_ROLES_BY_ORG_TYPE[editingMembership.organization?.type] || []).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editIsAdmin} onCheckedChange={setEditIsAdmin} id="edit-admin" />
                <Label htmlFor="edit-admin">Organization Admin</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMembership(null)}>Cancel</Button>
            <Button onClick={() => setChangeRoleReasonOpen(true)} disabled={!editRole}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportActionDialog open={changeRoleReasonOpen} onOpenChange={setChangeRoleReasonOpen} title="Change User Role" description={`Change role to ${ROLE_LABELS[editRole as AppRole] || editRole}${editIsAdmin ? ' (Admin)' : ''} in ${editingMembership?.organization?.name || 'organization'}.`} onConfirm={handleChangeRole} loading={actionLoading} />

      {/* Edit Job Title Dialog */}
      <Dialog open={editJobTitleOpen} onOpenChange={setEditJobTitleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Job Title</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Current Job Title</Label>
            <p className="text-sm text-muted-foreground">{profile.job_title || '(none)'}</p>
            <Label htmlFor="new-job-title">New Job Title</Label>
            <Select value={newJobTitle} onValueChange={setNewJobTitle}>
              <SelectTrigger><SelectValue placeholder="Select job title" /></SelectTrigger>
              <SelectContent>
                {jobTitles.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJobTitleOpen(false)}>Cancel</Button>
            <Button onClick={() => { setEditJobTitleOpen(false); setEditJobTitleReasonOpen(true); }}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SupportActionDialog open={editJobTitleReasonOpen} onOpenChange={setEditJobTitleReasonOpen} title="Edit Job Title" description={`Change job title to "${newJobTitle || '(clear)'}".`} onConfirm={handleEditJobTitle} loading={actionLoading} />

      {/* Edit Phone Dialog */}
      <Dialog open={editPhoneOpen} onOpenChange={setEditPhoneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Phone Number</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Current Phone</Label>
            <p className="text-sm text-muted-foreground">{profile.phone || '(none)'}</p>
            <Label htmlFor="new-phone">New Phone</Label>
            <Input id="new-phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(formatPhone(e.target.value))} placeholder="(555)123-4567" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPhoneOpen(false)}>Cancel</Button>
            <Button onClick={() => { setEditPhoneOpen(false); setEditPhoneReasonOpen(true); }}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SupportActionDialog open={editPhoneReasonOpen} onOpenChange={setEditPhoneReasonOpen} title="Edit Phone Number" description={`Change phone to "${newPhone || '(clear)'}".`} onConfirm={handleEditPhone} loading={actionLoading} />
    </PlatformLayout>
  );
}
