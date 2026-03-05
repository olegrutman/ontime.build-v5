import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlatformLayout } from '@/components/platform/PlatformLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SupportActionDialog } from '@/components/platform/SupportActionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useSupportAction } from '@/hooks/useSupportAction';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  address: any;
  created_at: string;
  created_by: string | null;
}

interface TeamMember {
  id: string;
  role: string;
  accepted: boolean;
  organization: { id: string; name: string; type: string } | null;
}

export default function PlatformProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [poCount, setPoCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [woCount, setWoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { execute, loading: actionLoading } = useSupportAction();
  const [forceAcceptOpen, setForceAcceptOpen] = useState(false);
  const [forceAcceptTeamId, setForceAcceptTeamId] = useState<string | null>(null);
  const [forceAcceptOrgName, setForceAcceptOrgName] = useState('');

  const fetchData = async () => {
    if (!projectId) return;
    const [projRes, teamRes, poRes, invRes, woRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase
        .from('project_team')
        .select('id, role, accepted, organization:organizations(id, name, type)')
        .eq('project_id', projectId),
      supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('work_items').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    ]);

    setProject(projRes.data as unknown as ProjectData);
    setTeam((teamRes.data || []) as unknown as TeamMember[]);
    setPoCount(poRes.count || 0);
    setInvoiceCount(invRes.count || 0);
    setWoCount(woRes.count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleForceAccept = async (reason: string) => {
    if (!forceAcceptTeamId) return;
    const ok = await execute({
      action_type: 'FORCE_ACCEPT_PROJECT',
      reason,
      team_id: forceAcceptTeamId,
    });
    if (ok) {
      setForceAcceptOpen(false);
      setForceAcceptTeamId(null);
      fetchData();
    }
  };

  if (loading) {
    return (
      <PlatformLayout title="Project">
        <Skeleton className="h-40 w-full" />
      </PlatformLayout>
    );
  }

  if (!project) {
    return (
      <PlatformLayout title="Not Found">
        <p className="text-muted-foreground">Project not found.</p>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Platform', href: '/platform' },
        { label: 'Projects' },
        { label: project.name },
      ]}
    >
      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className="capitalize mt-1">{project.status}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium text-sm">{format(new Date(project.created_at), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Purchase Orders</p>
            <p className="font-medium text-sm">{poCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoices</p>
            <p className="font-medium text-sm">{invoiceCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Work Orders</p>
            <p className="font-medium text-sm">{woCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team / Participants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No team members</TableCell>
                </TableRow>
              ) : (
                team.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => t.organization && navigate(`/platform/orgs/${t.organization.id}`)}
                  >
                    <TableCell className="font-medium">{t.organization?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={t.accepted ? 'text-xs border-green-500/30 text-green-600' : 'text-xs border-yellow-500/30 text-yellow-600'}
                      >
                        {t.accepted ? 'Accepted' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!t.accepted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForceAcceptTeamId(t.id);
                            setForceAcceptOrgName(t.organization?.name || 'Unknown');
                            setForceAcceptOpen(true);
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Force Accept
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Force Accept Dialog */}
      <SupportActionDialog
        open={forceAcceptOpen}
        onOpenChange={setForceAcceptOpen}
        title="Force Accept Team Member"
        description={`Force-accept ${forceAcceptOrgName}'s participation in ${project.name}. This bypasses the normal invitation acceptance flow.`}
        onConfirm={handleForceAccept}
        loading={actionLoading}
      />
    </PlatformLayout>
  );
}
