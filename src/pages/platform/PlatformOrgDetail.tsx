import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPE_LABELS, ROLE_LABELS, type Organization, type AppRole } from '@/types/organization';
import { format } from 'date-fns';

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
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch profiles for members separately to avoid deep type instantiation
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

      // Fetch projects separately
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

  return (
    <PlatformLayout
      title={org.name}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Organizations', href: '/platform/orgs' },
        { label: org.name },
      ]}
    >
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
    </PlatformLayout>
  );
}
