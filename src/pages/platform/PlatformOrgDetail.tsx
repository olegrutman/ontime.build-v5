import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SupportActionDialog } from '@/components/platform/SupportActionDialog';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPE_LABELS, ROLE_LABELS, ALLOWED_ROLES_BY_ORG_TYPE, type Organization, type AppRole, type OrgType } from '@/types/organization';
import { useSupportAction } from '@/hooks/useSupportAction';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { UserPlus, RefreshCw } from 'lucide-react';

interface MemberRow {
  id: string;
  user_id: string;
  role: AppRole;
  is_admin: boolean;
  profile?: { email: string; full_name: string | null } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function PlatformOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { platformRole } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { execute, loading: actionLoading } = useSupportAction();

  // Add Member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<string>('');
  const [addMemberReasonOpen, setAddMemberReasonOpen] = useState(false);

  // Rebuild Permissions dialog
  const [rebuildOpen, setRebuildOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    async function fetch() {
      const orgRes = await supabase.from('organizations').select('*').eq('id', orgId!).single();
      const membersRes = await supabase
        .from('user_org_roles')
        .select('id, user_id, role, is_admin')
        .eq('organization_id', orgId!);
      const projectsRes: { data: any[] | null } = await (supabase
        .from('project_team') as any)
        .select('project_id')
        .eq('organization_id', orgId!)
        .limit(50);

      setOrg(orgRes.data as unknown as Organization);

      const memberRows = (membersRes.data || []) as unknown as MemberRow[];
      if (memberRows.length > 0) {
        const userIds = memberRows.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p]));
        memberRows.forEach((m) => {
          m.profile = (profileMap.get(m.user_id) as any) || null;
        });
      }
      setMembers(memberRows);

      const projectIds = (projectsRes.data || []).map((pt: any) => pt.project_id).filter(Boolean);
      const uniqueProjectIds = [...new Set(projectIds)] as string[];
      if (uniqueProjectIds.length > 0) {
        const { data: projData } = await supabase
          .from('projects')
          .select('id, name, status, created_at')
          .in('id', uniqueProjectIds);
        setProjects((projData || []) as ProjectRow[]);
      } else {
        setProjects([]);
      }
      setLoading(false);
    }
    fetch();
  }, [orgId]);

  const handleAddMember = async (reason: string) => {
    const ok = await execute({
      action_type: 'ADD_MEMBER_NO_VERIFICATION',
      reason,
      organization_id: orgId,
      user_email: memberEmail,
      role: memberRole,
    });
    if (ok) {
      setAddMemberReasonOpen(false);
      setAddMemberOpen(false);
      setMemberEmail('');
      setMemberRole('');
      // Refresh members
      window.location.reload();
    }
  };

  const handleRebuildPermissions = async (reason: string) => {
    const ok = await execute({
      action_type: 'REBUILD_PERMISSIONS',
      reason,
      organization_id: orgId,
    });
    if (ok) setRebuildOpen(false);
  };

  if (loading) {
    return (
      <PlatformLayout title="Organization">
        <Skeleton className="h-40 w-full" />
      </PlatformLayout>
    );
  }

  if (!org) {
    return (
      <PlatformLayout title="Not Found">
        <p className="text-muted-foreground">Organization not found.</p>
      </PlatformLayout>
    );
  }

  const canRebuild = platformRole === 'PLATFORM_OWNER' || platformRole === 'PLATFORM_ADMIN';
  const allowedRoles = ALLOWED_ROLES_BY_ORG_TYPE[org.type] || [];

  return (
    <PlatformLayout
      title={org.name}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Organizations', href: '/platform/orgs' },
        { label: org.name },
      ]}
    >
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add Member (No Verification)
        </Button>
        {canRebuild && (
          <Button variant="outline" size="sm" onClick={() => setRebuildOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rebuild Permissions
          </Button>
        )}
      </div>

      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium">{ORG_TYPE_LABELS[org.type]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="font-medium">{members.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="font-medium">{projects.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{format(new Date(org.created_at), 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => navigate(`/platform/users/${m.user_id}`)}
                >
                  <TableCell>{(m.profile as any)?.full_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{(m.profile as any)?.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.is_admin ? '✓' : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No projects</TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/platform/projects/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Member - step 1: email + role */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member (No Verification)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="member-email">User Email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setAddMemberOpen(false);
                setAddMemberReasonOpen(true);
              }}
              disabled={!memberEmail || !memberRole}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member - step 2: reason */}
      <SupportActionDialog
        open={addMemberReasonOpen}
        onOpenChange={setAddMemberReasonOpen}
        title="Add Member (No Verification)"
        description={`Add ${memberEmail} as ${ROLE_LABELS[memberRole as AppRole] || memberRole} to ${org.name}. This bypasses email verification.`}
        onConfirm={handleAddMember}
        loading={actionLoading}
      />

      {/* Rebuild Permissions */}
      <SupportActionDialog
        open={rebuildOpen}
        onOpenChange={setRebuildOpen}
        title="Rebuild Permissions"
        description={`This will delete and re-create all member_permissions rows for ${org.name}. Permissions will be reset to defaults.`}
        onConfirm={handleRebuildPermissions}
        loading={actionLoading}
      />
    </PlatformLayout>
  );
}
